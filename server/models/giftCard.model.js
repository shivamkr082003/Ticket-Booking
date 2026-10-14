import mongoose from "mongoose";

const giftCardSchema = new mongoose.Schema({
    code:           { type: String, unique: true, sparse: true },      // set once paid
    amount:         { type: Number, required: true, min: 1 },
    status:         { type: String, enum: ["PENDING", "ACTIVE", "REDEEMED"], default: "PENDING" },
    purchasedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientName:  { type: String, trim: true, default: "", maxlength: 60 },
    recipientEmail: { type: String, trim: true, lowercase: true, default: "" },
    message:        { type: String, trim: true, default: "", maxlength: 200 },
    stripePaymentIntentId: { type: String, required: true, index: true },
    redeemedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    redeemedAt:     { type: Date, default: null },
    expiresAt:      { type: Date, default: null },
}, { timestamps: true });

giftCardSchema.index({ purchasedBy: 1, createdAt: -1 });

const GiftCard = mongoose.model("GiftCard", giftCardSchema);
export default GiftCard;
