import Booking from "../models/bookings.model.js";
import Coupon  from "../models/coupon.model.js";
import { BOOKING_FEE, BOOKING_STATUS, PRIME_PLAN, STATUS_CODES } from "../utils/constants.js";
import { priceSeats } from "../utils/seatLayout.js";

const bad = (err) => ({ err, code: STATUS_CODES.BAD_REQUEST });
const MAX_ITEM_QTY = 10;

// ── F&B ──────────────────────────────────────────────────
/** Snapshot requested menu items at today's price; rejects unknown or sold-out items */
export function resolveAddOns(theatre, addOns = []) {
    if (!addOns.length) return { items: [], total: 0 };
    const menu = theatre?.menu ?? [];

    const merged = new Map();
    for (const { itemId, qty } of addOns) {
        const q = Number(qty);
        if (!Number.isInteger(q) || q < 1) throw bad("Each food item needs a whole-number quantity");
        merged.set(String(itemId), (merged.get(String(itemId)) ?? 0) + q);
    }

    const items = [...merged.entries()].map(([itemId, qty]) => {
        const item = menu.find((m) => m._id.toString() === itemId);
        if (!item) throw bad("A food item you picked is no longer on the menu");
        if (!item.available) throw bad(`${item.name} is sold out`);
        if (qty > MAX_ITEM_QTY) throw bad(`You can add up to ${MAX_ITEM_QTY} × ${item.name}`);
        return { itemId: item._id, name: item.name, price: item.price, qty };
    });

    return { items, total: items.reduce((a, i) => a + i.price * i.qty, 0) };
}

// ── Coupons ──────────────────────────────────────────────
export function couponDiscountFor(coupon, base) {
    const raw = coupon.type === "PERCENT"
        ? Math.round((base * coupon.value) / 100)
        : coupon.value;
    const capped = coupon.type === "PERCENT" && coupon.maxDiscount > 0 ? Math.min(raw, coupon.maxDiscount) : raw;
    // Always leave at least ₹1 to charge — Stripe can't take a ₹0 payment
    return Math.max(0, Math.min(capped, base - 1));
}

/** Finds a coupon and checks it can be used by this customer on an order of `base` rupees */
export async function validateCoupon({ code, userId, base, now = new Date() }) {
    const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
    if (!coupon || !coupon.isActive) throw bad("This coupon code isn't valid");
    if (coupon.validFrom && coupon.validFrom > now) throw bad("This offer hasn't started yet");
    if (coupon.validUntil && coupon.validUntil < now) throw bad("This offer has expired");
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw bad("This offer has been fully redeemed");
    if (base < coupon.minAmount) throw bad(`Add ₹${coupon.minAmount - base} more to use ${coupon.code}`);

    if (coupon.perUserLimit > 0) {
        const used = await Booking.countDocuments({
            userId,
            couponCode: coupon.code,
            status: { $in: [BOOKING_STATUS.successful, BOOKING_STATUS.processing] },
        });
        if (used >= coupon.perUserLimit)
            throw bad(`You've already used ${coupon.code}${coupon.perUserLimit > 1 ? ` ${coupon.perUserLimit} times` : ""}`);
    }
    return coupon;
}

// ── Convenience fee ──────────────────────────────────────
/** ₹ per ticket + GST on the fee; waived for Prime members */
export function bookingFeeFor(ticketCount, isPrime = false) {
    const gross = ticketCount * BOOKING_FEE.perTicket;
    if (isPrime) return { bookingFee: 0, bookingFeeGst: 0, feeWaived: gross + Math.round((gross * BOOKING_FEE.gstPct) / 100) };
    return { bookingFee: gross, bookingFeeGst: Math.round((gross * BOOKING_FEE.gstPct) / 100), feeWaived: 0 };
}

// ── Full order quote ─────────────────────────────────────
/**
 * tickets (by seat category) − Prime discount + food = coupon base − coupon + fee + GST = total.
 * Coupons never discount the convenience fee.
 * `show.theatreId` must be populated with the theatre's menu.
 */
export async function quoteOrder({ show, seats, addOns = [], couponCode, userId, isPrime = false }) {
    const { subtotal, lineItems } = priceSeats(show, seats);
    const discount = isPrime ? Math.round((subtotal * PRIME_PLAN.ticketDiscountPct) / 100) : 0;
    const food = resolveAddOns(show.theatreId, addOns);
    const base = subtotal - discount + food.total;

    const fee = bookingFeeFor(seats.length, isPrime);

    let coupon = null;
    if (couponCode && String(couponCode).trim()) {
        const c = await validateCoupon({ code: couponCode, userId, base });
        coupon = { code: c.code, description: c.description, discount: couponDiscountFor(c, base) };
    }

    return {
        lineItems,
        subtotal,                       // tickets before discounts
        discount,                       // Prime
        primeApplied: discount > 0,
        addOns: food.items,
        addOnsTotal: food.total,
        couponCode: coupon?.code ?? null,
        couponDiscount: coupon?.discount ?? 0,
        coupon,
        ...fee,
        totalAmount: base - (coupon?.discount ?? 0) + fee.bookingFee + fee.bookingFeeGst,
    };
}

// ── Public offers list ───────────────────────────────────
export async function listActiveOffers(now = new Date()) {
    const offers = await Coupon.find({
        isActive: true,
        $and: [
            { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
            { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
        ],
    }).sort({ createdAt: -1 });
    return offers
        .filter((c) => !(c.usageLimit > 0 && c.usedCount >= c.usageLimit))
        .map((c) => ({
            code: c.code, description: c.description, type: c.type, value: c.value,
            maxDiscount: c.maxDiscount, minAmount: c.minAmount, validUntil: c.validUntil,
        }));
}
