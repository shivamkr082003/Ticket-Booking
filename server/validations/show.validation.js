import { z } from "zod";

export const createShowSchema = z.object({
  theatreId: z.string()
    .length(24, "Invalid theatreId — must be a valid ObjectId"),

  movieId: z.string()
    .length(24, "Invalid movieId — must be a valid ObjectId"),

  screen: z.string()             
    .min(1, "Screen name is required")
    .max(50, "Screen name cannot exceed 50 characters")
    .default("Screen 1"),

  showTime: z.string()
    .datetime("Invalid showTime — must be ISO 8601 format"),

  noOfSeats: z.number()
    .int("Seats must be a whole number")
    .positive("Seats must be greater than 0"),

  bookedSeats: z.array(z.string()) 
    .optional()
    .default([]),

  price: z.number()
    .positive("Price must be greater than 0"),

  format: z.enum(["2D", "3D", "IMAX", "4DX", "Dolby Atmos"], {
    errorMap: () => ({ message: "Format must be: 2D, 3D, IMAX, 4DX, or Dolby Atmos" })
  }).default("2D"),

  language: z.string()           
    .min(1, "Language is required")
    .max(50, "Language cannot exceed 50 characters")
    .default("Hindi"),

  isActive: z.boolean()          
    .optional()
    .default(true),

  tags: z.array(z.enum(["Subtitled", "Audio Description", "Wheelchair Accessible", "Sensory Friendly", "Kids"]))
    .max(5).optional(),

  // Skip the theatre's weekend / morning / prime-time price rules for this show
  ignorePricingRules: z.boolean().optional(),

  // Per-show price for each seat category of the chosen screen, e.g. { RECLINER: 450 }
  categoryPrices: z.record(z.string(), z.number().positive("Category price must be above ₹0"))
    .optional(),
});

export const updateShowSchema = createShowSchema.partial();

export const bulkCreateShowSchema = createShowSchema
  .omit({ showTime: true, bookedSeats: true, isActive: true })
  .extend({
    showTimes: z.array(z.string().datetime("Invalid show time"))
      .min(1, "Pick at least one show time")
      .max(120, "At most 120 shows at once"),
  });