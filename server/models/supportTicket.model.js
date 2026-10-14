import mongoose from "mongoose";

export const SUPPORT_CATEGORIES = ["PAYMENT", "REFUND", "ENTRY", "SHOW", "FOOD", "ACCOUNT", "OTHER"];
export const SUPPORT_STATUS = ["OPEN", "IN_PROGRESS", "RESOLVED"];

const replySchema = new mongoose.Schema({
    by:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name:    { type: String, default: "" },
    staff:   { type: Boolean, default: false },
    message: { type: String, required: true, maxlength: 2000 },
}, { timestamps: { createdAt: true, updatedAt: false } });

const supportTicketSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    category:  { type: String, enum: SUPPORT_CATEGORIES, default: "OTHER" },
    subject:   { type: String, required: true, trim: true, maxlength: 120 },
    message:   { type: String, required: true, trim: true, maxlength: 2000 },
    status:    { type: String, enum: SUPPORT_STATUS, default: "OPEN", index: true },
    replies:   { type: [replySchema], default: [] },
}, { timestamps: true });

supportTicketSchema.index({ status: 1, updatedAt: -1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
export default SupportTicket;
