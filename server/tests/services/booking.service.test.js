import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/testDb.js";
import { createMockStripe, resetMockStripe } from "../setup/mockStripe.js";

// ── Mock external services BEFORE importing booking.service.js ───────────
// vi.mock calls are hoisted above imports by Vitest, so this is safe even
// though it's written after the import above.

// Created ONCE here, not per-test. booking.service.js caches its Stripe
// client in a module-level singleton on first use — if this object were
// replaced with a new one before every test, the service would keep
// talking to a stale, disconnected mock forever. See resetMockStripe's
// doc comment in mockStripe.js for the full explanation.
const mockStripe = createMockStripe();
vi.mock("stripe", () => {
    return {
        // Must be a regular `function`, NOT an arrow function — booking.service.js
        // calls `new Stripe(...)`, and arrow functions can never be used as
        // constructors in JS (no internal [[Construct]] behavior). A regular
        // function invoked with `new` that explicitly returns an object
        // (mockStripe) overrides the default `this`, giving us our fake client.
        default: vi.fn(function () {
            return mockStripe;
        }),
    };
});

vi.mock("../../services/email.service.js", () => ({
    sendBookingConfirmEmail: vi.fn().mockResolvedValue(undefined),
    sendBookingCancelEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../socket.js", () => ({
    emitBookingConfirmed: vi.fn().mockResolvedValue(undefined),
    emitBookingCancelled: vi.fn(),
}));

// Imported *after* the mocks above so booking.service.js picks up the fakes.
const {
    initiateBookingService,
    confirmBookingService,
    cancelBookingService,
    expireStaleBookingsService,
    getOwnerBookingsService,
} = await import("../../services/booking.service.js");

const Show = (await import("../../models/show.model.js")).default;
const Booking = (await import("../../models/bookings.model.js")).default;

// booking.service.js populates movieId, theatreId, and userId on Show/Booking
// documents. Mongoose only registers a schema once its model file has been
// imported somewhere — these are never used directly in this test file, but
// importing them (for their side effect of calling mongoose.model(...)) is
// required, or populate() throws "Schema hasn't been registered for model X".
await import("../../models/movie.model.js");
const Theatre = (await import("../../models/theatre.model.js")).default;
await import("../../models/user.model.js");

// ── Test setup ─────────────────────────────────────────────────────────

beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_tests";
    await connectTestDb();
});

afterAll(async () => {
    await disconnectTestDb();
});

beforeEach(async () => {
    await clearTestDb();
    resetMockStripe(mockStripe);
});

// Helper: creates a show with 10 seats (A1-A5, B1-B5), price 200
const createTestShow = async (overrides = {}) => {
    return Show.create({
        theatreId: new mongoose.Types.ObjectId(),
        movieId: new mongoose.Types.ObjectId(),
        showTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        noOfSeats: 10,
        price: 200,
        bookedSeats: [],
        ...overrides,
    });
};

const userId = () => new mongoose.Types.ObjectId();

// ── initiateBookingService ────────────────────────────────────────────

describe("initiateBookingService", () => {
    it("locks the requested seats and creates a processing booking", async () => {
        const show = await createTestShow();
        const uid = userId();

        const result = await initiateBookingService({
            showId: show._id,
            seats: ["A1", "A2"],
            userId: uid,
        });

        expect(result.totalAmount).toBe(459); // 2 seats * 200 + ₹50 booking fee + ₹9 GST
        expect(result.bookingId).toBeDefined();

        const updatedShow = await Show.findById(show._id);
        expect(updatedShow.bookedSeats).toEqual(expect.arrayContaining(["A1", "A2"]));

        const booking = await Booking.findById(result.bookingId);
        expect(booking.status).toBe("IN_PROCESS");
        expect(booking.stripePaymentIntentId).toMatch(/^pi_test_/);
    });

    it("applies the Prime Pass discount server-side for members", async () => {
        const show = await createTestShow();
        const uid = userId();

        const result = await initiateBookingService({
            showId: show._id,
            seats: ["A1", "A2"],
            userId: uid,
            isPrime: true,
        });

        // 2 seats * 200 = 400, minus 15% = 340 — and no booking fee for members
        expect(result.subtotal).toBe(400);
        expect(result.bookingFee).toBe(0);
        expect(result.feeWaived).toBe(59);
        expect(result.discount).toBe(60);
        expect(result.totalAmount).toBe(340);
        expect(result.primeApplied).toBe(true);
        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 340 * 100 })
        );

        const booking = await Booking.findById(result.bookingId);
        expect(booking.discount).toBe(60);
        expect(booking.totalAmount).toBe(340);
    });

    it("charges full price for non-members", async () => {
        const show = await createTestShow();

        const result = await initiateBookingService({
            showId: show._id,
            seats: ["A3"],
            userId: userId(),
        });

        expect(result.discount).toBe(0);
        expect(result.bookingFee).toBe(25);
        expect(result.bookingFeeGst).toBe(5);       // 18% of 25, rounded
        expect(result.totalAmount).toBe(230);
        expect(result.primeApplied).toBe(false);
    });

    it("rejects a seat that is already booked", async () => {
        const show = await createTestShow({ bookedSeats: ["A1"] });
        const uid = userId();

        await expect(
            initiateBookingService({ showId: show._id, seats: ["A1", "A2"], userId: uid })
        ).rejects.toMatchObject({ code: 409 });

        // Show state must be untouched — A2 should NOT have been booked either,
        // since the whole request should fail together, not partially.
        const updatedShow = await Show.findById(show._id);
        expect(updatedShow.bookedSeats).toEqual(["A1"]);
    });

    it("rejects booking more seats than are available", async () => {
        const show = await createTestShow({ noOfSeats: 2 });
        const uid = userId();

        await expect(
            initiateBookingService({ showId: show._id, seats: ["A1", "A2", "A3"], userId: uid })
        ).rejects.toMatchObject({ code: 400 });
    });

    // ── The most important test in this file ──────────────────────────
    // This directly proves the atomic-locking mechanism that was called out
    // as a strength of the codebase actually holds up under real concurrency,
    // not just when requests happen to arrive one at a time.
    it("never double-books a seat when two users race for it simultaneously", async () => {
        const show = await createTestShow();
        const userA = userId();
        const userB = userId();

        const results = await Promise.allSettled([
            initiateBookingService({ showId: show._id, seats: ["A1"], userId: userA }),
            initiateBookingService({ showId: show._id, seats: ["A1"], userId: userB }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        // Exactly one of the two concurrent requests should win.
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason).toMatchObject({ code: 409 });

        // And the seat should appear exactly once in bookedSeats — not zero,
        // not two — proving there's no duplicate push and no lost update.
        const updatedShow = await Show.findById(show._id);
        const occurrences = updatedShow.bookedSeats.filter((s) => s === "A1").length;
        expect(occurrences).toBe(1);

        // Only one Booking document should exist for this seat.
        const bookings = await Booking.find({ showId: show._id });
        expect(bookings).toHaveLength(1);
    });
});

// ── confirmBookingService ─────────────────────────────────────────────

describe("confirmBookingService", () => {
    it("confirms a booking when Stripe reports the payment as succeeded", async () => {
        const show = await createTestShow();
        const uid = userId();

        const initiated = await initiateBookingService({
            showId: show._id,
            seats: ["B1"],
            userId: uid,
        });

        const booking = await Booking.findById(initiated.bookingId);
        // mockStripe.paymentIntents.retrieve defaults to "succeeded" (see mockStripe.js)

        const confirmed = await confirmBookingService({
            bookingId: initiated.bookingId,
            stripePaymentIntentId: booking.stripePaymentIntentId,
            userId: uid,
        });

        expect(confirmed.status).toBe("SUCCESSFUL");
        expect(confirmed.ticketCode).toMatch(/^CV-/);
    });

    it("refuses to confirm when Stripe reports the payment did NOT succeed", async () => {
        const show = await createTestShow();
        const uid = userId();

        const initiated = await initiateBookingService({
            showId: show._id,
            seats: ["B2"],
            userId: uid,
        });
        const booking = await Booking.findById(initiated.bookingId);

        // Override this specific call to simulate a failed/incomplete payment —
        // this is exactly the kind of scenario a client could otherwise lie about.
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
            id: booking.stripePaymentIntentId,
            status: "requires_payment_method",
        });

        await expect(
            confirmBookingService({
                bookingId: initiated.bookingId,
                stripePaymentIntentId: booking.stripePaymentIntentId,
                userId: uid,
            })
        ).rejects.toMatchObject({ code: 400 });

        const unchanged = await Booking.findById(initiated.bookingId);
        expect(unchanged.status).toBe("IN_PROCESS");
    });
});

// ── cancelBookingService ───────────────────────────────────────────────

describe("cancelBookingService", () => {
    it("releases the seats back to the show on cancellation", async () => {
        const show = await createTestShow();
        const uid = userId();

        const initiated = await initiateBookingService({
            showId: show._id,
            seats: ["C1", "C2"],
            userId: uid,
        });

        await cancelBookingService({ bookingId: initiated.bookingId, userId: uid });

        const updatedShow = await Show.findById(show._id);
        expect(updatedShow.bookedSeats).not.toContain("C1");
        expect(updatedShow.bookedSeats).not.toContain("C2");

        const booking = await Booking.findById(initiated.bookingId);
        expect(booking.status).toBe("CANCELLED");
    });
});

// ── expireStaleBookingsService ─────────────────────────────────────────

describe("expireStaleBookingsService", () => {
    it("expires bookings stuck in IN_PROCESS past the timeout and frees their seats", async () => {
        const show = await createTestShow();
        const uid = userId();

        const initiated = await initiateBookingService({
            showId: show._id,
            seats: ["D1"],
            userId: uid,
        });

        // Simulate the booking being 11 minutes old (cutoff is 10 minutes)
        // overwriteImmutable is required here — by default Mongoose's
        // {timestamps:true} plugin SILENTLY DELETES any createdAt value
        // passed to findByIdAndUpdate (confirmed by reading
        // node_modules/mongoose/lib/helpers/update/applyTimestampsToUpdate.js).
        // Without this option, this backdate would be a silent no-op.
        await Booking.findByIdAndUpdate(
            initiated.bookingId,
            { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
            { overwriteImmutable: true }
        );

        const expiredCount = await expireStaleBookingsService();
        expect(expiredCount).toBe(1);

        const booking = await Booking.findById(initiated.bookingId);
        expect(booking.status).toBe("CANCELLED");

        const updatedShow = await Show.findById(show._id);
        expect(updatedShow.bookedSeats).not.toContain("D1");
    });

    it("leaves recent processing bookings untouched", async () => {
        const show = await createTestShow();
        const uid = userId();

        await initiateBookingService({ showId: show._id, seats: ["D2"], userId: uid });

        const expiredCount = await expireStaleBookingsService();
        expect(expiredCount).toBe(0);
    });
});

// ── getOwnerBookingsService ────────────────────────────────────────────

describe("getOwnerBookingsService", () => {
    it("scopes a theatre owner to bookings in their own theatres; admins see all", async () => {
        const ownerA = new mongoose.Types.ObjectId();
        const ownerB = new mongoose.Types.ObjectId();
        const base = { city: "Pune", state: "MH", pincode: 411001, address: "FC Road" };
        const [theatreA, theatreB] = await Theatre.create([
            { ...base, name: "Theatre Alpha", owner: ownerA },
            { ...base, name: "Theatre Bravo", owner: ownerB },
        ]);
        const showA = await createTestShow({ theatreId: theatreA._id });
        const showB = await createTestShow({ theatreId: theatreB._id });

        await initiateBookingService({ showId: showA._id, seats: ["A1"], userId: userId() });
        await initiateBookingService({ showId: showB._id, seats: ["B1"], userId: userId() });

        const mine = await getOwnerBookingsService({ _id: ownerA, userRole: "CLIENT" });
        expect(mine).toHaveLength(1);
        expect(mine[0].showId._id.toString()).toBe(showA._id.toString());

        const all = await getOwnerBookingsService({ _id: ownerA, userRole: "ADMIN" });
        expect(all).toHaveLength(2);
    });
});
