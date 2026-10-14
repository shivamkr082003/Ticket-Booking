import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import WalletTxn from "../models/walletTxn.model.js";
import GiftCard from "../models/giftCard.model.js";
import { GIFT_CARD, STATUS_CODES } from "../utils/constants.js";
import { getStripe } from "./stripe.service.js";
import { sendGiftCardEmail } from "./email.service.js";

const bad = (err, code = STATUS_CODES.BAD_REQUEST) => ({ err, code });

// ── Ledger primitives (pass `session` to join a booking transaction) ─────
export async function creditWallet({ userId, amount, reason, note = "", bookingId = null, session = null }) {
    if (!(amount > 0)) return null;
    const user = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, { new: true, session }).select("walletBalance");
    if (!user) throw bad("User not found", STATUS_CODES.NOT_FOUND);
    await WalletTxn.create([{ userId, type: "CREDIT", amount, reason, note, bookingId, balanceAfter: user.walletBalance }], { session });
    return user.walletBalance;
}

export async function debitWallet({ userId, amount, reason, note = "", bookingId = null, session = null }) {
    if (!(amount > 0)) return null;
    // Conditional update — the balance can never go negative, even with parallel checkouts
    const user = await User.findOneAndUpdate(
        { _id: userId, walletBalance: { $gte: amount } },
        { $inc: { walletBalance: -amount } },
        { new: true, session },
    ).select("walletBalance");
    if (!user) throw bad("Not enough wallet balance");
    await WalletTxn.create([{ userId, type: "DEBIT", amount, reason, note, bookingId, balanceAfter: user.walletBalance }], { session });
    return user.walletBalance;
}

export const walletBalance = async (userId, session = null) =>
    (await User.findById(userId).select("walletBalance").session(session))?.walletBalance ?? 0;

export const getWalletService = async (userId) => {
    const [balance, transactions] = await Promise.all([
        walletBalance(userId),
        WalletTxn.find({ userId }).sort({ createdAt: -1 }).limit(40),
    ]);
    return { balance, transactions };
};

// ── Gift cards ────────────────────────────────────────────
const newCode = () => {
    // 16 chars without look-alikes (0/O, 1/I), grouped: CVGC-XXXX-XXXX-XXXX
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(12);
    const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    return `CVGC-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
};

export const purchaseGiftCardService = async (userId, { amount, recipientName = "", recipientEmail = "", message = "" }) => {
    if (!GIFT_CARD.amounts.includes(amount) && !(amount >= GIFT_CARD.min && amount <= GIFT_CARD.max))
        throw bad(`Gift cards are ₹${GIFT_CARD.min}–₹${GIFT_CARD.max}`);
    const pi = await getStripe().paymentIntents.create({
        amount: amount * 100, currency: "inr",
        metadata: { type: "gift_card", userId: userId.toString() },
    });
    const card = await GiftCard.create({ amount, purchasedBy: userId, recipientName, recipientEmail, message, stripePaymentIntentId: pi.id });
    return { giftCardId: card._id, clientSecret: pi.client_secret, amount };
};

export const confirmGiftCardService = async (userId, { giftCardId, paymentIntentId }) => {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") throw bad("Payment not completed");
    if (pi.metadata?.type !== "gift_card" || pi.metadata?.userId !== userId.toString())
        throw bad("This payment doesn't belong to your gift card", STATUS_CODES.FORBIDDEN);

    // Idempotent: PENDING → ACTIVE exactly once
    const card = await GiftCard.findOneAndUpdate(
        { _id: giftCardId, purchasedBy: userId, stripePaymentIntentId: paymentIntentId, status: "PENDING" },
        { status: "ACTIVE", code: newCode(), expiresAt: new Date(Date.now() + GIFT_CARD.validDays * 86_400_000) },
        { new: true },
    );
    if (!card) {
        const existing = await GiftCard.findOne({ _id: giftCardId, purchasedBy: userId });
        if (existing && existing.status !== "PENDING") return existing;
        throw bad("Gift card not found", STATUS_CODES.NOT_FOUND);
    }
    if (card.recipientEmail) {
        const buyer = await User.findById(userId).select("name");
        sendGiftCardEmail({ card, fromName: buyer?.name ?? "A friend" }).catch(console.error);
    }
    return card;
};

export const myGiftCardsService = (userId) =>
    GiftCard.find({ purchasedBy: userId, status: { $ne: "PENDING" } }).sort({ createdAt: -1 }).limit(30);

export const redeemGiftCardService = async (userId, rawCode) => {
    const code = String(rawCode ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^CVGC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw bad("That doesn't look like a Cineverse gift card code");
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            const card = await GiftCard.findOneAndUpdate(
                { code, status: "ACTIVE", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
                { status: "REDEEMED", redeemedBy: userId, redeemedAt: new Date() },
                { new: true, session },
            );
            if (!card) {
                const c = await GiftCard.findOne({ code }).session(session);
                throw bad(!c ? "Gift card not found" : c.status === "REDEEMED" ? "This gift card has already been redeemed" : "This gift card has expired");
            }
            const balance = await creditWallet({ userId, amount: card.amount, reason: "GIFT_CARD", note: `Gift card ${code.slice(-4)}`, session });
            result = { amount: card.amount, balance };
        });
        return result;
    } finally {
        await session.endSession();
    }
};
