import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/testDb.js";
import { createMockStripe, resetMockStripe } from "../setup/mockStripe.js";

const mockStripe = createMockStripe();
vi.mock("stripe", () => ({ default: vi.fn(function () { return mockStripe; }) }));
vi.mock("../../services/email.service.js", () => ({
    sendBookingConfirmEmail: vi.fn().mockResolvedValue(undefined),
    sendBookingCancelEmail:  vi.fn().mockResolvedValue(undefined),
    sendShowReminderEmail:   vi.fn().mockResolvedValue(undefined),
    sendGiftCardEmail:       vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../socket.js", () => ({
    emitBookingConfirmed: vi.fn().mockResolvedValue(undefined),
    emitBookingCancelled: vi.fn(),
}));

const { initiateBookingService, confirmBookingService, cancelBookingService } = await import("../../services/booking.service.js");
const { creditWallet, getWalletService, purchaseGiftCardService, confirmGiftCardService, redeemGiftCardService } = await import("../../services/wallet.service.js");
const { bookingEarnings, getPayoutsService } = await import("../../services/payout.service.js");
const Show    = (await import("../../models/show.model.js")).default;
const User    = (await import("../../models/user.model.js")).default;
const Booking = (await import("../../models/bookings.model.js")).default;
const Theatre = (await import("../../models/theatre.model.js")).default;
await import("../../models/movie.model.js");

const HOUR = 3_600_000;
let n = 0;
const mkUser = (walletBalance = 0) => User.create({ name: `w${++n}`, email: `w${n}@test.com`, password: "secret123", walletBalance });
const mkShow = (extra = {}) => Show.create({ theatreId: new mongoose.Types.ObjectId(), movieId: new mongoose.Types.ObjectId(),
    showTime: new Date(Date.now() + 48 * HOUR), noOfSeats: 100, price: 200, bookedSeats: [], ...extra });
const balance = async (id) => (await User.findById(id)).walletBalance;

beforeAll(async () => { process.env.STRIPE_SECRET_KEY = "sk_test_fake"; await connectTestDb(); });
afterAll(disconnectTestDb);
beforeEach(async () => { await clearTestDb(); resetMockStripe(mockStripe); });

describe("paying with the wallet", () => {
    it("confirms a fully wallet-paid booking instantly, without Stripe", async () => {
        const [u, show] = [await mkUser(500), await mkShow()];
        const r = await initiateBookingService({ showId: show._id, seats: ["A1"], userId: u._id, useWallet: true });   // ₹230
        expect(r).toMatchObject({ paidWithWallet: true, walletApplied: 230, cardAmount: 0, clientSecret: null });
        expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
        const b = await Booking.findById(r.bookingId);
        expect(b).toMatchObject({ status: "SUCCESSFUL", paidWith: "WALLET" });
        expect(b.ticketCode).toMatch(/^CV-/);
        expect(await balance(u._id)).toBe(270);
    });

    it("splits wallet + card, and gives the wallet part back if payment is abandoned", async () => {
        const [u, show] = [await mkUser(100), await mkShow()];
        const r = await initiateBookingService({ showId: show._id, seats: ["A1", "A2"], userId: u._id, useWallet: true });   // ₹459
        expect(r).toMatchObject({ walletApplied: 100, cardAmount: 359 });
        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 359 * 100 }));
        expect(await balance(u._id)).toBe(0);

        await cancelBookingService({ bookingId: r.bookingId, userId: u._id, cancellationReason: "Payment timeout" });
        expect(await balance(u._id)).toBe(100);
        expect(mockStripe.refunds.create).not.toHaveBeenCalled();
    });

    it("refunds a mixed booking: wallet part to the wallet, card part through Stripe", async () => {
        const [u, show] = [await mkUser(100), await mkShow()];
        const r = await initiateBookingService({ showId: show._id, seats: ["A1", "A2"], userId: u._id, useWallet: true });
        const b = await Booking.findById(r.bookingId);
        await confirmBookingService({ bookingId: b._id, stripePaymentIntentId: b.stripePaymentIntentId, userId: u._id });

        const c = await cancelBookingService({ bookingId: b._id, userId: u._id });   // 48h out → 100% of ₹400 (fee kept)
        expect(c).toMatchObject({ refundAmount: 400, refundMethod: "SOURCE", refundStatus: "REFUNDED" });
        expect(await balance(u._id)).toBe(100);
        expect(mockStripe.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 300 * 100 }), expect.anything());
    });

    it("can send the whole refund to the wallet instantly", async () => {
        const [u, show] = [await mkUser(0), await mkShow()];
        const r = await initiateBookingService({ showId: show._id, seats: ["A1"], userId: u._id });
        const b = await Booking.findById(r.bookingId);
        await confirmBookingService({ bookingId: b._id, stripePaymentIntentId: b.stripePaymentIntentId, userId: u._id });
        const c = await cancelBookingService({ bookingId: b._id, userId: u._id, refundTo: "WALLET" });
        expect(c).toMatchObject({ refundAmount: 200, refundMethod: "WALLET", refundStatus: "REFUNDED" });
        expect(await balance(u._id)).toBe(200);
        expect(mockStripe.refunds.create).not.toHaveBeenCalled();
        const w = await getWalletService(u._id);
        expect(w.transactions[0]).toMatchObject({ type: "CREDIT", reason: "REFUND", amount: 200, balanceAfter: 200 });
    });
});

describe("gift cards", () => {
    it("are bought through Stripe, activated once, and redeemed once", async () => {
        const [buyer, friend] = [await mkUser(), await mkUser()];
        const p = await purchaseGiftCardService(buyer._id, { amount: 1000, recipientEmail: "friend@test.com" });
        const pi = mockStripe.paymentIntents.create.mock.results[0].value;
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({ id: (await pi).id, status: "succeeded", metadata: { type: "gift_card", userId: buyer._id.toString() } });
        const card = await confirmGiftCardService(buyer._id, { giftCardId: p.giftCardId, paymentIntentId: (await pi).id });
        expect(card.code).toMatch(/^CVGC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

        expect(await redeemGiftCardService(friend._id, card.code.toLowerCase())).toMatchObject({ amount: 1000, balance: 1000 });
        await expect(redeemGiftCardService(buyer._id, card.code)).rejects.toMatchObject({ err: expect.stringContaining("already been redeemed") });
    });
});

describe("owner payouts", () => {
    it("pays owners list price + food, minus refunds and commission; promos and fees stay with the platform", () => {
        const paid = { status: "SUCCESSFUL", subtotal: 400, discount: 60, addOnsTotal: 300, couponDiscount: 50, bookingFee: 50, bookingFeeGst: 9, totalAmount: 649 };
        expect(bookingEarnings(paid, 10)).toMatchObject({ sales: 700, kept: 700, commission: 70, payout: 630, promos: 110, bookingFees: 59 });
        const halfRefund = { status: "CANCELLED", subtotal: 400, totalAmount: 459, bookingFee: 50, bookingFeeGst: 9, refundAmount: 200 };
        expect(bookingEarnings(halfRefund, 10)).toMatchObject({ sales: 400, kept: 200, refunded: 200, payout: 180 });
    });

    it("only shows an owner their own cinemas", async () => {
        const [owner, other] = [await mkUser(), await mkUser()];
        owner.userRole = "CLIENT"; other.userRole = "CLIENT";
        const mine  = await Theatre.create({ name: "Mine Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road", owner: owner._id });
        const yours = await Theatre.create({ name: "Your Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road", owner: other._id });
        const [s1, s2] = [await mkShow({ theatreId: mine._id }), await mkShow({ theatreId: yours._id })];
        await Booking.create([
            { showId: s1._id, userId: owner._id, seats: ["A1"], subtotal: 200, totalAmount: 230, bookingFee: 25, bookingFeeGst: 5, status: "SUCCESSFUL" },
            { showId: s2._id, userId: owner._id, seats: ["A1"], subtotal: 900, totalAmount: 930, status: "SUCCESSFUL" },
        ]);
        const r = await getPayoutsService({ user: owner, months: 3 });
        expect(r.totals).toMatchObject({ bookings: 1, sales: 200, payout: 180 });
        expect(r.months).toHaveLength(3);
        expect(r.rows[0].theatre).toContain("Mine Cinema");
    });
});
