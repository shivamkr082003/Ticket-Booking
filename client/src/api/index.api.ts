import axios, { type AxiosError } from "axios";
import type {
  TheatreReview, TheatreReviewsResponse, TheatreRating, WalletTxn, GiftCard, PayoutReport,
  SupportTicket, SupportCategory, SupportStatus, AuditEntry,
  WatchlistState, AppNotification, BulkShowResult,
  ApiResponse, Movie, Theatre, Show, Booking, User,
  CreateMoviePayload, CreateTheatrePayload, CreateShowPayload,
  InitiateBookingResponse,
  ReviewsResponse,
  Review,
  LikeResponse,
  PrimePlan,
  PrimeMembership,
  PrimeSubscribeResponse,
  PlatformStats,
  RefundQuote,
  OrderQuote,
  Offer,
  Coupon,
  CityOption,
} from "../types/movie.types.ts";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cv_token");
  if (token) config.headers["x-access-token"] = token;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cv_token");
      localStorage.removeItem("cv_user");
      window.location.replace("/login");
    }

    const data = error.response?.data as Record<string, unknown> | undefined;

    // Extract most specific error message available
    let msg = "Something went wrong. Please try again.";

    if (data) {
      // 1. Zod validation — err is array of issues
      if (Array.isArray(data.err) && data.err.length > 0) {
        const issue = data.err[0] as Record<string, unknown>;
        const field = Array.isArray(issue.path) && issue.path.length > 0
          ? String(issue.path[issue.path.length - 1])
          : null;
        const message = String(issue.message ?? "Validation failed");
        msg = field ? `${field}: ${message}` : message;
      }
      // 2. Plain string error
      else if (typeof data.err === "string" && data.err) {
        msg = data.err;
      }
      // 3. Object with field errors { field: "message" }
      else if (typeof data.err === "object" && data.err !== null && !Array.isArray(data.err)) {
        const firstErr = Object.values(data.err as Record<string, string>)[0];
        if (firstErr) msg = firstErr;
      }
      // 4. message field fallback
      else if (typeof data.message === "string" && data.message && data.message !== "Internal server error") {
        msg = data.message;
      }
    }

    // HTTP status specific messages as fallback
    if (msg === "Something went wrong. Please try again.") {
      const status = error.response?.status;
      if (status === 400) msg = "Invalid request. Please check your input.";
      if (status === 401) msg = "Invalid credentials. Please try again.";
      if (status === 403) msg = "You don't have permission to do this.";
      if (status === 404) msg = "Resource not found.";
      if (status === 409) msg = "This already exists. Please use a different value.";
      if (status === 422) msg = "Validation failed. Please check your input.";
      if (status === 429) msg = "Too many requests. Please wait a moment.";
    }

    return Promise.reject(new Error(msg));
  }
);

// ── low-level helpers ──────────────────────────────────────
// Returns data.data — the actual payload
const rawGet  = async <T>(url: string, params?: object): Promise<T> =>
  (await api.get<ApiResponse<T>>(url, { params })).data.data;
const rawPost = async <T>(url: string, body?: unknown): Promise<T> =>
  (await api.post<ApiResponse<T>>(url, body)).data.data;
const rawPatch= async <T>(url: string, body?: unknown): Promise<T> =>
  (await api.patch<ApiResponse<T>>(url, body)).data.data;
const rawPut  = async <T>(url: string, body?: unknown): Promise<T> =>
  (await api.put<ApiResponse<T>>(url, body)).data.data;
const rawDel  = async <T = void>(url: string): Promise<T> =>
  (await api.delete<ApiResponse<T>>(url)).data.data;

// ── smart extractor: handles both array AND { movies:[] } shapes ─
function extractArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj[key]))      return obj[key] as T[];
    if (Array.isArray(obj["data"]))   return obj["data"] as T[];
    // paginated: { movies: [], pagination: {} }
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (Array.isArray(obj[k])) return obj[k] as T[];
    }
  }
  return [];
}

// ── AUTH ──────────────────────────────────────────────────
export const authApi = {
  signup: (name: string, email: string, password: string, role: string, phone?: string, avatar?: string) =>
    rawPost<{ userId: string; email: string; name: string }>("/auth/signup", { name, email, password, userRole: role, phone, avatar }),
  verifyOtp: (userId: string, otp: string) =>
    rawPost<void>("/auth/verify-otp", { userId, otp }),
  resendOtp: (userId: string) =>
    rawPost<void>("/auth/resend-otp", { userId }),
  signin: (email: string, password: string) =>
    rawPost<{ user: User; token: string }>("/auth/signin", { email, password }),
  resetPassword: (oldPassword: string, newPassword: string) =>
    rawPatch<void>("/auth/reset", { oldPassword, newPassword }),
};

// ── MOVIES ────────────────────────────────────────────────
export const moviesApi = {
  // Returns Movie[] regardless of backend shape
  getAll:    async (params?: object) => extractArray<Movie>(await rawGet<unknown>("/movies", params), "movies"),
  getById:   (id: string) => rawGet<Movie>(`/movies/${id}`),
  similar:   (id: string, limit = 8) => rawGet<Movie[]>(`/movies/${id}/similar`, { limit }),
  create:    (data: CreateMoviePayload) => rawPost<Movie>("/movies", data),
  update:    (id: string, data: Partial<CreateMoviePayload>) => rawPatch<Movie>(`/movies/${id}`, data),
  delete:    (id: string) => rawDel(`/movies/${id}`),
  setStatus: (id: string, isActive: boolean) => rawPatch<Movie>(`/movies/${id}/status`, { isActive }),
};

// ── THEATRES ──────────────────────────────────────────────
export const theatresApi = {
  getAll:      async (params?: object) => extractArray<Theatre>(await rawGet<unknown>("/theatres", params), "theatres"),
  getById:     (id: string) => rawGet<Theatre>(`/theatres/${id}`),
  cities:      () => rawGet<CityOption[]>("/theatres/cities"),
  reviews:     (id: string, page = 1) => rawGet<TheatreReviewsResponse>(`/theatres/${id}/reviews`, { page }),
  myReview:    (id: string) => rawGet<{ review: TheatreReview | null; canReview: boolean }>(`/theatres/${id}/reviews/me`),
  saveReview:  (id: string, data: { rating: number; cleanliness?: number; sound?: number; seating?: number; comment?: string }) =>
                 rawPut<{ review: TheatreReview; summary: TheatreRating }>(`/theatres/${id}/reviews/me`, data),
  deleteReview:(id: string) => rawDel<{ summary: TheatreRating }>(`/theatres/${id}/reviews/me`),
  create:      (data: CreateTheatrePayload) => rawPost<Theatre>("/theatres", data),
  update:      (id: string, data: Partial<CreateTheatrePayload>) => rawPatch<Theatre>(`/theatres/${id}`, data),
  delete:      (id: string) => rawDel(`/theatres/${id}`),
  setStatus:   (id: string, isActive: boolean) => rawPatch<Theatre>(`/theatres/${id}/status`, { isActive }),
  addMovie:    (theatreId: string, movieId: string) =>
                 rawPatch<Theatre>(`/theatres/${theatreId}/movies`, { movieIds: [movieId], insert: true }),
  removeMovie: (theatreId: string, movieId: string) =>
                 rawPatch<Theatre>(`/theatres/${theatreId}/movies`, { movieIds: [movieId], insert: false }),
};

// ── SHOWS ─────────────────────────────────────────────────
export const showsApi = {
  getAll:               async (params?: object) => extractArray<Show>(await rawGet<unknown>("/shows", params), "shows"),
  getById:              (id: string) => rawGet<Show>(`/shows/${id}`),
  getByMovie:           (movieId: string) => showsApi.getAll({ movieId }),
  getByTheatre:         (theatreId: string) => showsApi.getAll({ theatreId }),
  getByMovieAndTheatre: (movieId: string, theatreId: string) => showsApi.getAll({ movieId, theatreId }),
  create:               (data: CreateShowPayload) => rawPost<Show>("/shows", data),
  update:               (id: string, data: Partial<CreateShowPayload>) => rawPatch<Show>(`/shows/${id}`, data),
  delete:               (id: string) => rawDel(`/shows/${id}`),
  setStatus:            (id: string, isActive: boolean) => rawPatch<Show>(`/shows/${id}/status`, { isActive }),
  bulkCreate:           (data: Omit<CreateShowPayload, "showTime"> & { showTimes: string[] }) =>
                          rawPost<BulkShowResult>("/shows/bulk", data),
};

// ── ME: watchlist + notifications ─────────────────────────
export const meApi = {
  watchlist:       () => rawGet<WatchlistState>("/me/watchlist"),
  watchlistMovies: () => rawGet<{ movies: Movie[]; notify: string[] }>("/me/watchlist/movies"),
  mergeWatchlist:  (ids: string[]) => rawPost<WatchlistState>("/me/watchlist/merge", { ids }),
  watch:           (movieId: string) => rawPut<WatchlistState>(`/me/watchlist/${movieId}`),
  unwatch:         (movieId: string) => rawDel<WatchlistState>(`/me/watchlist/${movieId}`),
  notifyOn:        (movieId: string) => rawPut<WatchlistState>(`/me/notify/${movieId}`),
  notifyOff:       (movieId: string) => rawDel<WatchlistState>(`/me/notify/${movieId}`),
};

export const walletApi = {
  get:    () => rawGet<{ balance: number; transactions: WalletTxn[] }>("/wallet"),
  redeem: (code: string) => rawPost<{ amount: number; balance: number }>("/wallet/redeem", { code }),
};

export const giftCardsApi = {
  mine:     () => rawGet<GiftCard[]>("/gift-cards/mine"),
  purchase: (data: { amount: number; recipientName?: string; recipientEmail?: string; message?: string }) =>
              rawPost<{ giftCardId: string; clientSecret: string; amount: number }>("/gift-cards/purchase", data),
  confirm:  (giftCardId: string, paymentIntentId: string) => rawPost<GiftCard>("/gift-cards/confirm", { giftCardId, paymentIntentId }),
};

export const supportApi = {
  create: (data: { category: SupportCategory; subject: string; message: string; bookingId?: string }) =>
            rawPost<SupportTicket>("/support", data),
  mine:   () => rawGet<SupportTicket[]>("/support/mine"),
  reply:  (id: string, data: { message?: string; status?: SupportStatus }) => rawPatch<SupportTicket>(`/support/${id}`, data),
  all:    (status?: SupportStatus) => rawGet<{ items: SupportTicket[]; open: number; pagination: { page: number; total: number; totalPages: number } }>("/support", status ? { status } : undefined),
};

export const auditApi = {
  list: (params: { entity?: string; page?: number } = {}) =>
          rawGet<{ items: AuditEntry[]; pagination: { page: number; total: number; totalPages: number } }>("/audit-logs", params),
};

export const payoutsApi = {
  get: (months = 6) => rawGet<PayoutReport>("/payouts", { months }),
};

export const notificationsApi = {
  list:    () => rawGet<{ items: AppNotification[]; unread: number }>("/notifications"),
  read:    (id: string) => rawPatch<AppNotification>(`/notifications/${id}/read`),
  readAll: () => rawPatch<{ updated: number }>("/notifications/read-all"),
};

// ── BOOKINGS ──────────────────────────────────────────────
export const bookingsApi = {
  initiate:      (showId: string, seats: string[], extras: { addOns?: { itemId: string; qty: number }[]; couponCode?: string | null; useWallet?: boolean } = {}) =>
                   rawPost<InitiateBookingResponse>("/bookings/initiate", { showId, seats, ...extras }),
  quote:         (showId: string, seats: string[], extras: { addOns?: { itemId: string; qty: number }[]; couponCode?: string | null } = {}) =>
                   rawPost<OrderQuote>("/bookings/quote", { showId, seats, ...extras }),
  checkIn:       (ticketCode: string) => rawPost<Booking>("/bookings/check-in", { ticketCode }),
  confirm:       (bookingId: string, stripePaymentIntentId: string) =>
                   rawPost<Booking>("/bookings/confirm", { bookingId, stripePaymentIntentId }),
  refundQuote:   (bookingId: string) => rawGet<RefundQuote>(`/bookings/${bookingId}/refund-quote`),
  cancel:        (bookingId: string, cancellationReason?: string, refundTo: "SOURCE" | "WALLET" = "SOURCE") =>
                   rawPost<Booking>("/bookings/cancel", { bookingId, cancellationReason, refundTo }),
  getMyBookings: async () => extractArray<Booking>(await rawGet<unknown>("/bookings/my"), "bookings"),
  getById:       (id: string) => rawGet<Booking>(`/bookings/${id}`),
  getAll:        async () => extractArray<Booking>(await rawGet<unknown>("/bookings"), "bookings"),
  // Dashboard feed — every booking for admins, own theatres only for theatre owners
  getForOwner:   async () => extractArray<Booking>(await rawGet<unknown>("/bookings/owner"), "bookings"),
};

// ── normalize raw backend user → frontend User type ──────
function normalizeUser(u: Record<string, unknown>): User {
  const rawRole   = u.userRole   ?? u.role   ?? "CUSTOMER";
  const rawStatus = u.userStatus ?? u.status ?? "PENDING";
  return {
    id:         String(u._id ?? u.id ?? ""),
    _id:        String(u._id ?? u.id ?? ""),
    name:       String(u.name  ?? ""),
    email:      String(u.email ?? ""),
    phone:      u.phone  ? String(u.phone)  : undefined,
    avatar:     u.avatar ? String(u.avatar) : undefined,
    userRole:   String(rawRole).toUpperCase().trim()   as User["userRole"],
    userStatus: String(rawStatus).toUpperCase().trim() as User["userStatus"],
    createdAt:  u.createdAt ? String(u.createdAt) : undefined,
    primeExpiresAt: u.primeExpiresAt ? String(u.primeExpiresAt) : null,
    isPrime:    u.primeExpiresAt ? new Date(String(u.primeExpiresAt)) > new Date() : false,
  };
}

// ── USERS ─────────────────────────────────────────────────
export const usersApi = {
  getAll: async (params?: object) => {
    const raw = extractArray<Record<string, unknown>>(
      await rawGet<unknown>("/users", params), "users"
    );
    return raw.map(normalizeUser);
  },
  getById: async (id: string) => normalizeUser(
    await rawGet<Record<string, unknown>>(`/users/${id}`)
  ),
  updateStatus: (id: string, status: "APPROVED" | "PENDING" | "REJECTED") =>
                  rawPatch<User>(`/users/${id}`, { userStatus: status }),
  updateRole:   (id: string, role: string) => rawPatch<User>(`/users/${id}`, { userRole: role }),
  delete:       (id: string) => rawDel(`/users/${id}`),
};

// ── aliases ────────────────────────────────────────────────
export const loginUser       = authApi.signin;
export const signupUser      = authApi.signup;
export const getMovies       = moviesApi.getAll;
export const getShows        = showsApi.getAll;
export const createBooking   = bookingsApi.initiate;
export const getUserBookings = bookingsApi.getMyBookings;

// ── REVIEWS ───────────────────────────────────────────────
export const reviewsApi = {
  getTop:      (limit = 6) => rawGet<Review[]>("/reviews/top", { limit }),
  getByMovie:  (movieId: string, page = 1) =>
                 rawGet<ReviewsResponse>(`/movies/${movieId}/reviews?page=${page}`),
  getMyReview: (movieId: string) =>
                 rawGet<Review | null>(`/movies/${movieId}/reviews/my`),
  create:      (data: { movieId: string; rating: number; comment: string }) =>
                 rawPost<Review>("/reviews", data),
  update:      (id: string, data: { rating?: number; comment?: string }) =>
                 rawPatch<Review>(`/reviews/${id}`, data),
  delete:      (id: string) =>
                 rawDel<void>(`/reviews/${id}`),
  toggleLike:  (id: string) =>
                 rawPost<LikeResponse>(`/reviews/${id}/like`, {}),
};

// ── PRIME PASS ────────────────────────────────────────────
export const primeApi = {
  getPlan:   () => rawGet<PrimePlan>("/prime/plan"),
  getMine:   () => rawGet<PrimeMembership>("/prime/me"),
  subscribe: () => rawPost<PrimeSubscribeResponse>("/prime/subscribe"),
  confirm:   (paymentIntentId: string) =>
               rawPost<PrimeMembership>("/prime/confirm", { paymentIntentId }),
};

// ── OFFERS / COUPONS ──────────────────────────────────────
export type CouponPayload = Omit<Coupon, "_id" | "usedCount">;

export const offersApi = {
  list: () => rawGet<Offer[]>("/offers"),
};

export const couponsApi = {
  getAll: () => rawGet<Coupon[]>("/coupons"),
  create: (data: CouponPayload) => rawPost<Coupon>("/coupons", data),
  update: (id: string, data: Partial<CouponPayload>) => rawPatch<Coupon>(`/coupons/${id}`, data),
  delete: (id: string) => rawDel(`/coupons/${id}`),
};

// ── PLATFORM STATS ────────────────────────────────────────
export const statsApi = {
  get: () => rawGet<PlatformStats>("/stats"),
};

// ── USER PROFILE ──────────────────────────────────────────
export const profileApi = {
  updateProfile:  (data: { name: string; phone?: string; avatar?: string }) =>
                    rawPatch<User>("/users/profile", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
                    rawPatch<void>("/users/change-password", data),
};