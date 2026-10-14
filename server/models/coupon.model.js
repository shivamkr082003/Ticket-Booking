import mongoose from "mongoose";

export const COUPON_TYPES = ["PERCENT", "FLAT"];

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        match: [/^[A-Z0-9]{3,20}$/, "Codes are 3–20 letters or digits"],
    },
    description:  { type: String, trim: true, default: "", maxlength: 160 },
    type:         { type: String, enum: COUPON_TYPES, required: true },
    value:        { type: Number, required: true, min: 1 },        // % for PERCENT, ₹ for FLAT
    maxDiscount:  { type: Number, min: 0, default: 0 },             // ₹ cap for PERCENT (0 = no cap)
    minAmount:    { type: Number, min: 0, default: 0 },             // order value needed to apply
    validFrom:    { type: Date, default: null },
    validUntil:   { type: Date, default: null },
    usageLimit:   { type: Number, min: 0, default: 0 },             // total redemptions (0 = unlimited)
    perUserLimit: { type: Number, min: 0, default: 1 },             // per customer (0 = unlimited)
    usedCount:    { type: Number, min: 0, default: 0 },
    isActive:     { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.path("value").validate(function (v) {
    return this.type !== "PERCENT" || v <= 100;
}, "Percentage discounts can't exceed 100%");

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
