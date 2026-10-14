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

const { initiateBookingService, confirmBookingService, cancelBookingService, getRefundQuoteService } =
    await import("../../services/booking.service.js");
const { createShowService, updateShowService } = await import("../../services/show.service.js");
const { addTheatreService } = await import("../../services/theatre.service.js");
const Show    = (await import("../../models/show.model.js")).default;
const Booking = (await import("../../models/bookings.model.js")).default;
const Movie   = (await import("../../models/movie.model.js")).default;
await import("../../models/user.model.js");

const HOUR = 60 * 60 * 1000;

beforeAll(async () => { process.env.STRIPE_SECRET_KEY = "sk_test_fake"; await connectTestDb(); });
afterAll(disconnectTestDb);
beforeEach(async () => { await clearTestDb(); resetMockStripe(mockStripe); });

const LAYOUT = {
    rows: ["A", "B", "C", "D"], cols: 6, aisles: [3],
    categories: [
        { key: "REGULAR",  label: "Regular",  price: 200, rows: ["A", "B"] },
        { key: "PREMIUM",  label: "Premium",  price: 300, rows: ["C"] },
        { key: "RECLINER", label: "Recliner", price: 500, rows: ["D"] },
    ],
};

const userId = () => new mongoose.Types.ObjectId();

const showIn = (hours, extra = {}) => Show.create({
    theatreId: new mongoose.Types.ObjectId(), movieId: new mongoose.Types.ObjectId(),
    showTime: new Date(Date.now() + hours * HOUR), noOfSeats: 100, price: 200, bookedSeats: [], ...extra,
});

// A confirmed (paid) booking for `seats` on a show `hours` from now
const paidBooking = async (hours, seats = ["A1", "A2"], extra = {}) => {
    const show = await showIn(hours, extra);
    const uid = userId();
    const res = await initiateBookingService({ showId: show._id, seats, userId: uid });
    const b = await Booking.findById(res.bookingId);
    await confirmBookingService({ bookingId: res.bookingId, stripePaymentIntentId: b.stripePaymentIntentId, userId: uid });
    // `total` = what a cancellation can refund: the booking fee + GST is kept
    return { show, uid, bookingId: res.bookingId, total: res.totalAmount - res.bookingFee - res.bookingFeeGst, fee: res.bookingFee + res.bookingFeeGst };
};

describe("refund policy on cancellation", () => {
    it("refunds 100% more than 24 hours before the show", async () => {
        const { uid, bookingId, total } = await paidBooking(48);
        const cancelled = await cancelBookingService({ bookingId, userId: uid });

        expect(cancelled.status).toBe("CANCELLED");
        expect(cancelled.refundAmount).toBe(total);
        expect(total).toBe(400);                    // ₹459 paid, ₹59 fee retained
        expect(cancelled.refundStatus).toBe("REFUNDED");
        expect(mockStripe.refunds.create).toHaveBeenCalledWith(
            expect.objectContaining({ amount: total * 100 }),
            { idempotencyKey: `refund-${bookingId}` },
        );
    });

    it("refunds 50% between 2 and 24 hours before the show", async () => {
        const { uid, bookingId, total } = await paidBooking(10);
        const quote = await getRefundQuoteService({ bookingId, userId: uid });
        expect(quote).toMatchObject({ cancellable: true, refundPct: 50, refundAmount: total / 2 });

        const cancelled = await cancelBookingService({ bookingId, userId: uid });
        expect(cancelled.refundAmount).toBe(total / 2);
    });

    it("gives Prime members a full refund inside the 24-hour window", async () => {
        const { uid, bookingId, total } = await paidBooking(10);
        const cancelled = await cancelBookingService({ bookingId, userId: uid, isPrime: true });
        expect(cancelled.refundAmount).toBe(total);
    });

    it("blocks cancellation within 2 hours of the show and keeps the seats booked", async () => {
        const { show, uid, bookingId } = await paidBooking(1);

        await expect(cancelBookingService({ bookingId, userId: uid })).rejects.toMatchObject({ code: 400 });

        expect((await Booking.findById(bookingId)).status).toBe("SUCCESSFUL");
        expect((await Show.findById(show._id)).bookedSeats).toEqual(expect.arrayContaining(["A1", "A2"]));
        expect(mockStripe.refunds.create).not.toHaveBeenCalled();
    });

    it("still cancels and flags FAILED when Stripe rejects the refund", async () => {
        const { uid, bookingId } = await paidBooking(48);
        mockStripe.refunds.create.mockRejectedValueOnce(new Error("card_declined"));

        const cancelled = await cancelBookingService({ bookingId, userId: uid });
        expect(cancelled.status).toBe("CANCELLED");
        expect(cancelled.refundStatus).toBe("FAILED");
    });

    it("cancels the pending Stripe payment for unpaid bookings without refunding", async () => {
        const show = await showIn(48);
        const uid = userId();
        const res = await initiateBookingService({ showId: show._id, seats: ["B1"], userId: uid });

        const cancelled = await cancelBookingService({ bookingId: res.bookingId, userId: uid });
        expect(cancelled.refundStatus).toBe("NONE");
        expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
        expect(mockStripe.refunds.create).not.toHaveBeenCalled();
    });
});

describe("seat categories", () => {
    it("prices each seat by its category and records line items", async () => {
        const show = await showIn(48, { seatLayout: LAYOUT, noOfSeats: 24 });
        const res = await initiateBookingService({ showId: show._id, seats: ["A1", "C2", "D5", "D6"], userId: userId() });

        expect(res.subtotal).toBe(200 + 300 + 500 + 500);
        expect(res.lineItems).toEqual(expect.arrayContaining([
            expect.objectContaining({ category: "RECLINER", price: 500, seats: ["D5", "D6"] }),
            expect.objectContaining({ category: "PREMIUM",  price: 300, seats: ["C2"] }),
        ]));
    });

    it("rejects seats that don't exist in the screen", async () => {
        const show = await showIn(48, { seatLayout: LAYOUT, noOfSeats: 24 });
        await expect(
            initiateBookingService({ showId: show._id, seats: ["Z9"], userId: userId() })
        ).rejects.toMatchObject({ code: 400 });
        expect((await Show.findById(show._id)).bookedSeats).toEqual([]);
    });
});

describe("screens on shows", () => {
    const setup = async () => {
        const movie = await Movie.create({
            name: "Test Film", description: "A film", casts: ["A"], trailerUrl: "https://x.y/z",
            releaseDate: new Date(), duration: 120, posterUrl: "https://x.y/p.jpg", genre: ["Drama"], director: "D",
        });
        const theatre = await addTheatreService({
            name: "Grand Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road",
            owner: new mongoose.Types.ObjectId(), movies: [movie._id], totalScreens: 1,
            screens: [{ name: "Audi 1", sound: "Dolby Atmos", projection: "4K Laser", layout: LAYOUT }],
        });
        return { movie, theatre };
    };

    it("snapshots the screen layout, capacity and lowest price onto new shows", async () => {
        const { movie, theatre } = await setup();
        expect(theatre.totalScreens).toBe(1);

        const show = await createShowService({
            theatreId: theatre._id, movieId: movie._id, screen: "audi 1", showTime: new Date(Date.now() + 48 * HOUR),
            noOfSeats: 999, price: 1, format: "2D", language: "Hindi", categoryPrices: { RECLINER: 650 },
        });
        expect(show.noOfSeats).toBe(24);
        expect(show.price).toBe(200);
        expect(show.seatLayout.categories.find(c => c.key === "RECLINER").price).toBe(650);
    });

    it("refuses to move a show with sold seats to another screen", async () => {
        const { movie, theatre } = await setup();
        const show = await createShowService({
            theatreId: theatre._id, movieId: movie._id, screen: "Audi 1", showTime: new Date(Date.now() + 48 * HOUR),
            noOfSeats: 1, price: 1, format: "2D", language: "Hindi",
        });
        await Show.findByIdAndUpdate(show._id, { bookedSeats: ["A1"] });

        await expect(updateShowService(show._id, { screen: "Audi 2" })).rejects.toMatchObject({ code: 409 });
    });

    it("rejects a layout where a row has no category", async () => {
        await expect(addTheatreService({
            name: "Broken Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road",
            owner: new mongoose.Types.ObjectId(),
            screens: [{ name: "Audi 1", layout: { ...LAYOUT, categories: LAYOUT.categories.slice(0, 2) } }],
        })).rejects.toMatchObject({ code: 400 });
    });
});

describe("theatre photos", () => {
    it("stores per-amenity and per-screen photos, dropping photos for unlisted amenities", async () => {
        const { updateTheatreService, getTheatreService } = await import("../../services/theatre.service.js");
        const theatre = await addTheatreService({
            name: "Photo Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road",
            owner: new mongoose.Types.ObjectId(),
            amenities: ["Food Court", "Parking"],
            amenityPhotos: { "Food Court": "https://img.example.com/food.jpg", "Lounge": "https://img.example.com/lounge.jpg" },
            screens: [{ name: "Audi 1", photo: "https://img.example.com/audi1.jpg", layout: LAYOUT }],
        });
        expect(theatre.amenityPhotos).toEqual({ "Food Court": "https://img.example.com/food.jpg" });
        expect(theatre.screens[0].photo).toBe("https://img.example.com/audi1.jpg");

        // Removing an amenity on edit also removes its photo
        await updateTheatreService(theatre._id, {
            amenities: ["Parking"],
            amenityPhotos: { "Food Court": "https://img.example.com/food.jpg", "Parking": "https://img.example.com/park.jpg" },
        });
        const fresh = await getTheatreService(theatre._id);
        expect(fresh.toJSON().amenityPhotos).toEqual({ "Parking": "https://img.example.com/park.jpg" });
    });
});
