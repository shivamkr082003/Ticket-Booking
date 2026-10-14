// ── USER ──────────────────────────────────────────────────
export type UserRole   = "CUSTOMER" | "CLIENT" | "ADMIN";
export type UserStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface User {
  id:          string;
  _id?:        string;
  name:        string;
  email:       string;
  phone?:      string;
  avatar?:     string;
  userRole:    UserRole;
  userStatus:  UserStatus;
  createdAt?:  string;
  isPrime?:        boolean;
  primeExpiresAt?: string | null;
}

export interface AuthState {
  user:    User | null;
  token:   string | null;
  loading: boolean;
}

// ── MOVIE ─────────────────────────────────────────────────
export type MovieCertificate   = "U" | "UA" | "A" | "R" | "PG-13";
export type MovieReleaseStatus = "COMING_SOON" | "RELEASED" | "BANNED";
export type ReleaseStatus      = MovieReleaseStatus; // alias

export interface Movie {
  _id:           string;
  name:          string;
  description:   string;
  director:      string;
  casts:         string[];
  genre:         string[];
  languages:     string[];
  duration:      number;        // minutes
  rating?:       number;        // 0-10
  certificate?:  MovieCertificate;
  releaseDate:   string;
  releaseStatus?: MovieReleaseStatus;
  posterUrl:     string;
  bannerUrl?:    string;    
  trailerUrl:    string;
  images?:       string[]; 
  isActive?:     boolean;
  createdAt?:    string;
}

// ── SEAT LAYOUT ───────────────────────────────────────────
export interface SeatCategory {
  key:   string;      // "REGULAR" | "PREMIUM" | "RECLINER" …
  label: string;
  price: number;
  rows:  string[];
}

export interface SeatLayout {
  rows:       string[];   // first = closest to the screen
  cols:       number;
  aisles:     number[];   // gap after these column numbers
  categories: SeatCategory[];
  accessible?: string[];  // wheelchair spaces, e.g. ["A1", "A2"]
}

export interface GeoPoint { lat: number; lng: number }

export interface CancellationPolicy {
  fullRefundHours:   number;
  cancelCutoffHours: number;
  partialRefundPct:  number;
}

export interface PricingRules {
  weekendPct?:    number;
  morningPct?:    number;
  primeTimePct?:  number;
  openingDayPct?: number;
}

export interface TheatreRating {
  avg: number; count: number; cleanliness: number; sound: number; seating: number;
}

export type ShowTag = "Subtitled" | "Audio Description" | "Wheelchair Accessible" | "Sensory Friendly" | "Kids";

export interface Screen {
  name:        string;
  sound?:      string;
  projection?: string;
  photo?:      string;      // owner-uploaded photo of this auditorium
  layout:      SeatLayout;
}

// ── FOOD & BEVERAGES ──────────────────────────────────────
export type MenuCategory = "Popcorn" | "Combos" | "Snacks" | "Beverages" | "Desserts";

export interface MenuItem {
  _id?:         string;
  name:         string;
  description?: string;
  category:     MenuCategory;
  price:        number;
  veg?:         boolean;
  image?:       string;
  available?:   boolean;
}

export interface AddOn { itemId: string; name: string; price: number; qty: number }

// ── THEATRE ───────────────────────────────────────────────
export interface Theatre {
  _id:          string;
  name:         string;
  description?: string;
  city:         string;
  state:        string;         
  pincode:      number;
  address:      string;
  owner?:       string;
  movies:       string[];
  totalScreens: number;        
  amenities:    string[];
  images:       string[];
  formats?:     ShowFormat[];   // formats of upcoming shows — only on list responses
  phone?:        string;
  openingHours?: string;
  screens?:      Screen[];
  amenityPhotos?: Record<string, string>;   // amenity label → photo URL
  menu?:        MenuItem[];
  location?:    GeoPoint | null;
  cancellationPolicy?: CancellationPolicy | null;
  pricingRules?: PricingRules | null;
  rating?:      TheatreRating;
  isActive?:    boolean;
  createdAt?:   string;
}

// ── SHOW ──────────────────────────────────────────────────
export type ShowFormat = "2D" | "3D" | "IMAX" | "4DX" | "Dolby Atmos"; 

export interface Show {
  _id:               string;
  theatreId:         Theatre | string;
  movieId:           Movie   | string;
  screen:            string;    //  "Screen 1", "Audi 2"
  showTime:          string;
  noOfSeats:         number;
  bookedSeats:       string[];  //  ["A1","B2"]
  price:             number;
  format:            ShowFormat;
  language:          string;    
  isActive?:         boolean;   
  seatConfiguration?: string;
  seatLayout?:       SeatLayout | null;   // null = legacy 8×10 single price
  tags?:             ShowTag[];
  priceAdjustments?: { label: string; pct: number }[];
  createdAt?:        string;
}

// ── BOOKING ───────────────────────────────────────────────
export type BookingStatus = "IN_PROCESS" | "SUCCESSFUL" | "CANCELLED" | "EXPIRED";

export interface Booking {
  _id:                   string;
  showId:                Show | string;
  userId?:               User | string;
  seats:                 string[];
  totalAmount:           number;
  subtotal?:             number;
  discount?:             number;
  primeApplied?:         boolean;
  lineItems?:            LineItem[];
  addOns?:               AddOn[];
  addOnsTotal?:          number;
  couponCode?:           string | null;
  couponDiscount?:       number;
  checkedInAt?:          string | null;
  bookingFee?:           number;
  bookingFeeGst?:        number;
  feeWaived?:            number;
  walletApplied?:        number;
  paidWith?:             "CARD" | "WALLET" | "MIXED";
  refundMethod?:         "SOURCE" | "WALLET" | null;
  status:                BookingStatus;
  stripePaymentIntentId?: string;
  stripeClientSecret?:   string;
  ticketCode?:           string;
  cancellationReason?:   string;
  cancelledAt?:          string;
  refundAmount?:         number;
  refundStatus?:         RefundStatus;
  createdAt?:            string;
  updatedAt?:            string;
}

export interface LineItem {
  category: string;
  label:    string;
  price:    number;
  seats:    string[];
}

export type RefundStatus = "NONE" | "PENDING" | "REFUNDED" | "FAILED";

export interface RefundQuote {
  cancellable:      boolean;
  refundPct:        number;
  refundAmount:     number;
  reason:           string;
  fullRefundUntil:  string | null;
  cancellableUntil: string | null;
  feeRetained?:     number;
  policy?:          CancellationPolicy;
}

export interface OrderQuote {
  lineItems:      LineItem[];
  subtotal:       number;
  discount:       number;          // Prime
  primeApplied:   boolean;
  addOns:         AddOn[];
  addOnsTotal:    number;
  couponCode:     string | null;
  couponDiscount: number;
  bookingFee:     number;
  bookingFeeGst:  number;
  feeWaived:      number;
  totalAmount:    number;
}

export type CouponType = "PERCENT" | "FLAT";

export interface Offer {
  code:        string;
  description: string;
  type:        CouponType;
  value:       number;
  maxDiscount: number;
  minAmount:   number;
  validUntil:  string | null;
}

export interface Coupon extends Offer {
  _id:          string;
  validFrom:    string | null;
  usageLimit:   number;
  perUserLimit: number;
  usedCount:    number;
  isActive:     boolean;
}

export interface CityOption { city: string; state?: string; theatres: number }

// ── API ───────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
  err?:    unknown;
}

// ── CREATE PAYLOADS ───────────────────────────────────────
export interface CreateMoviePayload {
  name:           string;
  description:    string;
  director:       string;
  casts:          string[];
  genre:          string[];
  languages:      string[];
  duration:       number;
  rating?:        number;
  certificate?:   MovieCertificate;
  releaseDate:    string;
  releaseStatus?: MovieReleaseStatus;
  posterUrl:      string;
  bannerUrl?:     string;
  trailerUrl:     string;
  images?:        string[];
}

export interface CreateTheatrePayload {
  name:          string;
  description?:  string;
  city:          string;
  state:         string;
  pincode:       number;
  address:       string;
  totalScreens:  number;
  amenities:     string[];
  images:        string[];
  phone?:        string;
  openingHours?: string;
  screens?:      Screen[];
  amenityPhotos?: Record<string, string>;
  menu?:          MenuItem[];
  location?:      GeoPoint | null;
  cancellationPolicy?: CancellationPolicy | null;
  pricingRules?:  PricingRules | null;
}

export interface CreateShowPayload {
  theatreId:          string;
  movieId:            string;
  screen:             string;
  showTime:           string;
  noOfSeats:          number;
  price:              number;
  format:             ShowFormat;
  language:           string;
  seatConfiguration?: string;
  categoryPrices?:    Record<string, number>;
  tags?:              ShowTag[];
  ignorePricingRules?: boolean;
}

// ── REVIEW ─────────────────────────────────────────────────
export interface Review {
 _id:       string;
  movieId:   { _id: string; name: string; posterUrl?: string } | string;
  userId:    { _id: string; name: string; avatar?: string }   | string;
  rating:    number;
  comment:   string;
  likes:     string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsResponse {
  reviews:             Review[];
  pagination:          { total: number; page: number; limit: number; totalPages: number };
  ratingDistribution:  { _id: number; count: number }[];
}

export interface LikeResponse {
  liked:      boolean;
  likesCount: number;
}

// ── UPLOAD ─────────────────────────────────────────────────
export interface UploadResponse {
  url:       string;
  publicId:  string;
  width?:    number;
  height?:   number;
  format?:   string;
  duration?: number;
}

// ── BOOKING INITIATE ───────────────────────────────────────
export interface InitiateBookingResponse {
  bookingId:    string;
  clientSecret: string;
  totalAmount:  number;
  subtotal?:    number;
  discount?:    number;
  primeApplied?: boolean;
  lineItems?:   LineItem[];
  addOns?:      AddOn[];
  addOnsTotal?: number;
  couponCode?:  string | null;
  couponDiscount?: number;
  bookingFee?:     number;
  bookingFeeGst?:  number;
  feeWaived?:      number;
  paidWithWallet?: boolean;
  walletApplied?:  number;
  cardAmount?:     number;
  seats:        string[];
  show: {
    name:     string;
    poster?:  string;
    duration?: number;
    theatre:  string;
    city:     string;
    address:  string;
    showTime: string;
    format:   string;
    language: string;
    screen:   string;
    price:    number;
  };
}

// ── PRIME PASS ─────────────────────────────────────────────
export interface PrimePlan {
  name:              string;
  price:             number;
  listPrice:         number;
  periodDays:        number;
  trialDays:         number;
  ticketDiscountPct: number;
  perks:             string[];
}

export interface PrimeMembership {
  active:             boolean;
  expiresAt:          string | null;
  since:              string | null;
  trialAvailable:     boolean;
  totalSaved:         number;
  discountedBookings: number;
}

export type PrimeSubscribeResponse =
  | { activated: true;  trial: true;  membership: PrimeMembership }
  | { activated: false; trial: false; clientSecret: string; paymentIntentId: string; amount: number };

// ── PLATFORM STATS ─────────────────────────────────────────
export interface PlatformStats {
  ticketsSold:   number;
  theatres:      number;
  screens:       number;
  cities:        number;
  moviesShowing: number;
  avgRating:     number;   // out of 10
  reviews:       number;
}

// ── THEATRE MOVIE REF ──────────────────────────────────────
// Theatre.movies can be string[] or Movie[] (populated)
export type MovieRef = string | { _id: string; name: string; posterUrl?: string };
// ── WATCHLIST / NOTIFICATIONS ─────────────────────────────
export interface WatchlistState { watchlist: string[]; notify: string[] }

export type NotificationType = "BOOKING_CONFIRMED" | "BOOKING_CANCELLED" | "SHOW_REMINDER" | "BOOKINGS_OPEN" | "SUPPORT_REPLY";

export interface AppNotification {
  _id:       string;
  type:      NotificationType;
  title:     string;
  body:      string;
  link:      string;
  image:     string;
  readAt:    string | null;
  createdAt: string;
}

export interface BulkShowResult {
  created: Show[];
  skipped: { showTime: string; reason: string }[];
}

export interface TheatreReview {
  _id:          string;
  theatreId:    string;
  userId:       { _id: string; name: string; avatar?: string } | string;
  rating:       number;
  cleanliness?: number;
  sound?:       number;
  seating?:     number;
  comment:      string;
  createdAt:    string;
  updatedAt?:   string;
}

export interface TheatreReviewsResponse {
  reviews:      TheatreReview[];
  summary:      TheatreRating;
  distribution: { star: number; count: number }[];
  pagination:   { page: number; total: number; totalPages: number };
}

// ── WALLET / GIFT CARDS ───────────────────────────────────
export interface WalletTxn {
  _id:          string;
  type:         "CREDIT" | "DEBIT";
  amount:       number;
  reason:       "REFUND" | "GIFT_CARD" | "BOOKING" | "BOOKING_RELEASED";
  note:         string;
  bookingId:    string | null;
  balanceAfter: number;
  createdAt:    string;
}

export interface GiftCard {
  _id:            string;
  code?:          string;
  amount:         number;
  status:         "PENDING" | "ACTIVE" | "REDEEMED";
  recipientName:  string;
  recipientEmail: string;
  message:        string;
  redeemedAt:     string | null;
  expiresAt:      string | null;
  createdAt:      string;
}

// ── PAYOUTS ───────────────────────────────────────────────
export interface PayoutFigures {
  bookings: number; tickets: number; sales: number; refunded: number; kept: number;
  commission: number; payout: number; bookingFees: number; promos: number;
}
export interface PayoutRow extends Omit<PayoutFigures, "bookings"> {
  bookingId: string; date: string; month: string; ticketCode: string; status: BookingStatus;
  theatre: string; movie: string; showTime: string | null;
}
export interface PayoutReport {
  commissionPct: number;
  totals:        PayoutFigures;
  months:        (PayoutFigures & { month: string })[];
  theatres:      (PayoutFigures & { theatreId: string; theatre: string })[];
  rows:          PayoutRow[];
}

// ── SUPPORT / AUDIT ───────────────────────────────────────
export type SupportCategory = "PAYMENT" | "REFUND" | "ENTRY" | "SHOW" | "FOOD" | "ACCOUNT" | "OTHER";
export type SupportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface SupportTicket {
  _id:       string;
  userId:    { _id: string; name: string; email: string } | string;
  bookingId: { _id: string; ticketCode?: string; seats: string[]; totalAmount?: number; status?: BookingStatus } | string | null;
  category:  SupportCategory;
  subject:   string;
  message:   string;
  status:    SupportStatus;
  replies:   { _id: string; name: string; staff: boolean; message: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  _id:       string;
  actor:     string;
  actorName: string;
  role:      string;
  action:    "CREATE" | "UPDATE" | "DELETE" | "STATUS" | "CHECK_IN" | "REPLY";
  entity:    string;
  entityId:  string;
  summary:   string;
  fields:    string[];
  createdAt: string;
}
