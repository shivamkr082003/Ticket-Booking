import { z } from "zod";

const addOnsSchema = z.array(z.object({
    itemId: z.string().length(24, "Invalid menu item"),
    qty:    z.number().int().min(1).max(10),
})).max(20).optional().default([]);

const couponSchema = z.string().trim().max(20).optional().nullable();

// POST /bookings/initiate
export const initiateBookingSchema = z.object({
    showId:     z.string().length(24, "Invalid showId"),
    seats:      z.array(z.string().trim()).min(1, "At least one seat must be selected").max(10, "You can book up to 10 seats at a time"),
    addOns:     addOnsSchema,
    couponCode: couponSchema,
    useWallet:  z.boolean().optional().default(false),
});

// POST /bookings/quote — same shape, seats may be empty while browsing
export const quoteBookingSchema = z.object({
    showId:     z.string().length(24, "Invalid showId"),
    seats:      z.array(z.string().trim()).max(10),
    addOns:     addOnsSchema,
    couponCode: couponSchema,
});

// POST /bookings/check-in
export const checkInSchema = z.object({
    ticketCode: z.string().trim().min(4, "Enter the ticket code").max(40),
});

// POST /bookings/confirm
export const confirmBookingSchema = z.object({
    bookingId:             z.string().length(24, "Invalid bookingId"),
    stripePaymentIntentId: z.string().min(1, "Payment intent ID is required"),
});

// POST /bookings/cancel
export const cancelBookingSchema = z.object({
    bookingId:          z.string().length(24, "Invalid bookingId"),
    cancellationReason: z.string().max(300).optional(),
    refundTo:           z.enum(["SOURCE", "WALLET"]).optional().default("SOURCE"),
});