import mongoose from "mongoose";
import { BOOKING_STATUS, REFUND_STATUS } from "../utils/constants.js";

const bookingSchema = new mongoose.Schema({
    showId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Show",
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    seats: {
        type: [String],
        required: true,
        validate: {
            validator: (v) => v.length > 0,
            message: "At least one seat is required"
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    // Price breakdown — totalAmount = subtotal - discount
    subtotal: {
        type: Number,
        min: 0
    },
    discount: {
        type: Number,
        min: 0,
        default: 0
    },
    primeApplied: {
        type: Boolean,
        default: false
    },
    lineItems: {                    // per seat-category breakdown: [{ category, label, price, seats }]
        type: [{
            _id: false,
            category: String,
            label:    String,
            price:    Number,
            seats:    [String],
        }],
        default: []
    },
    addOns: {                       // F&B snapshot: [{ itemId, name, price, qty }]
        type: [{
            _id: false,
            itemId: mongoose.Schema.Types.ObjectId,
            name:   String,
            price:  Number,
            qty:    Number,
        }],
        default: []
    },
    addOnsTotal: {
        type: Number,
        min: 0,
        default: 0
    },
    couponCode: {
        type: String,
        default: null,
        index: true
    },
    couponDiscount: {
        type: Number,
        min: 0,
        default: 0
    },
    // Convenience fee + GST (feeWaived = what a Prime member didn't pay)
    bookingFee:    { type: Number, min: 0, default: 0 },
    bookingFeeGst: { type: Number, min: 0, default: 0 },
    feeWaived:     { type: Number, min: 0, default: 0 },
    reminderSentAt: { type: Date, default: null },
    // Wallet part of the payment (the rest went through Stripe)
    walletApplied: { type: Number, min: 0, default: 0 },
    paidWith:      { type: String, enum: ["CARD", "WALLET", "MIXED"], default: "CARD" },
    refundMethod:  { type: String, enum: ["SOURCE", "WALLET", null], default: null },
    checkedInAt: {                  // set when the ticket is scanned at the entrance
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: Object.values(BOOKING_STATUS),
        default: BOOKING_STATUS.processing
    },
    // Stripe payment
    stripePaymentIntentId: {
        type: String,
        default: null
    },
    stripeClientSecret: {
        type: String,
        default: null
    },
    // Ticket
    ticketCode: {
        type: String,
        unique: true,
        sparse: true   // null values allowed (set after confirmation)
    },
    // Cancellation
    cancelledAt: {
        type: Date,
        default: null
    },
    cancellationReason: {
        type: String,
        default: null
    },
    // Refund (set when a paid booking is cancelled)
    refundAmount: {
        type: Number,
        min: 0,
        default: 0
    },
    refundStatus: {
        type: String,
        enum: Object.values(REFUND_STATUS),
        default: REFUND_STATUS.none
    },
    stripeRefundId: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Indexes for common queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ showId: 1, status: 1 });
bookingSchema.index({ stripePaymentIntentId: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;