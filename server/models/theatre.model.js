import mongoose from "mongoose";

// Seat layout — shared shape for theatre screens and the per-show snapshot
export const seatCategorySchema = new mongoose.Schema({
    key:   { type: String, required: true, trim: true },   // "REGULAR" | "PREMIUM" | "RECLINER" …
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    rows:  { type: [String], default: [] },
}, { _id: false });

export const seatLayoutSchema = new mongoose.Schema({
    rows:       { type: [String], required: true },
    cols:       { type: Number, required: true, min: 1, max: 40 },
    aisles:     { type: [Number], default: [] },
    categories: { type: [seatCategorySchema], default: [] },
    accessible: { type: [String], default: [] },   // wheelchair spaces, e.g. ["A1", "A2"]
}, { _id: false });

// Optional per-theatre overrides of the platform refund policy
const cancellationPolicySchema = new mongoose.Schema({
    fullRefundHours:   { type: Number, min: 0, max: 168 },
    cancelCutoffHours: { type: Number, min: 0, max: 72 },
    partialRefundPct:  { type: Number, min: 0, max: 100 },
}, { _id: false });

// % adjustments applied to ticket prices when a show is scheduled
const pricingRulesSchema = new mongoose.Schema({
    weekendPct:    { type: Number, min: -50, max: 100, default: 0 },   // Sat & Sun
    morningPct:    { type: Number, min: -50, max: 100, default: 0 },   // starts before 12 pm
    primeTimePct:  { type: Number, min: -50, max: 100, default: 0 },   // starts 6–10 pm
    openingDayPct: { type: Number, min: -50, max: 100, default: 0 },   // the movie's release day
}, { _id: false });

const screenSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true },          // "Audi 1", "IMAX Hall"
    sound:      { type: String, trim: true, default: "" },             // "Dolby Atmos 7.1"
    projection: { type: String, trim: true, default: "" },             // "4K Laser"
    photo:      { type: String, trim: true, default: "" },             // owner-uploaded photo of this auditorium
    layout:     { type: seatLayoutSchema, required: true },
}, { _id: false });

// Food & beverages sold at the counter / added during checkout
export const MENU_CATEGORIES = ["Popcorn", "Combos", "Snacks", "Beverages", "Desserts"];

const menuItemSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, default: "", maxlength: 140 },
    category:    { type: String, enum: MENU_CATEGORIES, default: "Snacks" },
    price:       { type: Number, required: true, min: 1 },
    veg:         { type: Boolean, default: true },
    image:       { type: String, trim: true, default: "" },
    available:   { type: Boolean, default: true },
});

const theatreSchema = new mongoose.Schema({
  name: { 
        type: String, 
        required: true, 
        trim: true, 
        minLength: 5, 
        index: true 
    },
  description: { 
        type: String, 
        default: "" 
    },
  city: { 
        type: String, 
        required: true, 
        trim: true, 
        index: true 
    },
    state: {                        
        type: String,
        required: true,
        trim: true,
        default: ""
    },
  pincode: { 
        type: Number, 
        required: true, 
        min: 100000, 
        max: 999999 
    },
  address: { 
        type: String, 
        required : true,
        trim : true,
        minLength : 4,
        maxLength : 100,
        default: "" 
    },
  owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
  movies: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Movie' 
    }],
    totalScreens: {                
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    amenities: {                    // ["Parking","Food Court","IMAX"...]
        type: [String],
        default: []
    },
    images: {                       // theatre photos
        type: [String],
        default: []
    },
    phone: {
        type: String,
        trim: true,
        default: ""
    },
    openingHours: {                 // e.g. "9:00 AM – 1:00 AM"
        type: String,
        trim: true,
        default: ""
    },
    menu: {                         // F&B items customers can add while booking
        type: [menuItemSchema],
        default: []
    },
    amenityPhotos: {                // { "Food Court": "https://…" } — owner photos per amenity
        type: Object,
        default: {}
    },
    screens: {                      // auditoriums with seat layouts & category pricing
        type: [screenSchema],
        default: []
    },
    location: {                     // map pin, set by the owner — powers "near me"
        lat: { type: Number, min: -90,  max: 90 },
        lng: { type: Number, min: -180, max: 180 },
    },
    cancellationPolicy: { type: cancellationPolicySchema, default: null },
    pricingRules:       { type: pricingRulesSchema,       default: null },
    rating: {                       // cached from TheatreReview
        avg:         { type: Number, default: 0 },
        count:       { type: Number, default: 0 },
        cleanliness: { type: Number, default: 0 },
        sound:       { type: Number, default: 0 },
        seating:     { type: Number, default: 0 },
    },
  isActive: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });

// Indexes for performance
theatreSchema.index({ city: 1, isActive: 1 });
theatreSchema.index({ name: "text", description: "text" });

const Theatre = mongoose.model('Theatre', theatreSchema);

export default Theatre;