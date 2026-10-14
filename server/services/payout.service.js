import Theatre from "../models/theatre.model.js";
import Show from "../models/show.model.js";
import Booking from "../models/bookings.model.js";
import { BOOKING_STATUS, PLATFORM_COMMISSION_PCT, USER_ROLE } from "../utils/constants.js";

const monthKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date(d));

/**
 * What one booking earns its cinema.
 *  - Owner's sales = ticket list price + food. Prime discounts and coupons are platform promotions,
 *    and the booking fee is the platform's, so neither touches the owner's share.
 *  - On a cancellation the owner keeps the same fraction the customer didn't get back.
 *  - The platform keeps PLATFORM_COMMISSION_PCT of what the owner kept.
 */
export function bookingEarnings(b, commissionPct = PLATFORM_COMMISSION_PCT) {
    const sales = (b.subtotal ?? b.totalAmount ?? 0) + (b.addOnsTotal ?? 0);
    const fees  = (b.bookingFee ?? 0) + (b.bookingFeeGst ?? 0);
    const paidRefundable = Math.max(1, (b.totalAmount ?? 0) - fees);
    const refundShare = b.status === BOOKING_STATUS.cancelled ? Math.min(1, (b.refundAmount ?? 0) / paidRefundable) : 0;
    const kept       = Math.round(sales * (1 - refundShare));
    const commission = Math.round((kept * commissionPct) / 100);
    return {
        sales, refunded: sales - kept, kept, commission, payout: kept - commission,
        bookingFees: fees, promos: (b.discount ?? 0) + (b.couponDiscount ?? 0),
    };
}

export const getPayoutsService = async ({ user, months = 6, now = new Date() }) => {
    const n = Math.min(24, Math.max(1, Number(months) || 6));
    const since = new Date(now); since.setMonth(since.getMonth() - n + 1); since.setDate(1); since.setHours(0, 0, 0, 0);

    const theatreFilter = user.userRole === USER_ROLE.admin ? {} : { owner: user._id };
    const theatres = await Theatre.find(theatreFilter).select("name city");
    const showIds  = await Show.find({ theatreId: { $in: theatres.map((t) => t._id) } }).distinct("_id");
    const bookings = await Booking.find({
        showId: { $in: showIds },
        createdAt: { $gte: since },
        $or: [{ status: BOOKING_STATUS.successful }, { status: BOOKING_STATUS.cancelled, refundAmount: { $gt: 0 } }],
    })
        .populate({ path: "showId", select: "showTime theatreId movieId", populate: { path: "movieId", select: "name" } })
        .sort({ createdAt: -1 });

    const theatreName = new Map(theatres.map((t) => [t._id.toString(), `${t.name}, ${t.city}`]));
    const blank = () => ({ bookings: 0, tickets: 0, sales: 0, refunded: 0, kept: 0, commission: 0, payout: 0, bookingFees: 0, promos: 0 });
    const add = (acc, e, b) => {
        acc.bookings += 1; acc.tickets += b.status === BOOKING_STATUS.successful ? b.seats.length : 0;
        for (const k of ["sales", "refunded", "kept", "commission", "payout", "bookingFees", "promos"]) acc[k] += e[k];
        return acc;
    };

    const byMonth = new Map(), byTheatre = new Map();
    const totals = blank();
    const rows = bookings.map((b) => {
        const e = bookingEarnings(b);
        const m = monthKey(b.createdAt);
        const tId = b.showId?.theatreId?.toString() ?? "";
        add(byMonth.get(m) ?? byMonth.set(m, blank()).get(m), e, b);
        add(byTheatre.get(tId) ?? byTheatre.set(tId, blank()).get(tId), e, b);
        add(totals, e, b);
        return {
            bookingId: b._id, date: b.createdAt, month: m, ticketCode: b.ticketCode ?? "", status: b.status,
            theatre: theatreName.get(tId) ?? "", movie: b.showId?.movieId?.name ?? "", showTime: b.showId?.showTime ?? null,
            tickets: b.seats.length, ...e,
        };
    });

    // Every month in range, newest first, even if empty
    const monthsOut = [];
    for (let i = 0; i < n; i++) {
        const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() - i);
        const key = monthKey(d);
        monthsOut.push({ month: key, ...(byMonth.get(key) ?? blank()) });
    }

    return {
        commissionPct: PLATFORM_COMMISSION_PCT,
        totals,
        months: monthsOut,
        theatres: [...byTheatre.entries()].map(([id, v]) => ({ theatreId: id, theatre: theatreName.get(id) ?? "", ...v }))
            .sort((a, b) => b.payout - a.payout),
        rows,
    };
};
