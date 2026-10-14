import { z } from "zod";

export const createTicketSchema = z.object({
  category:  z.enum(["PAYMENT", "REFUND", "ENTRY", "SHOW", "FOOD", "ACCOUNT", "OTHER"]).default("OTHER"),
  subject:   z.string().trim().min(4, "Add a short subject").max(120),
  message:   z.string().trim().min(10, "Tell us a little more (10+ characters)").max(2000),
  bookingId: z.string().length(24).optional().or(z.literal("")),
});

export const replyTicketSchema = z.object({
  message: z.string().trim().max(2000).optional(),
  status:  z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
}).refine((b) => b.message || b.status, "Write a reply or change the status");
