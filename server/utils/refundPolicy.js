import { BOOKING_STATUS, CANCELLATION_POLICY } from "./constants.js";

const HOUR_MS = 60 * 60 * 1000;

export function effectivePolicy(policy) {
    const p = { ...CANCELLATION_POLICY };
    for (const k of ["fullRefundHours", "cancelCutoffHours", "partialRefundPct"])
        if (typeof policy?.[k] === "number") p[k] = policy[k];
    return p;
}

/**
 * What a cancellation is worth right now. Pure — easy to test and shared by the
 * quote endpoint and the cancel flow so the user is charged exactly what they were shown.
 *   ≥ fullRefundHours before the show     → 100%
 *   ≥ cancelCutoffHours before the show   → partialRefundPct (Prime members: 100%)
 *   < cancelCutoffHours                   → not cancellable
 * Unpaid (in-process) bookings can always be cancelled — nothing was charged.
 */
export function refundQuote({ booking, showTime, isPrime = false, now = new Date(), policy = null }) {
    // A theatre may set its own windows; anything it leaves out falls back to the platform policy
    const { fullRefundHours, cancelCutoffHours, partialRefundPct } = effectivePolicy(policy);
    const start = new Date(showTime).getTime();
    const deadlines = {
        fullRefundUntil:  new Date(start - fullRefundHours * HOUR_MS),
        cancellableUntil: new Date(start - cancelCutoffHours * HOUR_MS),
        policy: { fullRefundHours, cancelCutoffHours, partialRefundPct },
    };

    if (booking.status === BOOKING_STATUS.processing)
        return { cancellable: true, refundPct: 0, refundAmount: 0, reason: "Payment was not completed — nothing was charged", ...deadlines };

    if (booking.checkedInAt)
        return { cancellable: false, refundPct: 0, refundAmount: 0, reason: "This ticket has already been used at the entrance", ...deadlines };

    if (booking.status !== BOOKING_STATUS.successful)
        return { cancellable: false, refundPct: 0, refundAmount: 0, reason: "This booking can no longer be cancelled", ...deadlines };

    // Show was removed by the theatre — always a full refund
    if (!showTime)
        return { cancellable: true, refundPct: 100, refundAmount: booking.totalAmount, reason: "Full refund — the show is no longer running", ...deadlines };

    const hoursLeft = (start - now.getTime()) / HOUR_MS;
    if (hoursLeft < cancelCutoffHours)
        return {
            cancellable: false, refundPct: 0, refundAmount: 0,
            reason: `Cancellations close ${cancelCutoffHours} hours before the show`,
            ...deadlines,
        };

    const full = hoursLeft >= fullRefundHours || isPrime;
    const refundPct = full ? 100 : partialRefundPct;
    // The convenience fee is a service charge — kept on customer cancellations
    const fees = (booking.bookingFee ?? 0) + (booking.bookingFeeGst ?? 0);
    const refundable = Math.max(0, booking.totalAmount - fees);
    return {
        cancellable:  true,
        refundPct,
        refundAmount: Math.round((refundable * refundPct) / 100),
        feeRetained:  fees,
        reason: full
            ? (hoursLeft >= fullRefundHours ? `Full refund — more than ${fullRefundHours} hours to showtime` : "Full refund — Prime Pass benefit")
            : `${refundPct}% refund — within ${fullRefundHours} hours of showtime`,
        ...deadlines,
    };
}
