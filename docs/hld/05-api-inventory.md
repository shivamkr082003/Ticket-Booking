# 05 · API inventory

[← Back to index](README.md)

All routes are mounted under **`/api/v1`** in `server/index.js`, except `GET /` and `GET /health`. This inventory lists **90 `/api/v1` routes** from `server/routes/*.js`; no endpoint has been added that isn't in the code.

## Conventions

| Item | Behaviour (as implemented) |
|---|---|
| Auth header | `x-access-token: <JWT>` (not `Authorization: Bearer`). |
| Auth legend | **Public** · **User** = `isAuthenticated` · **Admin** = `+ isAdmin` · **Staff** = `+ isAdminOrClient` · **Owner** = `+ ownership middleware` (admins bypass) |
| Success body | `{ success: true, message, err: {}, data }` |
| Error body | `{ success: false, message, err, data }`. `err` is a string, a field map (Mongoose `ValidationError` → 422) or a Zod `flatten()` object (400). |
| Common status codes | 200, 201, 400 (validation / business rule), 401 (bad JWT, some role guards), 403 (no token, wrong role, not owner), 404, 409 (seat conflict, concurrent change), 422 (Mongoose validation), 429 (rate limit), 500 |
| Rate limits | 300 req / 15 min per IP on everything; 20 / 15 min on `/auth/signin`, `/auth/signup`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/reset`. Skipped when `LOAD_TEST=true`. |
| Pagination | Only on some lists (`/movies`, `/theatres`, `/users`, `/bookings`, reviews). `/shows` has **none**. |

**Verified limitations:**
- An **expired** JWT produces **500**, not 401. `isAuthenticated` only maps `JsonWebTokenError` to 401, and `TokenExpiredError` has a different `name`. The client only logs users out on 401.
- `isAdminOrClient` returns **401** (not 403) for customers.

## Platform

| Method | Path | Handler | Auth | Notes |
|---|---|---|---|---|
| GET | `/` | inline | Public | Text "API is running..." |
| GET | `/health` | inline | Public | `{status:"ok"}`; does not check MongoDB or Redis |
| GET | `/api/v1/stats` | `stats.controller.getPlatformStats` | Public | Tickets sold, theatres, screens, cities, movies showing, average rating. Redis-cached 5 min with DB fallback. |

## Auth — `auth.routes.js` → `auth.controller.js`

| Method | Path | Auth | Request | Response `data` | Tables | Notes |
|---|---|---|---|---|---|---|
| POST | `/auth/signup` | Public (+ auth rate limit) | `name, email, password` + optional `phone, avatar` — **any other `User` field is also accepted** | `{userId, email, name}` (201) | users | Deletes any previous unverified user with that email, stores a 6-digit OTP (10 min), emails it. See [C1](11-security-review.md#c1-signup-mass-assignment-leads-to-privilege-escalation). |
| POST | `/auth/verify-otp` | Public | `userId, otp` | `null` | users | 400 invalid/expired OTP |
| POST | `/auth/resend-otp` | Public (+ auth rate limit) | `userId` | message | users | New OTP (10 min) + email |
| POST | `/auth/signin` | Public | `email, password` | `{token, user{…, userRole, userStatus, isPrime}}` | users | 401 wrong password; 403 REJECTED or unverified. JWT `{id,email}`, 24 h, HS256 with `AUTH_KEY`. |
| PATCH | `/auth/reset` | User | `oldPassword, newPassword` | user | users | Logged-in password change (not a forgot-password flow) |

## Users — `user.routes.js` → `user.controller.js`

| Method | Path | Auth | Request | Notes |
|---|---|---|---|---|
| PATCH | `/users/profile` | User | `name, phone, avatar` | Own profile |
| PATCH | `/users/change-password` | User | old/new password | |
| GET | `/users` | Admin | query filters, pagination | |
| GET | `/users/:id` | Admin | | |
| PATCH | `/users/:id` | Admin | `userRole` and/or `userStatus` | Approve/reject owners; audited |
| DELETE | `/users/:id` | Admin | | Audited. Related bookings/theatres are not cleaned up. |

## Movies — `movie.routes.js` → `movie.controller.js` / `movie.service.js`

| Method | Path | Auth | Request | Response `data` | Notes |
|---|---|---|---|---|---|
| GET | `/movies` | Public | query: `name, genre, languages, releaseStatus, certificate, isActive, page, limit (≤100), sortBy, order` | `{movies[], pagination}` | Redis cache-aside, key = version + md5(sorted query), TTL 300 s. A Redis error makes this endpoint return 500. |
| GET | `/movies/:id` | Public | | movie | Cached 1 h |
| GET | `/movies/:id/similar` | Public | `limit` | movies[] | Inline handler in the route file |
| POST | `/movies` | Admin | `movieCreateSchema` (name, description, casts, trailerUrl, languages, releaseDate, duration, posterUrl, genre, director, …) | movie (201) | Invalidates list cache; **emails every APPROVED user** |
| PATCH | `/movies/:id` | Admin | `movieUpdateSchema` (partial) | movie | Verified: Zod injects `certificate:"UA"`, `releaseStatus:"COMING_SOON"` when the fields are omitted |
| PATCH | `/movies/:id/status` | Admin | `releaseStatus` / `isActive` | movie | |
| DELETE | `/movies/:id` | Admin | | deleted movie | **Hard delete** (`findByIdAndDelete`); shows, reviews and theatre references to it are not cleaned up. Cache invalidated. |

## Theatres — `theatre.routes.js` → `theatre.controller.js` / `theatre.service.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/theatres` | Public | Filters `name, city, state, pincode, movieId, format, isActive, page, limit` |
| GET | `/theatres/cities` | Public | Distinct cities with counts |
| GET | `/theatres/:id` | Public | Full document incl. screens, menu |
| GET | `/theatres/:id/movies` | Public | Movies attached to the theatre |
| GET | `/theatres/:theatreId/movies/:movieId` | Public | Is the movie available here? |
| GET | `/theatres/:id/reviews` | Public | Paginated reviews + rating summary + distribution |
| GET | `/theatres/:id/reviews/me` | User | |
| PUT | `/theatres/:id/reviews/me` | User | `rating, cleanliness, sound, seating, comment`; requires a past successful booking (`hasVisited`) |
| DELETE | `/theatres/:id/reviews/me` | User | Recomputes cached rating |
| POST | `/theatres` | Staff | `theatreCreateSchema`; `owner` is forced to the caller. Audited. |
| PATCH | `/theatres/:id` | Staff + Owner | `theatreUpdateSchema` (= create schema `.partial()`). Accepts `owner` (ownership transfer). Injects `totalScreens:1, amenities:[], images:[]` when omitted (verified). |
| PATCH | `/theatres/:id/movies` | Staff + Owner | `{movieIds[], insert}` |
| PATCH | `/theatres/:id/status` | Staff + Owner | Soft delete/restore |
| DELETE | `/theatres/:id` | Admin | Hard delete. Shows and bookings are not touched. |

## Shows — `show.routes.js` → `show.controller.js` / `show.service.js`

| Method | Path | Auth | Request | Response `data` | Notes |
|---|---|---|---|---|---|
| GET | `/shows` | Public | query `theatreId, movieId, screen, format, language, isActive, date, upcoming` | shows[] with **full** `theatreId` and `movieId` documents | **No pagination or projection.** Measured on production 17 Oct 2026: `upcoming=true` 0.63 MB gzip in 11.8 s; all shows 1.71 MB in 31.2 s. |
| GET | `/shows/:id` | Public | | show (populated) | Used by the seat page |
| POST | `/shows` | Staff + Owner(body) | `createShowSchema` | show (201) | Movie must be attached to the theatre. **No overlap check.** Applies dynamic pricing and snapshots the layout. |
| POST | `/shows/bulk` | Staff + Owner(body) | `showTimes[]` (≤120) + show fields | `{created[], skipped[]}` | Skips past times and overlaps (movie duration + 20 min turnaround) |
| PATCH | `/shows/:id` | Staff + Owner(show) | `updateShowSchema` (= create `.partial()`) | show | **Verified critical bug:** schema defaults inject `bookedSeats: []` and `isActive: true`, so editing a show wipes sold seats ([C2](11-security-review.md#c2-show-edit-wipes-sold-seats)). |
| PATCH | `/shows/:id/status` | Staff + Owner(show) | `isActive` | show | No effect on existing bookings |
| DELETE | `/shows/:id` | Staff + Owner(show) | | deleted show | Hard delete; bookings are orphaned |

## Bookings — `booking.routes.js` → `booking.controller.js` / `booking.service.js`

| Method | Path | Auth | Request (Zod) | Response `data` | Status codes | Tables / services |
|---|---|---|---|---|---|---|
| POST | `/bookings/quote` | User | `showId, seats[] (≤10), addOns[], couponCode` | `{subtotal, discount, lineItems, addOns, addOnsTotal, couponCode, couponDiscount, bookingFee, bookingFeeGst, feeWaived, totalAmount}` | 200, 400, 404 | shows, coupons, bookings (coupon usage) |
| POST | `/bookings/initiate` | User | `showId, seats[1..10], addOns[], couponCode, useWallet` | `{bookingId, clientSecret, paidWithWallet, walletApplied, cardAmount, totalAmount, …, seats, show{…}}` | 201, 400, 404, 409 | **Transaction:** shows, bookings, users, wallettxns; Stripe PaymentIntent |
| POST | `/bookings/confirm` | User | `bookingId, stripePaymentIntentId` | populated booking with `ticketCode` | 200, 400 | Stripe retrieve; transaction on bookings; coupons; Socket.io; notifications; email |
| POST | `/bookings/cancel` | User (own booking) | `bookingId, cancellationReason?, refundTo: SOURCE\|WALLET` | cancelled booking | 200, 400, 409 | Transaction: bookings, shows, users, wallettxns; then Stripe cancel/refund |
| GET | `/bookings/:id/refund-quote` | User (own booking) | | `{cancellable, refundPct, refundAmount, feeRetained, reason, fullRefundUntil, cancellableUntil, policy}` | 200, 403, 404 | `utils/refundPolicy.js` |
| POST | `/bookings/check-in` | Staff (owner of the theatre, or admin) | `ticketCode` | booking with user + show | 200, 400, 403, 404, 409 | Conditional update on `checkedInAt`. Audited. |
| GET | `/bookings/my` | User | | bookings[] | | |
| GET | `/bookings/owner` | Staff | query | bookings for the caller's theatres | | |
| GET | `/bookings/:id` | User (own booking) | | populated booking | 403 if not owner | |
| GET | `/bookings` | Admin | query filters | all bookings (paginated) | | |

## Coupons — `coupon.routes.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/offers` | Public | Active coupons for display |
| GET | `/coupons` | Admin | |
| POST | `/coupons` | Admin | `couponCreateSchema` (code, type PERCENT/FLAT, value, maxDiscount, minAmount, validFrom/Until, usageLimit, perUserLimit, isActive) |
| PATCH | `/coupons/:id` | Admin | |
| DELETE | `/coupons/:id` | Admin | |

## Reviews — `review.routes.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reviews/top` | Public | Top-rated reviews for the landing page |
| GET | `/movies/:movieId/reviews` | Public | Paginated + rating distribution |
| GET | `/movies/:movieId/reviews/my` | User | |
| POST | `/reviews` | User | `movieId, rating 1–10, comment`; unique per (movie, user) |
| PATCH | `/reviews/:id` | User (author) | |
| DELETE | `/reviews/:id` | User (author) or admin | |
| POST | `/reviews/:id/like` | User | Toggle like |

## Me (watchlist, notifications) — `me.routes.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/me/watchlist` | User | Ids |
| GET | `/me/watchlist/movies` | User | Populated movies |
| POST | `/me/watchlist/merge` | User | Merge a guest's local watchlist after login |
| PUT / DELETE | `/me/watchlist/:movieId` | User | Add / remove |
| PUT / DELETE | `/me/notify/:movieId` | User | "Notify me when bookings open" |
| GET | `/notifications` | User | Latest in-app notifications |
| PATCH | `/notifications/read-all` | User | |
| PATCH | `/notifications/:id/read` | User | |

## Prime — `prime.routes.js` → `prime.service.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/prime/plan` | Public | Plan + perks |
| GET | `/prime/me` | User | Membership + total savings aggregate |
| POST | `/prime/subscribe` | User | First time: activates a 30-day trial (conditional update). Otherwise creates a PaymentIntent (₹799). |
| POST | `/prime/confirm` | User | `paymentIntentId`; verifies with Stripe; idempotent via `primePaymentIds` |

## Wallet and gift cards — `wallet.routes.js` → `wallet.service.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/wallet` | User | Balance + last 40 transactions |
| POST | `/wallet/redeem` | User | `code` (CVGC-XXXX-XXXX-XXXX); transaction: card → REDEEMED + wallet credit |
| GET | `/gift-cards/mine` | User | |
| POST | `/gift-cards/purchase` | User | `amount (₹100–₹10,000), recipientName, recipientEmail, message` → PaymentIntent |
| POST | `/gift-cards/confirm` | User | `giftCardId, paymentIntentId`; checks metadata; PENDING → ACTIVE exactly once |

## Payouts — `payout.routes.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/payouts` | Staff | `months` (default 6). Owners see their theatres; admins see all. Report only. |

## Support and audit — `support.routes.js` → `support.service.js`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/support` | User | `category, subject, message, bookingId?` (201) |
| GET | `/support/mine` | User | |
| PATCH | `/support/:id` | User (own ticket) or Admin | Reply; only admins change status; customer reply reopens a RESOLVED ticket. Admin replies are audited. |
| GET | `/support` | Admin | Inbox with filters |
| GET | `/audit-logs` | Admin | Staff activity |

## Uploads — `upload.routes.js` (multer memory storage → Cloudinary)

| Method | Path | Auth | Limits | Notes |
|---|---|---|---|---|
| POST | `/upload/image` | **Public** (`optionalAuth` never rejects) | 5 MB, `image/*` | Any visitor can upload to the project's Cloudinary account ([H4](11-security-review.md#h4-upload-endpoints-lack-authorisation)). |
| POST | `/upload/video` | Admin | 100 MB, `video/*` | |
| DELETE | `/upload/:publicId` | User | | **Any logged-in user can delete any Cloudinary asset by public id.** |

## Socket.io events (not REST)

Documented in [03 §6](03-current-system-architecture.md#6-real-time-subsystem). No authentication is applied to the socket connection.

## Unrouted code

`controllers/booking.controller.js` contains a handler that reports "`${count} stale bookings expired`", but no route mounts it. Expiry only runs from the timer in `index.js`.

## Proposed API changes (not implemented)

| Proposal | Why |
|---|---|
| `POST /api/v1/payments/webhook` (raw body, Stripe signature check) | Confirm bookings, gift cards and Prime even if the browser never calls `/confirm`; reconcile refunds ([09](09-payment-and-failure-handling.md)). |
| `Idempotency-Key` header on `/bookings/initiate` | A retried request (double click, network retry) shouldn't create a second booking attempt. |
| `GET /shows` with `fields`/projection, `page`, `limit`, `city`, `date` | Payload and latency ([12](12-reliability-and-scalability.md)). |
| `GET /health/ready` checking MongoDB and Redis | Real readiness for the platform health check. |
| `POST /auth/forgot-password`, `POST /auth/reset-password` with emailed token | Missing account recovery. |
