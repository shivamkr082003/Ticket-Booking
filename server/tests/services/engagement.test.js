import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/testDb.js";
import { createMockStripe, resetMockStripe } from "../setup/mockStripe.js";

const mockStripe = createMockStripe();
const sendShowReminderEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("stripe", () => ({ default: vi.fn(function () { return mockStripe; }) }));
vi.mock("../../services/email.service.js", () => ({
    sendBookingConfirmEmail: vi.fn().mockResolvedValue(undefined),
    sendBookingCancelEmail:  vi.fn().mockResolvedValue(undefined),
    sendShowReminderEmail,
}));
vi.mock("../../socket.js", () => ({
    emitBookingConfirmed: vi.fn().mockResolvedValue(undefined),
    emitBookingCancelled: vi.fn(),
}));

const { initiateBookingService, confirmBookingService, cancelBookingService } = await import("../../services/booking.service.js");
const { createShowService, createShowsBulkService } = await import("../../services/show.service.js");
const { setWatchlistService, setNotifyService, mergeWatchlistService } = await import("../../services/watchlist.service.js");
const { listNotificationsService, markAllReadService, sendShowRemindersService } = await import("../../services/notification.service.js");
const Theatre      = (await import("../../models/theatre.model.js")).default;
const Show         = (await import("../../models/show.model.js")).default;
const Movie        = (await import("../../models/movie.model.js")).default;
const User         = (await import("../../models/user.model.js")).default;
const Booking      = (await import("../../models/bookings.model.js")).default;
const Notification = (await import("../../models/notification.model.js")).default;

const HOUR = 3_600_000;
const flush = () => new Promise((r) => setTimeout(r, 50));   // fire-and-forget hooks

beforeAll(async () => { process.env.STRIPE_SECRET_KEY = "sk_test_fake"; await connectTestDb(); });
afterAll(disconnectTestDb);
beforeEach(async () => { await clearTestDb(); resetMockStripe(mockStripe); sendShowReminderEmail.mockClear(); });

let n = 0;
const mkUser = () => User.create({ name: `user${++n}`, email: `u${n}@test.com`, password: "secret123" });
const mkMovie = () => Movie.create({
    name: `Movie ${++n}`, description: "A film long enough to pass validation rules.", director: "D", casts: ["A"],
    genre: ["Drama"], languages: ["Hindi"], duration: 120, releaseDate: new Date(), posterUrl: "https://x.test/p.jpg",
    trailerUrl: "https://youtu.be/x", releaseStatus: "COMING_SOON",
});
const mkTheatre = (movie) => Theatre.create({
    name: "Bulk Cinema", city: "Pune", state: "MH", pincode: 411001, address: "FC Road", movies: [movie._id], owner: new mongoose.Types.ObjectId(),
});
const showPayload = (theatre, movie, extra = {}) => ({
    theatreId: theatre._id, movieId: movie._id, screen: "Audi 1", noOfSeats: 100, price: 200, format: "2D", language: "Hindi", ...extra,
});

describe("watchlist", () => {
    it("adds, removes and merges device hearts into the account", async () => {
        const [u, a, b] = [await mkUser(), await mkMovie(), await mkMovie()];
        expect((await setWatchlistService(u._id, a._id.toString(), true)).watchlist).toEqual([a._id.toString()]);
        const merged = await mergeWatchlistService(u._id, [a._id.toString(), b._id.toString(), "nonsense", new mongoose.Types.ObjectId().toString()]);
        expect(merged.watchlist.sort()).toEqual([a._id.toString(), b._id.toString()].sort());   // unknown ids dropped
        expect((await setWatchlistService(u._id, a._id.toString(), false)).watchlist).toEqual([b._id.toString()]);
    });

    it("'notify me' also watchlists the movie, and rejects unknown movies", async () => {
        const [u, m] = [await mkUser(), await mkMovie()];
        const v = await setNotifyService(u._id, m._id.toString(), true);
        expect(v).toEqual({ watchlist: [m._id.toString()], notify: [m._id.toString()] });
        await expect(setWatchlistService(u._id, new mongoose.Types.ObjectId().toString(), true)).rejects.toMatchObject({ code: 404 });
    });
});

describe("notifications", () => {
    it("tells watchers once when a movie's first show is scheduled", async () => {
        const [fan, notifier, other, m] = [await mkUser(), await mkUser(), await mkUser(), await mkMovie()];
        await setWatchlistService(fan._id, m._id.toString(), true);
        await setNotifyService(notifier._id, m._id.toString(), true);
        const theatre = await mkTheatre(m);

        await createShowService(showPayload(theatre, m, { showTime: new Date(Date.now() + 48 * HOUR).toISOString() }));
        await createShowService(showPayload(theatre, m, { showTime: new Date(Date.now() + 72 * HOUR).toISOString() }));
        await flush();

        expect((await listNotificationsService(fan._id)).items).toHaveLength(1);
        expect((await listNotificationsService(notifier._id)).items[0]).toMatchObject({ type: "BOOKINGS_OPEN", link: `/movies/${m._id}` });
        expect((await listNotificationsService(other._id)).items).toHaveLength(0);
        expect((await User.findById(notifier._id)).notifyMovies).toHaveLength(0);   // one-shot
    });

    it("records booking confirmations and refunds, and marks them read", async () => {
        const [u, m] = [await mkUser(), await mkMovie()];
        const theatre = await mkTheatre(m);
        const show = await Show.create({ ...showPayload(theatre, m), showTime: new Date(Date.now() + 48 * HOUR), bookedSeats: [] });
        const res = await initiateBookingService({ showId: show._id, seats: ["A1"], userId: u._id });
        const b = await Booking.findById(res.bookingId);
        await confirmBookingService({ bookingId: b._id, stripePaymentIntentId: b.stripePaymentIntentId, userId: u._id });
        await cancelBookingService({ bookingId: b._id, userId: u._id });
        await flush();

        const inbox = await listNotificationsService(u._id);
        expect(inbox.items.map((i) => i.type)).toEqual(["BOOKING_CANCELLED", "BOOKING_CONFIRMED"]);
        expect(inbox.items[0].title).toContain("₹200");          // fee is kept
        expect(inbox.unread).toBe(2);
        await markAllReadService(u._id);
        expect((await listNotificationsService(u._id)).unread).toBe(0);
    });

    it("sends each show reminder exactly once, ~3 hours out", async () => {
        const [u, m] = [await mkUser(), await mkMovie()];
        const theatre = await mkTheatre(m);
        const soon  = await Show.create({ ...showPayload(theatre, m), showTime: new Date(Date.now() + 2 * HOUR), bookedSeats: [] });
        const later = await Show.create({ ...showPayload(theatre, m), showTime: new Date(Date.now() + 10 * HOUR), bookedSeats: [] });
        const base = { userId: u._id, totalAmount: 200, status: "SUCCESSFUL" };
        await Booking.create([
            { ...base, showId: soon._id,  seats: ["A1"], ticketCode: "CV-R1" },
            { ...base, showId: later._id, seats: ["A2"], ticketCode: "CV-R2" },
            { ...base, showId: soon._id,  seats: ["A3"], ticketCode: "CV-R3", status: "CANCELLED" },
        ]);

        expect(await sendShowRemindersService()).toBe(1);
        expect(await sendShowRemindersService()).toBe(0);
        expect(sendShowReminderEmail).toHaveBeenCalledTimes(1);
        expect((await listNotificationsService(u._id)).items[0].type).toBe("SHOW_REMINDER");
    });
});

describe("bulk show scheduling", () => {
    it("creates every slot and skips past or overlapping times", async () => {
        const m = await mkMovie();
        const theatre = await mkTheatre(m);
        const day = new Date(Date.now() + 72 * HOUR); day.setMinutes(0, 0, 0);
        const at = (h) => new Date(day.getTime() + h * HOUR).toISOString();
        await Show.create({ ...showPayload(theatre, m), showTime: new Date(at(9)), bookedSeats: [] });

        const r = await createShowsBulkService({
            ...showPayload(theatre, m),
            showTimes: [at(0), at(3), at(3), at(4), at(9.5), new Date(Date.now() - HOUR).toISOString()],
        });
        expect(r.created.map((s) => s.showTime.toISOString())).toEqual([at(0), at(3)]);
        expect(r.skipped.map((s) => s.reason)).toEqual(["In the past", "Overlaps another show on Audi 1", "Overlaps another show on Audi 1"]);
    });

    it("refuses a movie the theatre doesn't screen", async () => {
        const [m, other] = [await mkMovie(), await mkMovie()];
        const theatre = await mkTheatre(m);
        await expect(createShowsBulkService({ ...showPayload(theatre, other), showTimes: [new Date(Date.now() + 9 * HOUR).toISOString()] }))
            .rejects.toMatchObject({ code: 400 });
    });
});
