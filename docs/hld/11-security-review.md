# 11 · Security review

[← Back to index](README.md)

Scope: authentication, authorisation, input handling, secrets and abuse resistance of the code in this repository. **Verified** findings were confirmed by a reproduction or by tracing the exact code path. **Plausible** findings follow from the code but weren't demonstrated. Reproductions ran against an **in-memory MongoDB**, never against the production database or live site.

## Controls that exist

| Control | Implementation |
|---|---|
| Password storage | bcrypt (cost 10) in `User` `pre("save")`; `password` has `select: false` |
| Email ownership | 6-digit OTP from `crypto.randomInt`, 10-minute expiry, required before signin |
| Session | JWT (HS256, `AUTH_KEY`), 24 h, sent in `x-access-token`; user reloaded from the DB on every request (so role changes and deletions take effect immediately) |
| Role checks | `isAdmin`, `isAdminOrClient` |
| Object-level checks | Ownership middleware for theatres/shows; service-level `userId` checks for bookings, refund quotes, support tickets, reviews, gift cards; check-in restricted to the theatre owner |
| Input validation | Zod on most write routes; seat ids validated against the layout; ObjectId length checks |
| Payment integrity | Server-side pricing; PaymentIntent created and verified on the server; metadata checks for Prime and gift cards |
| Rate limiting | 300 / 15 min per IP globally; 20 / 15 min on auth routes |
| Headers / CORS | `helmet()`; CORS restricted to `CLIENT_URL` for REST and Socket.io |
| Secrets | `.env` git-ignored; `.vercelignore` excludes `.env*` and `server/`; production secrets live in the Render/Vercel dashboards |
| Audit | `AuditLog` for staff writes; fields matching `password|token|otp|secret` are excluded |

## Findings

| ID | Severity | Title | Status |
|---|---|---|---|
| C1 | **Critical** | Signup mass assignment leads to privilege escalation | Verified (reproduced) |
| C2 | **Critical** (integrity) | Show edit wipes sold seats | Verified (reproduced) |
| H1 | High | Account status (`PENDING`) is never enforced | Verified |
| H2 | High | Socket.io is unauthenticated and trusts client `userId` | Verified (code path) |
| H3 | High | Paid-but-unticketed bookings (no webhook) | Verified (code path) — see [09 F2](09-payment-and-failure-handling.md#f2-payment-succeeds-but-the-booking-expires) |
| H4 | High | Upload endpoints lack authorisation | Verified (code path) |
| M1 | Medium | Shared mutable response objects | Plausible |
| M2 | Medium | Expired JWT returns 500 and echoes the error object | Verified (code path) |
| M3 | Medium | Seat hoarding: unlimited concurrent unpaid reservations | Verified (code path) |
| M4 | Medium | Rate limiter may key on the proxy IP behind Render | Plausible (inconclusive test) |
| M5 | Medium | JWT stored in `localStorage`, no revocation | Verified (design) |
| L1 | Low | Theatre ownership can be transferred via `PATCH /theatres/:id` | Verified |
| L2 | Low | OTP brute-force bounded only by the per-IP rate limit | Plausible |
| L3 | Low | Mass "new movie" email from the API process | Verified |
| L4 | Low | No security logging or alerting | Verified (absence) |

---

### C1. Signup mass assignment leads to privilege escalation

- **Evidence:** `auth.controller.js` `signup` copies `req.body` into `body` and calls `createUser(body)`; `createUser` adds `userStatus` and calls `User.create(data)`. No allow-list exists. `validateSignupRequest` only checks that `name`, `email` and `password` are present.
- **Reproduction:** an admin already exists → signup with `{userRole:"ADMIN", walletBalance:50000, primeExpiresAt:"2099-01-01"}` → stored role `ADMIN`, status `PENDING`, wallet `50000`, Prime until 2099 → after OTP verification, signin returned 200 with a token → that token passed `isAuthenticated` + `isAdmin`.
- **Why it matters:** anyone can become an admin (manage users, movies, coupons, all bookings, delete theatres), mint wallet money that buys real tickets, and get free Prime.
- **Fix (code only):** build the user from an allow-list (`name, email, password, phone, avatar`). Accept `userRole` only as `CUSTOMER` or `CLIENT`, never `ADMIN` via signup. Enforce `userStatus === APPROVED` in role guards (H1). Then audit existing users for unexpected roles, balances or Prime dates. Add a test.

### C2. Show edit wipes sold seats

Details in [08 §5](08-booking-and-concurrency-analysis.md#5-verified-break-show-edits-wipe-bookedseats). It is an integrity flaw any owner can trigger accidentally. **Fix:** omit `bookedSeats`/`isActive` from `updateShowSchema` and drop Zod defaults from all `.partial()` update schemas (theatre and movie updates inject defaults too).

### H1. Account status is never enforced

- **Evidence:** `signin` rejects only `REJECTED`; `isAuthenticated`, `isAdmin` and `isAdminOrClient` don't read `userStatus`.
- **Scenario:** a theatre owner awaiting approval (`PENDING`) can already create theatres and schedule shows. Combined with C1, a self-declared admin is fully functional.
- **Fix:** in `isAdminOrClient`/`isAdmin`, require `userStatus === "APPROVED"`; on signin, return a clear "awaiting approval" error for staff roles that are `PENDING`.

### H2. Socket.io is unauthenticated and trusts client `userId`

- **Evidence:** `socket.js` has no `io.use()` middleware; `seats:selecting` and `seats:deselecting` use `userId` from the payload; `seats:blocked` broadcasts the locker's `userId`.
- **Scenarios:** (1) a script locks every seat of a show; `SeatGrid` disables temp-blocked seats, so customers can't select anything in the UI. (2) A user replays `seats:deselecting` with someone else's `userId` and removes their locks.
- **Not affected:** actual double booking. The MongoDB guard still holds (see [08](08-booking-and-concurrency-analysis.md)).
- **Fix:** verify `socket.handshake.auth.token` with `jsonwebtoken` in `io.use`, set `socket.data.userId`, ignore payload ids, and cap seats locked per socket.

### H4. Upload endpoints lack authorisation

- **Evidence:** `POST /upload/image` uses `optionalAuth`, which never rejects, so anonymous uploads (5 MB each) succeed. `DELETE /upload/:publicId` requires only `isAuthenticated` and passes any `publicId` to `cloudinary.uploader.destroy`.
- **Scenarios:** storage and bandwidth abuse on the project's Cloudinary account; any customer deleting movie posters or theatre photos if they know or guess a public id (the ids appear in image URLs).
- **Fix:** require `isAuthenticated` (or a signup-specific signed upload) for images; restrict deletes to staff and to assets the caller uploaded (store `publicId → uploader`), or remove the delete route.

### M1. Shared mutable response objects

- **Evidence:** `utils/response.utils.js` exports two singleton objects. Controllers set `.message`, `.data` and `.err` on them and then call `res.json`. Several handlers assign a field and then `await` before responding (for example `stats.controller` sets `message` before awaiting the service).
- **Scenario:** under concurrency, one request's `message` or `err` can appear in another's response. Most handlers set `data` right before `res.json`, which limits the exposure.
- **Status:** plausible; not reproduced. **Fix:** return fresh objects (`res.json({ success: true, message, data })`) or a helper that builds a new object per call.

### M2. Expired JWT returns 500

- **Evidence:** `isAuthenticated` maps only `error.name == "JsonWebTokenError"` to 401. An expired token throws `TokenExpiredError`, which falls through to `res.status(500).json({..., err: error})`.
- **Effect:** after 24 h, users get 500 errors instead of being logged out (the Axios interceptor only reacts to 401). The response echoes the JWT error object (name, message, `expiredAt`), which is low-sensitivity.
- **Fix:** treat every `jwt.verify` failure as 401.

### M3. Seat hoarding

- **Evidence:** `initiateBookingService` doesn't check for the user's existing `IN_PROCESS` bookings; each request may hold 10 seats for 10–15 minutes.
- **Scenario:** one account (or script) holds most seats of a popular show without paying, repeatedly.
- **Fix:** limit open holds per user and per show; shorten the hold or release the previous hold on re-initiate.

### M4. Rate limiter behind a proxy

- **Evidence:** `server/index.js` never calls `app.set("trust proxy", …)`. On Render, requests arrive through a proxy, so `req.ip` may be the proxy address. That would put all users in one bucket (300 requests per 15 minutes for the whole site, and 20 auth attempts for everyone).
- **Test performed:** two requests to production returned `RateLimit-Remaining: 299` then `298`. That fits both a per-client bucket and a shared bucket with no other traffic, so it's **inconclusive**.
- **Fix:** `app.set("trust proxy", 1)` (Render adds one hop), then verify with requests from two networks.

### M5. Token storage and lifetime

- The JWT lives in `localStorage` (`cv_token`), so any XSS could read it. Tokens can't be revoked before their 24-hour expiry (logout is client-side only). Deleted users are rejected because the user is reloaded on every request.
- **Proposed:** httpOnly, `SameSite` cookies; shorter access tokens with refresh tokens; a token version on `User` for forced logout.

### L1. Theatre ownership transfer

`theatreUpdateSchema` (`.partial()` of the create schema) includes `owner`, and `updateTheatreService` applies it. An owner can hand a theatre to any user id; an admin can reassign. Probably unintended. **Fix:** strip `owner` from update payloads, or make reassignment an admin-only action.

### L2. OTP brute force

1,000,000 combinations; 20 attempts per 15 minutes per IP; no per-account attempt counter. Infeasible from one IP, but feasible from a botnet within the 10-minute window. **Fix:** a per-user failed-attempt counter that invalidates the OTP after 5 tries.

### L3. Mass email from the request process

`createMovieService` sends one email per `APPROVED` user (fire-and-forget) from the web process. This exhausts Gmail limits, can get the sender account flagged, and with seed data it emails fake addresses. **Fix:** a queue with a provider meant for bulk mail, or in-app notifications only.

### L4. Security observability

No structured logs, no alerts on repeated 401/403/429, no record of logins. The audit log covers staff writes only.

## Secrets check

- Repository: no `.env` files are tracked (`git ls-files` shows none); `.gitignore` covers `.env` and `.env.*`.
- `README.md` and these docs list environment variable **names** only.
- Production uses Stripe **test** keys at the time of writing.
