import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import Booking from "../models/bookings.model.js";
import Show from "../models/show.model.js";
import User from "../models/user.model.js";
import { BOOKING_STATUS, STATUS_CODES } from "../utils/constants.js";
import { sendShowReminderEmail } from "./email.service.js";

const INBOX_SIZE = 30;
const REMINDER_HOURS = 3;

// Never let a notification failure break the action that triggered it
export const notify = (userIds, payload) => {
    const ids = [].concat(userIds).filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return Notification.insertMany(ids.map((userId) => ({ userId, ...payload })))
        .catch((e) => { console.error("Notification failed:", e.message); return []; });
};

export const listNotificationsService = async (userId) => {
    const [items, unread] = await Promise.all([
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(INBOX_SIZE),
        Notification.countDocuments({ userId, readAt: null }),
    ]);
    return { items, unread };
};

export const markReadService = async (userId, id) => {
    if (!mongoose.isValidObjectId(id)) throw { err: "Invalid notification id", code: STATUS_CODES.BAD_REQUEST };
    const n = await Notification.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true });
    if (!n) throw { err: "Notification not found", code: STATUS_CODES.NOT_FOUND };
    return n;
};

export const markAllReadService = async (userId) => {
    const r = await Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });
    return { updated: r.modifiedCount };
};

// ── Hooks called from other services ─────────────────────
export const notifyBookingConfirmed = (booking, movie, theatre, show) => notify(booking.userId, {
    type:  "BOOKING_CONFIRMED",
    title: `Booked: ${movie?.name ?? "your show"}`,
    body:  `${booking.seats.length} ${booking.seats.length > 1 ? "seats" : "seat"} (${booking.seats.join(", ")}) at ${theatre?.name ?? "the cinema"} · ${fmtTime(show?.showTime)}`,
    link:  `/ticket/${booking._id}`,
    image: movie?.posterUrl ?? "",
});

export const notifyBookingCancelled = (booking, movie) => notify(booking.userId, {
    type:  "BOOKING_CANCELLED",
    title: booking.refundAmount > 0 ? `Refund of ₹${booking.refundAmount} initiated` : "Booking cancelled",
    body:  `${movie?.name ?? "Your booking"} · ${booking.refundAmount > 0 ? "Back to your original payment method in 5–7 business days" : "No charge was made"}`,
    link:  "/my-bookings",
    image: movie?.posterUrl ?? "",
});

/**
 * A movie's first upcoming show(s) → "bookings open" for everyone who watchlisted it or asked to be told.
 * Callers only invoke this when the movie had no upcoming shows before, so adding more shows doesn't spam people.
 */
export const notifyBookingsOpen = async ({ movieId, showTime }) => {
    const show = { movieId, showTime };
    const users = await User.find({ $or: [{ watchlist: show.movieId }, { notifyMovies: show.movieId }] }).select("_id");
    if (!users.length) return [];
    const movie = await mongoose.model("Movie").findById(show.movieId).select("name posterUrl");
    // "Notify me" is one-shot; the watchlist stays
    await User.updateMany({ notifyMovies: show.movieId }, { $pull: { notifyMovies: show.movieId } });
    return notify(users.map((u) => u._id), {
        type:  "BOOKINGS_OPEN",
        title: `Bookings open: ${movie?.name ?? "a movie on your watchlist"}`,
        body:  `First show ${fmtTime(show.showTime)} — grab the best seats before they go.`,
        link:  `/movies/${show.movieId}`,
        image: movie?.posterUrl ?? "",
    });
};

const fmtTime = (d) => d
    ? new Date(d).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : "";

// ── Cron: show reminders ~3 hours before ─────────────────
export const sendShowRemindersService = async (now = new Date()) => {
    const shows = await Show.find({
        showTime: { $gt: now, $lte: new Date(now.getTime() + REMINDER_HOURS * 3600_000) },
        isActive: true,
    }).select("_id").lean();
    if (!shows.length) return 0;

    const due = await Booking.find({
        showId: { $in: shows.map((s) => s._id) },
        status: BOOKING_STATUS.successful,
        reminderSentAt: null,
    }).select("_id");

    let sent = 0;
    for (const { _id } of due) {
        // Claim it first — two server instances can't both remind the same booking
        const booking = await Booking.findOneAndUpdate({ _id, reminderSentAt: null }, { reminderSentAt: now }, { new: true })
            .populate({ path: "showId", populate: [{ path: "movieId", select: "name posterUrl" }, { path: "theatreId", select: "name address city" }] })
            .populate("userId", "name email");
        if (!booking) continue;
        const show = booking.showId, movie = show?.movieId, theatre = show?.theatreId, user = booking.userId;
        await notify(user?._id, {
            type:  "SHOW_REMINDER",
            title: `${movie?.name ?? "Your show"} starts ${fmtTime(show?.showTime).split(", ").pop()}`,
            body:  `${theatre?.name ?? ""} · Seats ${booking.seats.join(", ")} · Ticket ${booking.ticketCode}`,
            link:  `/ticket/${booking._id}`,
            image: movie?.posterUrl ?? "",
        });
        if (user?.email) sendShowReminderEmail({ booking, user, show, movie, theatre }).catch(console.error);
        sent += 1;
    }
    return sent;
};
