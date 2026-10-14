export const STATUS_CODES = {
    OK: 200,
    INTERNAL_SERVER_ERROR: 500,
    CREATED: 201,
    UNAUTHORISED: 401,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    GONE: 410,
    PAYMENT_REQUIRED: 402
}

export const USER_STATUS = {
    approved: "APPROVED",
    pending: "PENDING",
    rejected: "REJECTED"
};

export const USER_ROLE = {
    customer: "CUSTOMER",
    admin: "ADMIN",
    client: "CLIENT"
}

export const BOOKING_STATUS = {
    cancelled: "CANCELLED",
    successful: "SUCCESSFUL",
    processing: "IN_PROCESS",
    expired: "EXPIRED"
}

// Cineverse Prime Pass — single plan, billed per 30-day period (no auto-renewal)
export const PRIME_PLAN = {
    name: "Cineverse Prime Pass",
    price: 799,              // ₹ per period
    listPrice: 1299,         // ₹ shown struck-through
    periodDays: 30,
    trialDays: 30,           // first period is free, once per account
    ticketDiscountPct: 15,   // applied server-side on every booking
    currency: "inr",
}

export const SHOW_FORMATS = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"]

// Refund tiers, measured from showtime (see utils/refundPolicy.js)
// Convenience fee per ticket + GST on that fee. Prime members don't pay it.
// Non-refundable on customer cancellations (refunded in full if the show is pulled).
export const BOOKING_FEE = {
    perTicket: 25,
    gstPct:    18,
}

export const GIFT_CARD = {
    amounts:   [500, 1000, 2000, 5000],   // suggested denominations
    min:       100,
    max:       10000,
    validDays: 365,
}

// Share of each owner's kept sales (tickets + food) the platform keeps
export const PLATFORM_COMMISSION_PCT = 10;

export const CANCELLATION_POLICY = {
    fullRefundHours:   24,   // ≥ 24h before → 100%
    cancelCutoffHours: 2,    // < 2h before → no cancellations
    partialRefundPct:  50,   // in between → 50% (Prime members still get 100%)
}

export const REFUND_STATUS = {
    none:     "NONE",
    pending:  "PENDING",
    refunded: "REFUNDED",
    failed:   "FAILED",
}

export const isPrimeActive = (user) =>
    Boolean(user?.primeExpiresAt && new Date(user.primeExpiresAt) > new Date())