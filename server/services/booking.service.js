import crypto    from "crypto";
import mongoose  from "mongoose";
import Booking   from "../models/bookings.model.js";
import Show      from "../models/show.model.js";
import Theatre   from "../models/theatre.model.js";
import { BOOKING_STATUS, STATUS_CODES, USER_ROLE, REFUND_STATUS } from "../utils/constants.js";
import { quoteOrder } from "./pricing.service.js";
import Coupon    from "../models/coupon.model.js";
import { refundQuote } from "../utils/refundPolicy.js";
import { emitBookingConfirmed, emitBookingCancelled } from "../socket.js";
import { sendBookingConfirmEmail, sendBookingCancelEmail } from "../services/email.service.js";
import { getStripe } from "./stripe.service.js";
import { notifyBookingConfirmed, notifyBookingCancelled } from "./notification.service.js";
import { creditWallet, debitWallet, walletBalance } from "./wallet.service.js";

// ── Helper ────────────────────────────────────────────────
const generateTicketCode = () =>
    "CV-" + crypto.randomBytes(6).toString("hex").toUpperCase();

// ── INITIATE BOOKING ─────────────────────────────────────
// Uses MongoDB transaction for atomic seat locking
// Prevents double booking at DB level
export const initiateBookingService = async ({ showId, seats, userId, isPrime = false, addOns = [], couponCode = null, useWallet = false }) => {
    const session = await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            // 1. Fetch show inside transaction with session
            const show = await Show.findById(showId)
                .populate("movieId",   "name posterUrl duration")
                .populate("theatreId", "name city address menu")
                .session(session);

            if (!show)
                throw { err: "Show not found", code: STATUS_CODES.NOT_FOUND };

            if (show.isActive === false)
                throw { err: "This show is no longer active", code: STATUS_CODES.BAD_REQUEST };

            // 2. Check each requested seat is not already booked
            const conflicting = seats.filter(s => show.bookedSeats.includes(s));
            if (conflicting.length > 0) {
                throw {
                    err:  `Seats already taken: ${conflicting.join(", ")}`,
                    code: STATUS_CODES.CONFLICT,
                };
            }

            // 3. Check total capacity
            const available = show.noOfSeats - show.bookedSeats.length;
            if (seats.length > available) {
                throw {
                    err:  `Only ${available} seat(s) available`,
                    code: STATUS_CODES.BAD_REQUEST,
                };
            }

            // Tickets by category, Prime discount, F&B and coupon — all priced server-side,
            // with the same function the checkout quote uses, so the charge matches what was shown
            const quote = await quoteOrder({ show, seats, addOns, couponCode, userId, isPrime });
            const { subtotal, discount, lineItems, totalAmount } = quote;

            // 4. Atomically add seats to bookedSeats
            //    Using $addToSet won't help here — we need strict check + set
            //    So we use findOneAndUpdate with a condition that ALL seats are free
            const updated = await Show.findOneAndUpdate(
                {
                    _id:         showId,
                    bookedSeats: { $not: { $elemMatch: { $in: seats } } }, // none of these seats booked
                },
                { $push: { bookedSeats: { $each: seats } } },
                { new: true, session }
            );

            if (!updated) {
                // Race condition — another request booked one of these seats
                throw {
                    err:  "One or more seats were just booked by someone else. Please re-select.",
                    code: STATUS_CODES.CONFLICT,
                };
            }

            // 5. Wallet first (debited inside this transaction), the rest on card
            const walletApplied = useWallet ? Math.min(await walletBalance(userId, session), totalAmount) : 0;
            const cardAmount    = totalAmount - walletApplied;
            const paidWith      = walletApplied === 0 ? "CARD" : cardAmount === 0 ? "WALLET" : "MIXED";
            const bookingId     = new mongoose.Types.ObjectId();
            if (walletApplied > 0)
                await debitWallet({ userId, amount: walletApplied, reason: "BOOKING", note: show.movieId?.name ?? "Tickets", bookingId, session });

            const paymentIntent = cardAmount > 0
                ? await getStripe().paymentIntents.create({
                    amount:   cardAmount * 100, // paise
                    currency: "inr",
                    metadata: {
                        showId:  showId.toString(),
                        userId:  userId.toString(),
                        seats:   seats.join(","),
                    },
                })
                : null;

            // 6. Create booking record — a fully wallet-paid booking is confirmed right away
            const [booking] = await Booking.create([{
                _id: bookingId,
                walletApplied,
                paidWith,
                ...(paymentIntent ? {} : { status: BOOKING_STATUS.successful, ticketCode: generateTicketCode() }),
                showId,
                userId,
                seats,
                totalAmount,
                subtotal,
                discount,
                primeApplied:          discount > 0,
                lineItems,
                addOns:                quote.addOns,
                addOnsTotal:           quote.addOnsTotal,
                couponCode:            quote.couponCode,
                couponDiscount:        quote.couponDiscount,
                bookingFee:            quote.bookingFee,
                bookingFeeGst:         quote.bookingFeeGst,
                feeWaived:             quote.feeWaived,
                status:                paymentIntent ? BOOKING_STATUS.processing : BOOKING_STATUS.successful,
                stripePaymentIntentId: paymentIntent?.id,
                stripeClientSecret:    paymentIntent?.client_secret,
            }], { session });

            result = {
                bookingId:    booking._id,
                clientSecret: paymentIntent?.client_secret ?? null,
                paidWithWallet: !paymentIntent,
                walletApplied,
                cardAmount,
                totalAmount,
                subtotal,
                discount,
                primeApplied: discount > 0,
                lineItems,
                addOns:         quote.addOns,
                addOnsTotal:    quote.addOnsTotal,
                couponCode:     quote.couponCode,
                couponDiscount: quote.couponDiscount,
                bookingFee:     quote.bookingFee,
                bookingFeeGst:  quote.bookingFeeGst,
                feeWaived:      quote.feeWaived,
                seats,
                show: {
                    name:     show.movieId?.name,
                    poster:   show.movieId?.posterUrl,
                    duration: show.movieId?.duration,
                    theatre:  show.theatreId?.name,
                    city:     show.theatreId?.city,
                    address:  show.theatreId?.address,
                    showTime: show.showTime,
                    format:   show.format,
                    language: show.language,
                    screen:   show.screen,
                    price:    show.price,
                },
            };
        });

        if (result.paidWithWallet) await afterConfirmed(await loadConfirmed(result.bookingId));
        return result;

    } finally {
        await session.endSession();
    }
};

const loadConfirmed = (id) => Booking.findById(id).populate({
    path: "showId",
    populate: [
        { path: "movieId",   select: "name posterUrl duration genre certificate" },
        { path: "theatreId", select: "name city address pincode" },
    ],
});

// Side effects of a confirmed booking (card or wallet): coupon count, sockets, inbox, email
async function afterConfirmed(booking) {
    if (booking.couponCode) {
        await Coupon.updateOne({ code: booking.couponCode }, { $inc: { usedCount: 1 } });
    }
    emitBookingConfirmed(booking.showId._id.toString(), booking.seats).catch(console.error);
    const show    = booking.showId;
    const movie   = show?.movieId;
    const theatre = show?.theatreId;
    notifyBookingConfirmed(booking, movie, theatre, show);
    const user    = await (await import("../models/user.model.js")).default.findById(booking.userId).select("name email");
    if (user && movie && theatre) {
        sendBookingConfirmEmail({ booking, user, show, movie, theatre }).catch(console.error);
    }
}

// ── CONFIRM BOOKING ──────────────────────────────────────
export const confirmBookingService = async ({ bookingId, stripePaymentIntentId, userId }) => {
    // Verify payment with Stripe first (outside transaction — network call)
    const paymentIntent = await getStripe().paymentIntents.retrieve(stripePaymentIntentId);
    if (paymentIntent.status !== "succeeded") {
        throw { err: "Payment not completed", code: STATUS_CODES.BAD_REQUEST };
    }

    const session = await mongoose.startSession();

    try {
        let booking;

        await session.withTransaction(async () => {
            booking = await Booking.findOneAndUpdate(
                {
                    _id:    bookingId,
                    userId: userId,
                    status: BOOKING_STATUS.processing,
                    stripePaymentIntentId,
                },
                {
                    status:     BOOKING_STATUS.successful,
                    ticketCode: generateTicketCode(),
                },
                { new: true, session }
            ).populate({
                path: "showId",
                populate: [
                    { path: "movieId",   select: "name posterUrl duration genre certificate" },
                    { path: "theatreId", select: "name city address pincode" },
                ],
            });

            if (!booking) {
                throw {
                    err:  "Booking not found or already processed",
                    code: STATUS_CODES.BAD_REQUEST,
                };
            }
        });

        await afterConfirmed(booking);
        return booking;

    } finally {
        await session.endSession();
    }
};

// ── CHECKOUT QUOTE ───────────────────────────────────────
// Live price breakdown for the checkout summary — no seats are locked
export const getOrderQuoteService = async ({ showId, seats, addOns, couponCode, userId, isPrime }) => {
    const show = await Show.findById(showId).populate("theatreId", "name menu");
    if (!show || show.isActive === false) throw { err: "Show not found", code: STATUS_CODES.NOT_FOUND };
    return quoteOrder({ show, seats, addOns, couponCode, userId, isPrime });
};

// ── CHECK-IN (scan at the entrance) ──────────────────────
const CHECKIN_OPENS_HOURS = 3;   // before showtime
const CHECKIN_CLOSES_HOURS = 4;  // after showtime

export const checkInBookingService = async ({ ticketCode, user, now = new Date() }) => {
    const code = String(ticketCode ?? "").trim().toUpperCase();
    const booking = await Booking.findOne({ ticketCode: code })
        .populate({ path: "showId", populate: [
            { path: "movieId",   select: "name posterUrl duration" },
            { path: "theatreId", select: "name owner" },
        ] })
        .populate("userId", "name email");

    if (!booking) throw { err: "No ticket found with this code", code: STATUS_CODES.NOT_FOUND };

    const theatre = booking.showId?.theatreId;
    if (user.userRole !== USER_ROLE.admin && theatre?.owner?.toString() !== user._id.toString())
        throw { err: "This ticket is for another theatre", code: STATUS_CODES.FORBIDDEN };

    if (booking.status !== BOOKING_STATUS.successful)
        throw { err: `This ticket is ${booking.status === BOOKING_STATUS.cancelled ? "cancelled" : "not confirmed"}`, code: STATUS_CODES.BAD_REQUEST };

    if (booking.checkedInAt)
        throw { err: `Already checked in at ${booking.checkedInAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`, code: STATUS_CODES.CONFLICT };

    const start = new Date(booking.showId.showTime).getTime();
    if (now.getTime() < start - CHECKIN_OPENS_HOURS * 3_600_000)
        throw { err: `Check-in opens ${CHECKIN_OPENS_HOURS} hours before the show`, code: STATUS_CODES.BAD_REQUEST };
    if (now.getTime() > start + CHECKIN_CLOSES_HOURS * 3_600_000)
        throw { err: "This show has already ended", code: STATUS_CODES.BAD_REQUEST };

    // Conditional update — two scanners can't admit the same ticket twice
    const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, checkedInAt: null },
        { checkedInAt: now },
        { new: true }
    );
    if (!updated) throw { err: "Already checked in", code: STATUS_CODES.CONFLICT };

    booking.checkedInAt = updated.checkedInAt;
    return booking;
};

// ── REFUND QUOTE ─────────────────────────────────────────
// What cancelling right now would refund — shown to the user before they confirm
export const getRefundQuoteService = async ({ bookingId, userId, isPrime = false }) => {
    const booking = await Booking.findById(bookingId).populate({ path: "showId", select: "showTime theatreId", populate: { path: "theatreId", select: "cancellationPolicy" } });
    if (!booking) throw { err: "Booking not found", code: STATUS_CODES.NOT_FOUND };
    if (booking.userId.toString() !== userId.toString())
        throw { err: "Unauthorized", code: STATUS_CODES.FORBIDDEN };
    return refundQuote({ booking, showTime: booking.showId?.showTime, isPrime, policy: booking.showId?.theatreId?.cancellationPolicy });
};

// ── CANCEL BOOKING ───────────────────────────────────────
// Paid bookings follow the refund policy (time-to-show tiers, Prime perk) and are
// refunded to the original card via Stripe. Unpaid ones just release their seats.
export const cancelBookingService = async ({ bookingId, userId, cancellationReason, isPrime = false, refundTo = "SOURCE" }) => {
    const before = await Booking.findOne({ _id: bookingId, userId }).populate({ path: "showId", select: "showTime theatreId", populate: { path: "theatreId", select: "cancellationPolicy" } });
    if (!before || ![BOOKING_STATUS.processing, BOOKING_STATUS.successful].includes(before.status))
        throw { err: "Booking not found or cannot be cancelled", code: STATUS_CODES.BAD_REQUEST };

    const quote = refundQuote({ booking: before, showTime: before.showId?.showTime, isPrime, policy: before.showId?.theatreId?.cancellationPolicy });
    if (!quote.cancellable) throw { err: quote.reason, code: STATUS_CODES.BAD_REQUEST };

    // Where the money goes: unpaid → wallet hold released; "WALLET" → all instant; otherwise the
    // wallet part goes back to the wallet and only the card part is refunded through Stripe
    const unpaid      = before.status === BOOKING_STATUS.processing;
    const walletPaid  = before.walletApplied ?? 0;
    const toWallet    = unpaid ? walletPaid
                      : refundTo === "WALLET" || !before.stripePaymentIntentId ? quote.refundAmount
                      : Math.min(quote.refundAmount, walletPaid);
    const toCard      = unpaid ? 0 : quote.refundAmount - toWallet;

    const session = await mongoose.startSession();

    try {
        let booking;

        await session.withTransaction(async () => {
            // Guard on the exact status we quoted against — if a payment just completed,
            // this fails instead of refunding the wrong amount
            booking = await Booking.findOneAndUpdate(
                { _id: bookingId, userId, status: before.status },
                {
                    status:             BOOKING_STATUS.cancelled,
                    cancelledAt:        new Date(),
                    cancellationReason: cancellationReason ?? "Cancelled by user",
                    refundAmount:       unpaid ? 0 : quote.refundAmount,
                    refundStatus:       unpaid || quote.refundAmount === 0 ? REFUND_STATUS.none
                                      : toCard === 0 ? REFUND_STATUS.refunded : REFUND_STATUS.pending,
                    refundMethod:       unpaid || quote.refundAmount === 0 ? null : toCard === 0 ? "WALLET" : "SOURCE",
                },
                { new: true, session }
            );

            if (!booking) {
                throw {
                    err:  "This booking changed while cancelling — please refresh and try again",
                    code: STATUS_CODES.CONFLICT,
                };
            }

            // Release seats back to show
            await Show.findByIdAndUpdate(
                booking.showId,
                { $pull: { bookedSeats: { $in: booking.seats } } },
                { session }
            );

            if (toWallet > 0)
                await creditWallet({
                    userId: booking.userId, amount: toWallet, bookingId: booking._id, session,
                    reason: unpaid ? "BOOKING_RELEASED" : "REFUND",
                    note:   unpaid ? "Booking not completed" : "Cancellation refund",
                });
        });

        if (before.status === BOOKING_STATUS.processing && booking.stripePaymentIntentId) {
            // Nothing was charged — stop the pending payment
            try {
                await getStripe().paymentIntents.cancel(booking.stripePaymentIntentId);
            } catch (e) {
                console.log("Stripe cancel skipped:", e.message);
            }
        } else if (toCard > 0) {
            // Idempotency key: retries can never refund the same booking twice
            try {
                const refund = await getStripe().refunds.create(
                    { payment_intent: booking.stripePaymentIntentId, amount: toCard * 100 },
                    { idempotencyKey: `refund-${booking._id}` }
                );
                booking.stripeRefundId = refund.id;
                booking.refundStatus   = refund.status === "succeeded" ? REFUND_STATUS.refunded
                                       : refund.status === "failed" || refund.status === "canceled" ? REFUND_STATUS.failed
                                       : REFUND_STATUS.pending;
            } catch (e) {
                console.error(`Refund failed for booking ${booking._id}:`, e.message);
                booking.refundStatus = REFUND_STATUS.failed;
            }
            await booking.save();
        }

        // Emit socket — seats released
        emitBookingCancelled(booking.showId.toString(), booking.seats);

        // Send cancellation email (non-blocking)
        const cancelUser = await (await import("../models/user.model.js")).default.findById(booking.userId).select("name email");
        const cancelShow = await (await import("../models/show.model.js")).default.findById(booking.showId).populate("movieId", "name posterUrl");
        const cancelMovie = cancelShow?.movieId;
        notifyBookingCancelled(booking, cancelMovie);
        if (cancelUser) {
            sendBookingCancelEmail({ booking, user: cancelUser, movie: cancelMovie }).catch(console.error);
        }

        return booking;

    } finally {
        await session.endSession();
    }
};

// ── EXPIRE STALE BOOKINGS (cron job helper) ───────────────
// Call this every few minutes to release seats of abandoned bookings
export const expireStaleBookingsService = async () => {
    const EXPIRY_MINUTES = 10;
    const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

    const staleBookings = await Booking.find({
        status:    BOOKING_STATUS.processing,
        createdAt: { $lt: cutoff },
    });

    for (const booking of staleBookings) {
        try {
            await cancelBookingService({
                bookingId:          booking._id,
                userId:             booking.userId,
                cancellationReason: "Payment timeout — auto expired",
            });
            console.log(`⏰ Expired booking: ${booking._id}`);
        } catch (e) {
            console.error(`Failed to expire booking ${booking._id}:`, e);
        }
    }

    return staleBookings.length;
};

// ── GET USER BOOKINGS ─────────────────────────────────────
export const getUserBookingsService = async (userId) => {
    return await Booking.find({ userId })
        .populate({
            path: "showId",
            populate: [
                { path: "movieId",   select: "name posterUrl duration genre certificate" },
                { path: "theatreId", select: "name city address" },
            ],
        })
        .sort({ createdAt: -1 });
};

// ── GET SINGLE BOOKING ────────────────────────────────────
export const getBookingService = async (bookingId, userId) => {
    const booking = await Booking.findById(bookingId)
        .populate({
            path: "showId",
            populate: [
                { path: "movieId",   select: "name posterUrl duration genre certificate director" },
                { path: "theatreId", select: "name city address pincode location cancellationPolicy" },
            ],
        });

    if (!booking)
        throw { err: "Booking not found", code: STATUS_CODES.NOT_FOUND };

    if (booking.userId.toString() !== userId.toString())
        throw { err: "Unauthorized", code: STATUS_CODES.FORBIDDEN };

    return booking;
};

// ── GET BOOKINGS FOR A DASHBOARD OWNER ───────────────────
// Admins see every booking; theatre owners only see bookings for shows in
// theatres they own. Capped so a dashboard load stays bounded.
export const getOwnerBookingsService = async (user, { limit = 2000 } = {}) => {
    const query = {};

    if (user.userRole !== USER_ROLE.admin) {
        const theatreIds = await Theatre.find({ owner: user._id }).distinct("_id");
        const showIds    = await Show.find({ theatreId: { $in: theatreIds } }).distinct("_id");
        query.showId = { $in: showIds };
    }

    return Booking.find(query)
        .populate({
            path: "showId",
            populate: [
                { path: "movieId",   select: "name posterUrl" },
                { path: "theatreId", select: "name city owner" },
            ],
        })
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(Math.min(5000, Math.max(1, Number(limit) || 2000)));
};

// ── GET ALL BOOKINGS (admin) ──────────────────────────────
export const getAllBookingsService = async (filter = {}) => {
    const { status, page = 1, limit = 50 } = filter;
    const query = {};
    if (status) query.status = status;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate({
                path: "showId",
                populate: [
                    { path: "movieId",   select: "name posterUrl" },
                    { path: "theatreId", select: "name city" },
                ],
            })
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        Booking.countDocuments(query),
    ]);

    return {
        bookings,
        pagination: {
            total,
            page:       pageNum,
            limit:      limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};
