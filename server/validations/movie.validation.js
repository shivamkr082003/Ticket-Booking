import { z } from "zod";

export const movieCreateSchema = z.object({
  name: z.string()
    .min(2, "Movie name must be at least 2 characters")
    .max(100, "Movie name cannot exceed 100 characters"),

  description: z.string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description cannot exceed 2000 characters"),

  director: z.string()
    .min(2, "Director name must be at least 2 characters")
    .max(100, "Director name cannot exceed 100 characters"),

  casts: z.array(z.string().min(1))
    .min(1, "At least one cast member is required"),

  genre: z.array(z.string().min(1))
    .min(1, "At least one genre is required"),

  languages: z.array(z.string().min(1))
    .min(1, "At least one language is required"),

  duration: z.number()
    .int("Duration must be a whole number")
    .positive("Duration must be greater than 0"),

  rating: z.number()
    .min(0, "Rating cannot be less than 0")
    .max(10, "Rating cannot exceed 10")
    .optional(),

  certificate: z.enum(["U", "UA", "A", "R", "PG-13"], {
    errorMap: () => ({ message: "Certificate must be one of: U, UA, A, R, PG-13" })
  }).default("UA"),

  releaseDate: z.string()
    .date("Invalid release date format"),

  releaseStatus: z.enum(["COMING_SOON", "RELEASED", "BANNED"], {
    errorMap: () => ({ message: "Status must be: COMING_SOON, RELEASED, or BANNED" })
  }).default("COMING_SOON"),

  posterUrl: z.string()
    .url("Poster must be a valid URL"),

  bannerUrl: z.string()          // ← NEW
    .url("Banner must be a valid URL")
    .optional(),

  trailerUrl: z.string()
    .url("Trailer must be a valid URL"),

  images: z.array(                // ← NEW
    z.string().url("Each image must be a valid URL")
  ).optional(),
});

export const movieUpdateSchema = movieCreateSchema.partial();