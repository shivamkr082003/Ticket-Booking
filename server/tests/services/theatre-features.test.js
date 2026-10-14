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
}));
vi.mock("../../socket.js", () => ({
    emitBookingConfirmed: vi.fn().mockResolvedValue(undefined),
    emitBookingCancelled: vi.fn(),
}));

const { createShowService } = await import("../../services/show.service.js");
const { priceAdjustmentsFor } = await import("../../utils/dynamicPricing.js");
const { refundQuote } = await import("../../utils/refundPolicy.js");
const { assertValidLayout } = await import("../../utils/seatLayout.js");
const { upsertTheatreReviewService, myTheatreReviewService, listTheatreReviewsService } = await import("../../services/theatreReview.service.js");
const Theatre = (await import("../../models/theatre.model.js")).default;
const Show    = (await import("../../models/show.model.js")).default;
const Movie   = (await import("../../models/movie.model.js")).default;
const Booking = (await import("../../models/bookings.model.js")).default;
await import("../../models/user.model.js");

const HOUR = 3_600_000;
const oid = () => new mongoose.Types.ObjectId();

beforeAll(async () => { process.env.STRIPE_SECRET_KEY = "sk_test_fake"; await connectTestDb(); });
afterAll(disconnectTestDb);
beforeEach(async () => { await clearTestDb(); resetMockStripe(mockStripe); });

// 2026-10-17 is a Saturday; times below are IST (+05:30)
const ist = (s) => new Date(`${s}+05:30`);

describe("dynamic pricing rules", () => {
    const rules = { weekendPct: 10, morningPct: -20, primeTimePct: 15, openingDayPct: 25 };

    it("picks the rules that apply in India time", () => {
        expect(priceAdjustmentsFor(ist("2026-10-17T10:00:00"), rules)).toEqual([{ label: "Weekend", pct: 10 }, { label: "Morning show", pct: -20 }]);
        expect(priceAdjustmentsFor(ist("2026-10-14T19:30:00"), rules)).toEqual([{ label: "Prime time", pct: 15 }]);
        expect(priceAdjustmentsFor(ist("2026-10-14T15:00:00"), rules, ist("2026-10-14T00:00:00"))).toEqual([{ label: "Opening day", pct: 25 }]);
        expect(priceAdjustmentsFor(ist("2026-10-14T15:00:00"), null)).toEqual([]);
    });

    it("reprices tier seats when a show is scheduled, unless the owner opts out", async () => {
        const movie = await Movie.create({ name: "Rules Movie", description: "A film long enough to pass validation rules.", director: "D", casts: ["A"],
            genre: ["Drama"], languages: ["Hindi"], duration: 120, releaseDate: new Date("2026-01-01"), posterUrl: "https://x.test/p.jpg", trailerUrl: "https://youtu.be/x" });
        const theatre = await Theatre.create({ name: "Rules Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road", owner: oid(),
            movies: [movie._id], pricingRules: { weekendPct: 20 },
            screens: [{ name: "Audi 1", layout: { rows: ["A", "B"], cols: 4, categories: [{ key: "REGULAR", label: "Regular", price: 200, rows: ["A"] }, { key: "RECLINER", label: "Recliner", price: 500, rows: ["B"] }] } }] });
        const base = { theatreId: theatre._id, movieId: movie._id, screen: "Audi 1", noOfSeats: 8, price: 200, format: "2D", language: "Hindi", tags: ["Subtitled"] };

        const sat = await createShowService({ ...base, showTime: ist("2027-10-16T15:00:00").toISOString() });   // a Saturday
        expect(sat.seatLayout.categories.map((c) => c.price)).toEqual([240, 600]);
        expect(sat.price).toBe(240);
        expect(sat.priceAdjustments).toEqual([expect.objectContaining({ label: "Weekend", pct: 20 })]);
        expect(sat.tags).toEqual(["Subtitled"]);

        const flat = await createShowService({ ...base, showTime: ist("2027-10-16T21:00:00").toISOString(), ignorePricingRules: true });
        expect(flat.seatLayout.categories.map((c) => c.price)).toEqual([200, 500]);
    });
});

describe("per-theatre cancellation policy", () => {
    it("overrides the platform windows only where the theatre set them", () => {
        const booking = { status: "SUCCESSFUL", totalAmount: 400 };
        const showTime = new Date(Date.now() + 10 * HOUR);
        expect(refundQuote({ booking, showTime }).refundPct).toBe(50);                                     // platform: 50% inside 24h
        const strict = refundQuote({ booking, showTime, policy: { fullRefundHours: 6, partialRefundPct: 0 } });
        expect(strict).toMatchObject({ cancellable: true, refundPct: 100, policy: { fullRefundHours: 6, cancelCutoffHours: 2, partialRefundPct: 0 } });
        expect(refundQuote({ booking, showTime, policy: { cancelCutoffHours: 12 } }).cancellable).toBe(false);
    });
});

describe("wheelchair spaces", () => {
    it("must be real seats in the layout", () => {
        const layout = { rows: ["A"], cols: 4, categories: [{ key: "R", label: "R", price: 100, rows: ["A"] }] };
        expect(() => assertValidLayout({ ...layout, accessible: ["A1", "A4"] })).not.toThrow();
        expect(() => assertValidLayout({ ...layout, accessible: ["B1"] })).toThrow();
    });
});

describe("theatre reviews", () => {
    it("only lets verified visitors review, and keeps the cached rating current", async () => {
        const theatre = await Theatre.create({ name: "Review Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road", owner: oid() });
        const past = await Show.create({ theatreId: theatre._id, movieId: oid(), showTime: new Date(Date.now() - 5 * HOUR), noOfSeats: 10, price: 100 });
        const future = await Show.create({ theatreId: theatre._id, movieId: oid(), showTime: new Date(Date.now() + 5 * HOUR), noOfSeats: 10, price: 100 });
        const [visitor, upcomingOnly, stranger] = [oid(), oid(), oid()];
        await Booking.create([
            { showId: past._id, userId: visitor, seats: ["A1"], totalAmount: 100, status: "SUCCESSFUL" },
            { showId: future._id, userId: upcomingOnly, seats: ["A2"], totalAmount: 100, status: "SUCCESSFUL" },
        ]);

        expect((await myTheatreReviewService(visitor, theatre._id)).canReview).toBe(true);
        expect((await myTheatreReviewService(upcomingOnly, theatre._id)).canReview).toBe(false);
        await expect(upsertTheatreReviewService(stranger, theatre._id, { rating: 5 })).rejects.toMatchObject({ code: 403 });

        await upsertTheatreReviewService(visitor, theatre._id, { rating: 4, sound: 5, comment: "Great sound" });
        const { summary } = await upsertTheatreReviewService(visitor, theatre._id, { rating: 2, sound: 3 });   // edit, not duplicate
        expect(summary).toMatchObject({ avg: 2, count: 1, sound: 3 });
        const list = await listTheatreReviewsService(theatre._id.toString());
        expect(list.distribution.find((d) => d.star === 2).count).toBe(1);
        expect((await Theatre.findById(theatre._id)).rating.avg).toBe(2);
    });
});
