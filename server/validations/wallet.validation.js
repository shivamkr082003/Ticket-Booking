import { z } from "zod";

export const redeemSchema = z.object({ code: z.string().trim().min(8).max(30) });

export const giftCardPurchaseSchema = z.object({
  amount:         z.number().int().min(100, "Gift cards start at ₹100").max(10000, "Gift cards go up to ₹10,000"),
  recipientName:  z.string().trim().max(60).optional().default(""),
  recipientEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")).default(""),
  message:        z.string().trim().max(200).optional().default(""),
});

export const giftCardConfirmSchema = z.object({
  giftCardId:      z.string().length(24),
  paymentIntentId: z.string().min(5),
});
