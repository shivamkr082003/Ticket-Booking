import mongoose from "mongoose";
import SupportTicket from "../models/supportTicket.model.js";
import Booking from "../models/bookings.model.js";
import { STATUS_CODES, USER_ROLE } from "../utils/constants.js";
import { notify } from "./notification.service.js";

const bad = (err, code = STATUS_CODES.BAD_REQUEST) => ({ err, code });

export const createTicketService = async (user, { category, subject, message, bookingId }) => {
    if (bookingId) {
        if (!mongoose.isValidObjectId(bookingId)) throw bad("Invalid booking");
        // Customers can only attach their own bookings
        if (!(await Booking.exists({ _id: bookingId, userId: user._id }))) throw bad("That booking isn't on your account", STATUS_CODES.FORBIDDEN);
    }
    return SupportTicket.create({ userId: user._id, category, subject, message, bookingId: bookingId || null });
};

export const myTicketsService = (userId) =>
    SupportTicket.find({ userId }).sort({ updatedAt: -1 }).limit(30)
        .populate({ path: "bookingId", select: "ticketCode seats" });

export const listTicketsService = async ({ status, page = 1 }) => {
    const q = status ? { status } : {};
    const p = Math.max(1, Number(page) || 1);
    const [items, total, open] = await Promise.all([
        SupportTicket.find(q).sort({ status: 1, updatedAt: -1 }).skip((p - 1) * 30).limit(30)
            .populate("userId", "name email").populate({ path: "bookingId", select: "ticketCode seats totalAmount status" }),
        SupportTicket.countDocuments(q),
        SupportTicket.countDocuments({ status: { $ne: "RESOLVED" } }),
    ]);
    return { items, open, pagination: { page: p, total, totalPages: Math.ceil(total / 30) } };
};

/** Reply and/or change status. Staff replies notify the customer; customers can add follow-ups on their own tickets. */
export const replyTicketService = async (user, id, { message, status }) => {
    if (!mongoose.isValidObjectId(id)) throw bad("Invalid ticket id");
    const staff = user.userRole === USER_ROLE.admin;
    const ticket = await SupportTicket.findById(id);
    if (!ticket) throw bad("Ticket not found", STATUS_CODES.NOT_FOUND);
    if (!staff && ticket.userId.toString() !== user._id.toString()) throw bad("Not your ticket", STATUS_CODES.FORBIDDEN);

    if (message?.trim()) ticket.replies.push({ by: user._id, name: user.name, staff, message: message.trim() });
    if (status && staff) ticket.status = status;
    else if (!staff && message?.trim() && ticket.status === "RESOLVED") ticket.status = "OPEN";   // customer reopened
    await ticket.save();

    if (staff && (message?.trim() || status)) {
        notify(ticket.userId, {
            type:  "SUPPORT_REPLY",
            title: ticket.status === "RESOLVED" ? `Resolved: ${ticket.subject}` : `Support replied: ${ticket.subject}`,
            body:  message?.trim()?.slice(0, 200) ?? "Your request was updated",
            link:  "/help#my-requests",
        });
    }
    return ticket;
};
