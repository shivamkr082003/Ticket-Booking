import { z } from "zod";

const stars = z.number().int().min(1, "Ratings are 1–5 stars").max(5, "Ratings are 1–5 stars");

export const theatreReviewSchema = z.object({
  rating:      stars,
  cleanliness: stars.optional(),
  sound:       stars.optional(),
  seating:     stars.optional(),
  comment:     z.string().trim().max(600, "Keep it under 600 characters").optional().default(""),
});
