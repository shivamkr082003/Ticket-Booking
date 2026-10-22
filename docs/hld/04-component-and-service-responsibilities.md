# 04 · Component and service responsibilities

[← Back to index](README.md)

All components below exist in the repository. "Deployed as" says where the code runs; the backend modules are folders inside **one** process.

## Backend (`server/`) — deployed as one Render web service

### Entry points and infrastructure

| File | Responsibility |
|---|---|
| `index.js` | Process bootstrap: DB connection, middleware chain, routers, Redis, Socket.io, `listen`, two `setInterval` jobs. |
| `config/db.js` | `mongoose.connect(MONGODB_URI, { family: 4 })`, with Google DNS (8.8.8.8) forced via `dns.setServers`. |
| `config/redis.js` | Three node-redis clients: `pubClient`, `subClient` (Socket.io adapter) and `redisClient` (cache and seat locks). |
| `socket.js` | Socket.io server, Redis adapter, seat-lock events (see [03 §6](03-current-system-architecture.md#6-real-time-subsystem)). Exposes `emitBookingConfirmed`, `emitBookingCancelled`. |

### Middleware

| Middleware | File | Responsibility |
|---|---|---|
| `isAuthenticated` | `auth.middleware.js` | Verifies the JWT from `x-access-token`, loads `req.user` and `req.userId`. |
| `isAdmin`, `isAdminOrClient`, `isClient` | `auth.middleware.js` | Role checks (role only, not status). `isClient` is not used by any route. |
| `validateSignupRequest`, `validateSigninRequest`, `validateResetPasswordRequest` | `auth.middleware.js` | Presence checks only (no format rules). |
| `ownsTheatreParam`, `ownsTheatreInBody`, `ownsShowParam` | `ownership.middleware.js` | Owners can only touch their own theatres and shows; admins bypass. |
| `validate(schema)` | `validation.middleware.js` | Zod `safeParse` of `req.body`; replaces the body with parsed data. |
| `validateUpdateUserRequest` | `user.middleware.js` | Requires `userRole` or `userStatus` on admin user updates. |
| `auditTrail` | `audit.middleware.js` | After a successful staff write (ADMIN/CLIENT, status < 400) on 20 route patterns, inserts an `AuditLog` without blocking the response. |
| `optionalAuth` | `upload.routes.js` (inline) | Attaches a user if a valid token is present; never rejects. |

### Services (business logic)

| Service | Responsibility | Key collaborators |
|---|---|---|
| `booking.service.js` | Initiate (transaction + seat reservation + PaymentIntent), confirm, cancel/refund, check-in, refund quote, order quote, list bookings, stale-booking expiry. | `pricing`, `wallet`, `stripe`, `notification`, `email`, `socket.js`, `utils/refundPolicy` |
| `pricing.service.js` | `quoteOrder`: seat categories, Prime discount, food, coupon, booking fee + GST. `validateCoupon`, `resolveAddOns`, `bookingFeeFor`. | `utils/seatLayout` |
| `show.service.js` | Create (single/bulk), update, deactivate, delete, list, get. Takes the layout/price snapshot and applies dynamic pricing. | `utils/seatLayout`, `utils/dynamicPricing`, `notification` |
| `theatre.service.js` | Theatre CRUD, cities list, movies in a theatre, layout validation. | `utils/seatLayout` |
| `movie.service.js` | Movie CRUD, cached list/detail, similar movies, "new movie" email fan-out. | `cache.service`, `email.service` |
| `cache.service.js` | Generic `getOrSetCache`, movie list/detail cache, versioned list invalidation. | Redis |
| `wallet.service.js` | Ledger primitives (`creditWallet`, `debitWallet` with non-negative guard), gift card purchase/confirm/redeem. | Stripe, `email.service` |
| `prime.service.js` | Plan info, membership view (savings aggregate), trial activation, paid period confirmation. | Stripe |
| `notification.service.js` | In-app notifications, "bookings open" fan-out, show reminders job. | `email.service` |
| `email.service.js` | HTML email templates; transport = Gmail API (if `GMAIL_REFRESH_TOKEN`) else Nodemailer Gmail SMTP. | Gmail |
| `support.service.js` | Support tickets, replies, audit log listing. | `notification` |
| `payout.service.js` | Per-theatre monthly sales, refunds, 10 % commission, payout figures (report only). | `bookings` aggregation |
| `stats.service.js` | Platform counters for the landing page (cached 5 min, falls back to DB if Redis fails). | `cache.service` |
| `review.service.js`, `theatreReview.service.js` | Reviews, likes, cached average ratings; theatre reviews require a past successful booking. | — |
| `watchlist.service.js` | Watchlist and notify-me arrays on `User`. | — |
| `user.service.js` | Create user (role/status rules), lookups, admin updates, profile, password change. | — |
| `stripe.service.js`, `cloudinary.service.js` | Lazily constructed SDK clients and upload helpers. | — |

### Pure utilities

| File | Responsibility |
|---|---|
| `utils/seatLayout.js` | Layout validation, seat id parsing (`A1`–`Z40`), per-category pricing (`priceSeats`), snapshotting a screen into a show. |
| `utils/dynamicPricing.js` | IST-based weekend/morning/prime-time/opening-day % adjustments, clamped to −50 %…+100 %. |
| `utils/refundPolicy.js` | `refundQuote()`: refund tiers, Prime perk, fee retention, theatre overrides. Pure and unit-tested. |
| `utils/constants.js` | Status enums, roles, Prime plan, booking fee, gift card limits, commission, cancellation policy. |
| `utils/response.utils.js` | Shared response objects (see risk M1) and `handleValidationError`. |

## Frontend (`client/`) — deployed as static files on Vercel

| Area | Responsibility |
|---|---|
| `App.tsx` | Route table (one active `<Routes>` tree; an older version is commented out), lazy-loaded pages (`React.lazy`), protected routes. |
| `api/index.api.ts` | Single Axios instance with the base URL from `VITE_API_BASE_URL`; adds the JWT header; on 401 clears storage and redirects to `/login`; typed API objects per domain. |
| `context/AuthContext.tsx` | Holds the token and user (`localStorage` keys `cv_token`, `cv_user`). |
| `context/SocketContext.tsx` | Opens one Socket.io connection per logged-in session. |
| `hooks/useShowSocket.ts` | Joins a show room, tracks `tempBlocked` and `bookedSeats`, emits selecting/deselecting. |
| `pages/booking/SeatSelectionPage` | Seat grid, food step, live quote, `bookingsApi.initiate`, navigation to payment. |
| `pages/booking/PaymentPage` + `components/booking/PaymentForm` | Stripe Elements, `stripe.confirmPayment`, `bookingsApi.confirm`. |
| `pages/booking/TicketPage` | Ticket with QR, print, split bill. |
| `pages/booking/MyBookingsPage` + `components/booking/BookingCard` | Booking list, refund quote dialog, cancel. |
| `pages/admin/AdminPanel`, `ClientPanel` + `components/dashboard/**` | Admin and owner dashboards (movies, theatres, shows, bookings, offers, support, analytics, activity). |
| `utils/*` | Client-side helpers (fees display, city storage, geolocation, theatre stock photos). |

## Tests (`server/tests/`)

| Suite | `describe` blocks (verbatim) |
|---|---|
| `booking.service.test.js` | initiateBookingService, confirmBookingService, cancelBookingService, expireStaleBookingsService, getOwnerBookingsService |
| `checkout-and-ownership.test.js` | order pricing, ticket check-in, ownership & cities |
| `engagement.test.js` | watchlist, notifications, bulk show scheduling |
| `prime.service.test.js` | subscribePrimeService, confirmPrimeService, getPrimeStatusService |
| `refunds-and-layouts.test.js` | refund policy on cancellation, seat categories, screens on shows, theatre photos |
| `support-and-audit.test.js` | support tickets, audit trail |
| `theatre-features.test.js` | dynamic pricing rules, per-theatre cancellation policy, wheelchair spaces, theatre reviews |
| `wallet-and-payouts.test.js` | paying with the wallet, gift cards, owner payouts |

Tests run against `MongoMemoryReplSet` (single-node replica set, so transactions work) with a mocked Stripe client (`tests/setup/mockStripe.js`). Redis, Socket.io and email are not exercised.

**Not found in repository:** frontend tests, route-level (HTTP) tests, Socket.io tests, and end-to-end tests.
