import User    from "../models/user.model.js";
import Booking from "../models/bookings.model.js";
import { BOOKING_STATUS, PRIME_PLAN, STATUS_CODES, isPrimeActive } from "../utils/constants.js";
import { getStripe } from "./stripe.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const PERKS = [
    `${PRIME_PLAN.ticketDiscountPct}% off every ticket, applied automatically at checkout`,
    "Zero booking fee on every order",
    "Full refund on cancellations up to 2 hours before the show",
    `First ${PRIME_PLAN.trialDays} days free for new members`,
    "Savings tracked across all your bookings",
    "No auto-renewal — extend only when you want to",
];

// ── Helpers ───────────────────────────────────────────────
const findUser = async (userId, select = "") => {
    const user = await User.findById(userId).select(select);
    if (!user) throw { err: "User not found", code: STATUS_CODES.NOT_FOUND };
    return user;
};

// New period starts when the current one ends, so renewing early never loses days
const nextExpiry = (user) => {
    const base = isPrimeActive(user) ? new Date(user.primeExpiresAt).getTime() : Date.now();
    return new Date(base + PRIME_PLAN.periodDays * DAY_MS);
};

const membershipView = async (user) => {
    const [savings] = await Booking.aggregate([
        { $match: { userId: user._id, status: BOOKING_STATUS.successful, primeApplied: true } },
        { $group: { _id: null, saved: { $sum: { $add: ["$discount", { $ifNull: ["$feeWaived", 0] }] } }, bookings: { $sum: 1 } } },
    ]);

    return {
        active:             isPrimeActive(user),
        expiresAt:          user.primeExpiresAt,
        since:              user.primeSince,
        trialAvailable:     !user.primeTrialUsed,
        totalSaved:         savings?.saved ?? 0,
        discountedBookings: savings?.bookings ?? 0,
    };
};

// ── GET PLAN (public) ─────────────────────────────────────
export const getPrimePlanService = () => ({
    name:              PRIME_PLAN.name,
    price:             PRIME_PLAN.price,
    listPrice:         PRIME_PLAN.listPrice,
    periodDays:        PRIME_PLAN.periodDays,
    trialDays:         PRIME_PLAN.trialDays,
    ticketDiscountPct: PRIME_PLAN.ticketDiscountPct,
    perks:             PERKS,
});

// ── GET MY MEMBERSHIP ─────────────────────────────────────
export const getPrimeStatusService = async (userId) => {
    const user = await findUser(userId);
    return membershipView(user);
};

// ── SUBSCRIBE ─────────────────────────────────────────────
// First-time members get the trial instantly. Everyone else gets a Stripe
// PaymentIntent and must call confirmPrimeService once payment succeeds.
export const subscribePrimeService = async (userId) => {
    const user = await findUser(userId);

    if (!user.primeTrialUsed) {
        // Conditional update so two parallel requests can't both claim the trial
        const updated = await User.findOneAndUpdate(
            { _id: userId, primeTrialUsed: false },
            {
                primeTrialUsed: true,
                primeExpiresAt: new Date(Date.now() + PRIME_PLAN.trialDays * DAY_MS),
                primeSince:     user.primeSince ?? new Date(),
            },
            { new: true }
        );
        if (updated) {
            return { activated: true, trial: true, membership: await membershipView(updated) };
        }
    }

    const paymentIntent = await getStripe().paymentIntents.create({
        amount:   PRIME_PLAN.price * 100, // paise
        currency: PRIME_PLAN.currency,
        metadata: {
            type:   "prime_pass",
            userId: userId.toString(),
        },
    });

    return {
        activated:       false,
        trial:           false,
        clientSecret:    paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount:          PRIME_PLAN.price,
    };
};

// ── CONFIRM PAID PERIOD ───────────────────────────────────
export const confirmPrimeService = async ({ userId, paymentIntentId }) => {
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded")
        throw { err: "Payment not completed", code: STATUS_CODES.BAD_REQUEST };

    if (paymentIntent.metadata?.type !== "prime_pass" || paymentIntent.metadata?.userId !== userId.toString())
        throw { err: "This payment does not belong to your Prime Pass", code: STATUS_CODES.FORBIDDEN };

    const user = await findUser(userId, "+primePaymentIds");

    // Idempotent — the same payment never extends the membership twice
    if (user.primePaymentIds.includes(paymentIntentId)) return membershipView(user);

    const updated = await User.findOneAndUpdate(
        { _id: userId, primePaymentIds: { $ne: paymentIntentId } },
        {
            $set:  { primeExpiresAt: nextExpiry(user), primeSince: user.primeSince ?? new Date() },
            $push: { primePaymentIds: paymentIntentId },
        },
        { new: true }
    );

    return membershipView(updated ?? user);
};
