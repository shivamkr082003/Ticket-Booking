import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    actor:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, default: "" },
    role:      { type: String, default: "" },
    action:    { type: String, enum: ["CREATE", "UPDATE", "DELETE", "STATUS", "CHECK_IN", "REPLY"], required: true },
    entity:    { type: String, required: true },          // Theatre, Show, Movie, Coupon, User, Booking, Support
    entityId:  { type: String, default: "" },
    summary:   { type: String, default: "" },
    fields:    { type: [String], default: [] },           // which fields a change touched
    ip:        { type: String, default: "" },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
// Keep a year of history
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
