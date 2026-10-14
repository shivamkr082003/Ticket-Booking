import { z } from "zod";

export const couponCreateSchema = z.object({
  code:         z.string().trim().regex(/^[A-Za-z0-9]{3,20}$/, "Codes are 3–20 letters or digits").transform((s) => s.toUpperCase()),
  description:  z.string().trim().max(160).optional().default(""),
  type:         z.enum(["PERCENT", "FLAT"]),
  value:        z.number().positive("Discount must be above 0"),
  maxDiscount:  z.number().min(0).optional().default(0),
  minAmount:    z.number().min(0).optional().default(0),
  validFrom:    z.string().datetime().nullable().optional(),
  validUntil:   z.string().datetime().nullable().optional(),
  usageLimit:   z.number().int().min(0).optional().default(0),
  perUserLimit: z.number().int().min(0).optional().default(1),
  isActive:     z.boolean().optional().default(true),
}).refine((c) => c.type !== "PERCENT" || c.value <= 100, { message: "Percentage discounts can't exceed 100%", path: ["value"] })
  .refine((c) => !c.validFrom || !c.validUntil || c.validFrom < c.validUntil, { message: "End date must be after start date", path: ["validUntil"] });

export const couponUpdateSchema = z.object({
  description:  z.string().trim().max(160).optional(),
  value:        z.number().positive().optional(),
  maxDiscount:  z.number().min(0).optional(),
  minAmount:    z.number().min(0).optional(),
  validFrom:    z.string().datetime().nullable().optional(),
  validUntil:   z.string().datetime().nullable().optional(),
  usageLimit:   z.number().int().min(0).optional(),
  perUserLimit: z.number().int().min(0).optional(),
  isActive:     z.boolean().optional(),
});
