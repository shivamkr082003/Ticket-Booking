import { z } from "zod";

// POST /prime/confirm
export const confirmPrimeSchema = z.object({
    paymentIntentId: z.string().min(1, "Payment intent ID is required"),
});
