import mongoose from "mongoose";

// Append-only ledger; User.walletBalance is the running total
const walletTxnSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:         { type: String, enum: ["CREDIT", "DEBIT"], required: true },
    amount:       { type: Number, required: true, min: 1 },
    reason:       { type: String, enum: ["REFUND", "GIFT_CARD", "BOOKING", "BOOKING_RELEASED"], required: true },
    note:         { type: String, default: "" },
    bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    balanceAfter: { type: Number, required: true },
}, { timestamps: true });

walletTxnSchema.index({ userId: 1, createdAt: -1 });

const WalletTxn = mongoose.model("WalletTxn", walletTxnSchema);
export default WalletTxn;
