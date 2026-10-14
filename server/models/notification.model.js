import mongoose from "mongoose";

export const NOTIFICATION_TYPES = ["BOOKING_CONFIRMED", "BOOKING_CANCELLED", "SHOW_REMINDER", "BOOKINGS_OPEN", "SUPPORT_REPLY"];

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:   { type: String, enum: NOTIFICATION_TYPES, required: true },
    title:  { type: String, required: true, maxLength: 120 },
    body:   { type: String, default: "", maxLength: 300 },
    link:   { type: String, default: "" },        // client route, e.g. /ticket/:id
    image:  { type: String, default: "" },        // movie poster
    readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });
// Inbox keeps 60 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
