import { z } from "zod";

export const createReviewSchema = z.object({
    movieId: z.string().length(24, "Invalid movieId"),
    rating:  z.number().min(1, "Rating must be at least 1").max(10, "Rating cannot exceed 10"),
    comment: z.string().min(10, "Comment must be at least 10 characters").max(1000, "Comment too long"),
});

export const updateReviewSchema = z.object({
    rating:  z.number().min(1).max(10).optional(),
    comment: z.string().min(10).max(1000).optional(),
}).refine(d => d.rating !== undefined || d.comment !== undefined, {
    message: "At least one field (rating or comment) is required"
});