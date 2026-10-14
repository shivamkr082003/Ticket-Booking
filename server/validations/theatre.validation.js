import { z } from "zod";

const rowLetter = z.string().regex(/^[A-Z]$/, "Rows must be single letters A–Z");

export const seatLayoutSchema = z.object({
  rows:   z.array(rowLetter).min(1, "A screen needs at least one row").max(26),
  cols:   z.number().int().min(1).max(40, "At most 40 seats per row"),
  aisles: z.array(z.number().int().min(1)).max(6).optional().default([]),
  categories: z.array(z.object({
    key:   z.string().min(1).max(20),
    label: z.string().min(1).max(30),
    price: z.number().positive("Category price must be above ₹0"),
    rows:  z.array(rowLetter),
  })).min(1, "Add at least one seat category").max(6),
  accessible: z.array(z.string().regex(/^[A-Z]\d{1,2}$/, "Wheelchair spaces must be seat ids like A1"))
    .max(40).optional().default([]),
});

const pct = z.number().int().min(-50, "At most 50% off").max(100, "At most +100%");

const screenSchema = z.object({
  name:       z.string().trim().min(1, "Screen name is required").max(40),
  sound:      z.string().max(60).optional().default(""),
  projection: z.string().max(60).optional().default(""),
  photo:      z.string().url("Screen photo must be a valid URL").optional().or(z.literal("")),
  layout:     seatLayoutSchema,
});

export const theatreCreateSchema = z.object({
  name: z.string()
    .min(5, "Theatre name must be at least 5 characters")
    .max(100, "Theatre name cannot exceed 100 characters"),

  description: z.string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  city: z.string()
    .min(2, "City must be at least 2 characters")
    .max(50, "City cannot exceed 50 characters"),

  state: z.string()              // ← NEW
    .min(2, "State must be at least 2 characters")
    .max(50, "State cannot exceed 50 characters"),

  pincode: z.number()
    .int("Pincode must be an integer")
    .min(100000, "Pincode must be a valid 6-digit number")
    .max(999999, "Pincode must be a valid 6-digit number"),

  address: z.string()
    .min(5, "Address must be at least 5 characters")
    .max(100, "Address cannot exceed 100 characters"),

  // Set from the logged-in user by the controller — never trusted from the body
  owner: z.string()
    .length(24, "Owner must be a valid ObjectId")
    .optional(),

  movies: z.array(
    z.string().length(24, "Each movie ID must be a valid ObjectId")
  ).optional(),

  totalScreens: z.number()       // ← NEW
    .int("Total screens must be a whole number")
    .min(1, "Theatre must have at least 1 screen")
    .default(1),

  amenities: z.array(z.string()) // ← NEW
    .optional()
    .default([]),

  images: z.array(               // ← NEW
    z.string().url("Each image must be a valid URL")
  ).optional()
  .default([]),

  phone: z.string()
    .regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),

  openingHours: z.string()
    .max(60, "Opening hours cannot exceed 60 characters")
    .optional(),

  amenityPhotos: z.record(
      z.string().max(40),
      z.string().url("Each amenity photo must be a valid URL"),
    )
    .refine(o => Object.keys(o).length <= 30, "Too many amenity photos")
    .optional(),

  menu: z.array(z.object({
      _id:         z.string().length(24).optional(),
      name:        z.string().trim().min(1, "Menu items need a name").max(60),
      description: z.string().max(140).optional().default(""),
      category:    z.enum(["Popcorn", "Combos", "Snacks", "Beverages", "Desserts"]),
      price:       z.number().positive("Menu prices must be above ₹0"),
      veg:         z.boolean().optional().default(true),
      image:       z.string().url().optional().or(z.literal("")),
      available:   z.boolean().optional().default(true),
    }))
    .max(60, "At most 60 menu items")
    .optional(),

  screens: z.array(screenSchema)
    .max(20, "At most 20 screens")
    .optional(),

  location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).nullable().optional(),

  cancellationPolicy: z.object({
      fullRefundHours:   z.number().min(0).max(168),
      cancelCutoffHours: z.number().min(0).max(72),
      partialRefundPct:  z.number().int().min(0).max(100),
    })
    .refine(p => p.cancelCutoffHours <= p.fullRefundHours, "The full-refund window must start before cancellations close")
    .nullable().optional(),

  pricingRules: z.object({
      weekendPct: pct, morningPct: pct, primeTimePct: pct, openingDayPct: pct,
    }).partial().nullable().optional(),
});

export const theatreUpdateSchema = theatreCreateSchema.partial();