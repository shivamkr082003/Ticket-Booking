import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/testDb.js";
import { createMockStripe, resetMockStripe } from "../setup/mockStripe.js";

const mockStripe = createMockStripe();
vi.mock("stripe", () => ({ default: vi.fn(function () { return mockStripe; }) }));
vi.mock("../../services/email.service.js", () => ({
    sendBookingConfirmEmail: vi.fn().mockResolvedValue(undefined),
    sendBookingCancelEmail:  vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../socket.js", () => ({
    emitBookingConfirmed: vi.fn().mockResolvedValue(undefined),
    emitBookingCancelled: vi.fn(),
}));

const { initiateBookingService, confirmBookingService, getOrderQuoteService, checkInBookingService, getRefundQuoteService, cancelBookingService } =
    await import("../../services/booking.service.js");
const { canManageTheatreId } = await import("../../middlewares/ownership.middleware.js");
const { getTheatreCitiesService } = await import("../../services/theatre.service.js");
const Theatre = (await import("../../models/theatre.model.js")).default;
const Show    = (await import("../../models/show.model.js")).default;
const Coupon  = (await import("../../models/coupon.model.js")).default;
const Booking = (await import("../../models/bookings.model.js")).default;
await import("../../models/movie.model.js");
await import("../../models/user.model.js");

const HOUR = 3_600_000;
const oid = () => new mongoose.Types.ObjectId();

beforeAll(async () => { process.env.STRIPE_SECRET_KEY = "sk_test_fake"; await connectTestDb(); });
afterAll(disconnectTestDb);
beforeEach(async () => { await clearTestDb(); resetMockStripe(mockStripe); });

const setup = async ({ hours = 48, owner = oid() } = {}) => {
    const theatre = await Theatre.create({
        name: "Snack Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road", owner,
        menu: [
            { name: "Salted Popcorn", category: "Popcorn", price: 300 },
            { name: "Cola",           category: "Beverages", price: 150 },
            { name: "Nachos",         category: "Snacks", price: 250, available: false },
        ],
    });
    const show = await Show.create({
        theatreId: theatre._id, movieId: oid(), showTime: new Date(Date.now() + hours * HOUR),
        noOfSeats: 50, price: 200, bookedSeats: [],
    });
    const [popcorn, cola, nachos] = theatre.menu;
    return { theatre, show, popcorn, cola, nachos, owner };
};

const paid = async (showId, seats, extra = {}) => {
    const uid = extra.userId ?? oid();
    const res = await initiateBookingService({ showId, seats, userId: uid, ...extra });
    const b = await Booking.findById(res.bookingId);
    await confirmBookingService({ bookingId: res.bookingId, stripePaymentIntentId: b.stripePaymentIntentId, userId: uid });
    return { uid, res, booking: await Booking.findById(res.bookingId) };
};

describe("order pricing", () => {
    it("adds food to the ticket total and applies Prime to tickets only", async () => {
        const { show, popcorn, cola } = await setup();
        const q = await getOrderQuoteService({
            showId: show._id, seats: ["A1", "A2"], userId: oid(), isPrime: true,
            addOns: [{ itemId: popcorn._id.toString(), qty: 1 }, { itemId: cola._id.toString(), qty: 2 }, { itemId: popcorn._id.toString(), qty: 1 }],
        });
        expect(q.subtotal).toBe(400);
        expect(q.discount).toBe(60);                 // 15% of tickets
        expect(q.addOnsTotal).toBe(300 * 2 + 150 * 2);
        expect(q.addOns.find(a => a.name === "Salted Popcorn").qty).toBe(2);   // duplicates merged
        expect(q.totalAmount).toBe(400 - 60 + 900);
    });

    it("rejects sold-out items", async () => {
        const { show, nachos } = await setup();
        await expect(getOrderQuoteService({ showId: show._id, seats: ["A1"], userId: oid(), addOns: [{ itemId: nachos._id.toString(), qty: 1 }] }))
            .rejects.toMatchObject({ code: 400 });
    });

    it("applies a percentage coupon with its cap, and a flat coupon", async () => {
        const { show } = await setup();
        await Coupon.create([
            { code: "MOVIE20", type: "PERCENT", value: 20, maxDiscount: 50 },
            { code: "FLAT100", type: "FLAT", value: 100, minAmount: 300 },
        ]);
        const pct = await getOrderQuoteService({ showId: show._id, seats: ["A1", "A2"], userId: oid(), couponCode: "movie20" });
        expect(pct.couponDiscount).toBe(50);         // 20% of 400 = 80, capped at 50
        expect(pct.totalAmount).toBe(350 + 59);         // coupon never touches the ₹59 fee

        const flat = await getOrderQuoteService({ showId: show._id, seats: ["A1", "A2"], userId: oid(), couponCode: "FLAT100" });
        expect(flat.totalAmount).toBe(300 + 59);
    });

    it("enforces minimum order, expiry and per-user limits", async () => {
        const { show } = await setup();
        await Coupon.create([
            { code: "BIGSPEND", type: "FLAT", value: 100, minAmount: 1000 },
            { code: "OLDDEAL", type: "FLAT", value: 50, validUntil: new Date(Date.now() - HOUR) },
            { code: "ONCE", type: "FLAT", value: 50, perUserLimit: 1 },
        ]);
        const q = (code, userId = oid()) => getOrderQuoteService({ showId: show._id, seats: ["A1"], userId, couponCode: code });

        await expect(q("BIGSPEND")).rejects.toMatchObject({ err: expect.stringContaining("Add ₹800 more") });
        await expect(q("OLDDEAL")).rejects.toMatchObject({ err: expect.stringContaining("expired") });
        await expect(q("NOPE")).rejects.toMatchObject({ code: 400 });

        const { uid } = await paid(show._id, ["B1"], { couponCode: "ONCE" });
        await expect(q("ONCE", uid)).rejects.toMatchObject({ err: expect.stringContaining("already used") });
        expect((await Coupon.findOne({ code: "ONCE" })).usedCount).toBe(1);
    });

    it("charges Stripe the full order and stores the breakdown on the booking", async () => {
        const { show, popcorn } = await setup();
        await Coupon.create({ code: "SNACK50", type: "FLAT", value: 50 });
        const { booking } = await paid(show._id, ["C1"], { addOns: [{ itemId: popcorn._id.toString(), qty: 1 }], couponCode: "SNACK50" });

        expect(booking.totalAmount).toBe(200 + 300 - 50 + 30);
        expect(booking.addOns[0]).toMatchObject({ name: "Salted Popcorn", qty: 1, price: 300 });
        expect(booking.couponCode).toBe("SNACK50");
        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 480 * 100 }));
    });
});

describe("ticket check-in", () => {
    it("admits a ticket once, for the theatre's own staff, and blocks cancelling it afterwards", async () => {
        const owner = oid();
        const { show } = await setup({ hours: 1, owner });
        const { booking, uid } = await paid(show._id, ["D1"]);
        const staff = { _id: owner, userRole: "CLIENT" };

        await expect(checkInBookingService({ ticketCode: booking.ticketCode, user: { _id: oid(), userRole: "CLIENT" } }))
            .rejects.toMatchObject({ code: 403 });

        const checked = await checkInBookingService({ ticketCode: booking.ticketCode.toLowerCase(), user: staff });
        expect(checked.checkedInAt).toBeInstanceOf(Date);

        await expect(checkInBookingService({ ticketCode: booking.ticketCode, user: staff })).rejects.toMatchObject({ code: 409 });

        const quote = await getRefundQuoteService({ bookingId: booking._id, userId: uid });
        expect(quote.cancellable).toBe(false);
    });

    it("refuses tickets too early or cancelled", async () => {
        const owner = oid();
        const { show } = await setup({ hours: 48, owner });
        const staff = { _id: owner, userRole: "CLIENT" };
        const { booking, uid } = await paid(show._id, ["E1"]);

        await expect(checkInBookingService({ ticketCode: booking.ticketCode, user: staff }))
            .rejects.toMatchObject({ err: expect.stringContaining("opens 3 hours") });

        await cancelBookingService({ bookingId: booking._id, userId: uid });
        await expect(checkInBookingService({ ticketCode: booking.ticketCode, user: staff }))
            .rejects.toMatchObject({ err: expect.stringContaining("cancelled") });
    });
});

describe("ownership & cities", () => {
    it("lets owners manage only their theatres; admins manage all", async () => {
        const owner = oid();
        const { theatre } = await setup({ owner });
        expect((await canManageTheatreId({ _id: owner, userRole: "CLIENT" }, theatre._id)).ok).toBe(true);
        expect(await canManageTheatreId({ _id: oid(), userRole: "CLIENT" }, theatre._id)).toMatchObject({ ok: false, code: 403 });
        expect((await canManageTheatreId({ _id: oid(), userRole: "ADMIN" }, theatre._id)).ok).toBe(true);
    });

    it("groups active theatres by city, case-insensitively", async () => {
        const base = { state: "MH", pincode: 411001, address: "FC Road", owner: oid() };
        await Theatre.create([
            { ...base, name: "Alpha Cinema", city: "Pune" },
            { ...base, name: "Bravo Cinema", city: "pune " },
            { ...base, name: "Delta Cinema", city: "Mumbai" },
            { ...base, name: "Gamma Cinema", city: "Nagpur", isActive: false },
        ]);
        const cities = await getTheatreCitiesService();
        expect(cities).toEqual([
            expect.objectContaining({ theatres: 2 }),
            expect.objectContaining({ city: "Mumbai", theatres: 1 }),
        ]);
        expect(cities[0].city.toLowerCase()).toBe("pune");
    });
});
