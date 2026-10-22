# 02 · Requirements and implemented features

[← Back to index](README.md)

There is no written requirements document in the repository. The requirements below are **reverse-engineered from the code**: if a feature is listed as implemented, there is a route, a service and (usually) a UI page for it.

## Actors and roles

Roles come from `USER_ROLE` in `server/utils/constants.js` and are stored on `User.userRole`.

| Role | Stored value | How it is created | Guard used on the server |
|---|---|---|---|
| Customer | `CUSTOMER` | Default on signup | `isAuthenticated` |
| Theatre owner | `CLIENT` | Signup with `userRole: "CLIENT"` → `userStatus: PENDING` until an admin approves | `isAdminOrClient` + ownership middleware |
| Admin | `ADMIN` | First admin can self-register (`createUser`: if no admin exists); otherwise created as `PENDING` | `isAdmin` |
| Anonymous visitor | — | — | Public `GET` routes |

> **Verified limitation:** `PENDING` status is never enforced. Signin only rejects `REJECTED` accounts, and `isAdmin` / `isAdminOrClient` check the role only. See [11 · Security review](11-security-review.md#c1-signup-mass-assignment-leads-to-privilege-escalation).

## Functional features

### Customer

| Feature | Status | Evidence |
|---|---|---|
| Sign up with email OTP verification (10-minute OTP) | Implemented | `auth.controller.js` `signup`, `verifyOtp`, `resendOtp` |
| Sign in with JWT (24 h) | Implemented | `auth.controller.js` `signin` |
| Change password while logged in | Implemented | `PATCH /auth/reset`, `PATCH /users/change-password` |
| Forgot password (email reset link) | **Not implemented** | `/auth/reset` requires a valid JWT |
| Browse/filter movies (status, genre, language, certificate, name, pagination) | Implemented, Redis-cached | `movie.service.js` `fetchMoviesService` |
| Movie detail, similar movies, trailers | Implemented | `GET /movies/:id`, `/movies/:id/similar` |
| City picker and theatre list (city, format, movie filters) | Implemented | `GET /theatres`, `/theatres/cities`, `CityContext.tsx` |
| Showtimes per movie/theatre | Implemented (unpaginated) | `GET /shows` |
| Live seat map (seat categories, wheelchair seats, aisles) | Implemented | `SeatGrid.tsx`, `useShowSocket.ts`, `socket.js` |
| "Best available" seat picker, invite friends (share link) | Implemented (client-side only) | `SeatSelectionPage.tsx` |
| Food & beverage add-ons | Implemented | `FoodPicker.tsx`, `pricing.service.js` `resolveAddOns` |
| Coupons / offers | Implemented | `GET /offers`, `validateCoupon` |
| Server-side checkout quote | Implemented | `POST /bookings/quote` |
| Card payment (Stripe PaymentIntents) | Implemented | `initiateBookingService`, `confirmBookingService` |
| Wallet payment (full or partial) | Implemented | `wallet.service.js` `debitWallet` inside the booking transaction |
| QR ticket, print/save as PDF (browser print) | Implemented | `TicketPage.tsx` (`window.print()`), ticket code `CV-XXXXXXXXXXXX` |
| Split-the-bill calculator | Implemented (client-side display only) | `SplitBill.tsx` |
| My bookings, cancellation with refund preview | Implemented | `GET /bookings/my`, `/bookings/:id/refund-quote`, `POST /bookings/cancel` |
| Refund to card or wallet | Implemented | `cancelBookingService` (`refundTo`) |
| Movie reviews (1–10) with likes | Implemented | `review.service.js` |
| Theatre reviews (1–5), only after a past visit | Implemented | `theatreReview.service.js` `hasVisited` |
| Watchlist and "notify me when bookings open" | Implemented | `me.routes.js`, `notifyBookingsOpen` |
| In-app notifications (60-day TTL) | Implemented | `notification.service.js` |
| Email: OTP, confirmation, cancellation, show reminder, gift card, new movie | Implemented | `email.service.js` |
| Prime Pass (30-day free trial once, then ₹799 per 30 days, no auto-renew) | Implemented | `prime.service.js` |
| Gift cards (buy with Stripe, redeem into wallet) | Implemented | `wallet.service.js` |
| Support tickets with replies | Implemented | `support.service.js` |
| Push notifications, SMS | **Not implemented** | — |
| Recurring billing for Prime | **Not implemented** (by design, "No auto-renewal") | `PERKS` in `prime.service.js` |

### Theatre owner (CLIENT)

| Feature | Status | Evidence |
|---|---|---|
| Create/edit own theatres (screens with seat layouts, menu, amenities, location, pricing rules, cancellation policy) | Implemented | `theatre.service.js`, `ownsTheatreParam` |
| Soft-deactivate a theatre | Implemented | `PATCH /theatres/:id/status` |
| Attach/detach movies | Implemented | `PATCH /theatres/:id/movies` |
| Schedule shows (single, or bulk up to 120 with overlap skipping) | Implemented | `createShowService`, `createShowsBulkService` |
| Dynamic pricing at scheduling time (weekend, morning, prime time, opening day) | Implemented | `utils/dynamicPricing.js` |
| Edit/deactivate/delete shows | Implemented (no customer refunds or notices) | `show.service.js` — see [09](09-payment-and-failure-handling.md#f9-show-deleted-or-deactivated-after-tickets-are-sold) |
| See bookings for own theatres | Implemented | `GET /bookings/owner` |
| Check tickets in at the door (3 h before to 4 h after showtime) | Implemented | `checkInBookingService` |
| Payout report (sales, refunds, 10 % commission) | Implemented (report only, no money movement) | `payout.service.js` |
| Approval gate before managing theatres | **Partially implemented** — status is set to `PENDING` but not enforced | `user.service.js`, `auth.middleware.js` |

### Admin

| Feature | Status | Evidence |
|---|---|---|
| Movie CRUD and status (COMING_SOON / RELEASED / BANNED) | Implemented | `movie.routes.js` |
| User list, approve/reject, change role, delete | Implemented | `user.routes.js` |
| All bookings, coupons CRUD, support inbox, audit log | Implemented | `booking/coupon/support routes` |
| Hard-delete theatres | Implemented | `DELETE /theatres/:id` |
| Video upload (trailers) to Cloudinary | Implemented | `POST /upload/video` |
| Platform stats (cached 5 min) | Implemented, public | `GET /stats` |

## Non-functional requirements (what the code implies)

| Area | What exists | Status |
|---|---|---|
| Consistency of seat sales | MongoDB transactions + conditional updates | Implemented |
| Real-time seat feedback | Socket.io + Redis TTL locks | Implemented (unauthenticated) |
| Latency of hot reads | Redis cache-aside for movies and stats | Implemented, measured in `PERFORMANCE.md` |
| Abuse protection | Rate limits (300 req / 15 min / IP; 20 on auth routes) | Implemented |
| Auditability | `AuditLog` for staff writes (365-day TTL) | Implemented |
| Availability | Single Render free instance, sleeps after idle | Limited (see [13](13-deployment-and-infrastructure.md)) |
| Observability | `console.log` only | **Not implemented** |
| Data retention | TTL indexes on notifications (60 d) and audit logs (365 d) | Implemented |
| Internationalisation | INR only, IST used for pricing rules | Implemented (single-market) |

## Explicitly out of scope / absent

Not found in the repository: multiple currencies, seat-map editor for arbitrary shapes (layouts are row × column grids), waitlists, virtual queues, dynamic pricing based on demand (rules are fixed percentages), organiser payouts via Stripe Connect, OAuth/social login, multi-factor auth, admin impersonation, GDPR export/delete flows.
