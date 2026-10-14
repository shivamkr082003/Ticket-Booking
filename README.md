<div align="center">

# 🎬 CINEVERSE

### Production-Grade Movie Ticket Booking Platform

[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB_7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![Socket.io](https://img.shields.io/badge/Socket.io_4-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com)

[![CI](https://github.com/AmanBhaskar16/Ticket-Booking-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/AmanBhaskar16/Ticket-Booking-Platform/actions/workflows/ci.yml)
[![Vitest](https://img.shields.io/badge/tested_with-vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![k6](https://img.shields.io/badge/load_tested-k6-7D64FF?style=flat-square&logo=k6&logoColor=white)](https://k6.io)

> A full-stack movie booking platform inspired by BookMyShow — featuring real-time seat selection with Redis-backed locking, atomic booking transactions, Stripe payments, OTP-based email verification, and a role-based admin ecosystem. Containerized with Docker, tested with Vitest, load-tested with k6, and deployed with a CI pipeline on every push.

**[🚀 Live Demo](https://ticket-booking-platform-bice.vercel.app) · [⚙️ Backend API](https://ticket-booking-platform-qctm.onrender.com/health) · [📊 Performance Benchmarks](./PERFORMANCE.md)**

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Booking Workflow](#-booking-workflow)
- [Authentication Flow](#-authentication-flow)
- [Real-time Architecture](#-real-time-architecture)
- [Tech Stack](#-tech-stack)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Running Tests](#-running-tests)
- [Deployment Architecture](#-deployment-architecture)
- [Key Engineering Decisions](#-key-engineering-decisions)
- [Performance & Production](#-performance--production-considerations)
- [Roadmap / Known Next Steps](#-roadmap--known-next-steps)

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎟 Customer
- Cinematic landing page with live DB data
- Movie discovery — search, filter by genre / language / format / city
- **Real-time seat map** — live seat blocking via Socket.io, backed by Redis
- **Stripe payment** — end-to-end booking with 3 states
- QR-code ticket generation with unique ticket code
- Movie reviews & ratings (auto-calculated via aggregation)
- OTP email verification on signup
- Profile page — avatar, phone, password, booking history

</td>
<td width="50%">

### ⚙️ Admin / Theatre Owner
- Full CRUD — movies, theatres, shows
- Cloudinary image/video upload with drag & drop
- Approve / reject theatre owner accounts
- Real-time booking management
- Revenue analytics with charts
- Automated emails — OTP, booking confirm/cancel, new movie alerts
- Stale booking cleanup via cron (every 5 min) + Redis TTL as a second line of defense
- Role-based route protection (ADMIN / CLIENT / CUSTOMER)

</td>
</tr>
</table>

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph BROWSER["Browser (Client)"]
        direction LR
        LP[Landing Page] --- MD[Movies Detail] --- BF[Booking Flow] --- DA[Dashboard Admin/Client]
    end

    BROWSER -->|"HTTPS / WSS"| MW

    subgraph SERVER["Express Server (Node.js)"]
        direction TB
        MW["Middleware Pipeline - Helmet - Rate Limit - CORS - JSON - isAuthenticated JWT - Zod Validate - Route"]
        MW --> R1 & R2 & R3 & R4 & R5

        subgraph ROUTES["Routes"]
            direction LR
            R1["/auth /users"] --- R2["/movies /theatres"] --- R3["/shows /upload"] --- R4["/bookings"] --- R5["/reviews"]
        end

        ROUTES --> SL
        SL["Service Layer - Business Logic - MongoDB Transactions - Cache-aside - Error Handling"]
        SL --> SOC & EXT & CACHE

        subgraph SERVICES["Services"]
            direction LR
            SOC["Socket.io + Redis Adapter"] --- EXT["External: Stripe, Cloudinary, Gmail"]
        end
    end

    SERVER -->|"Mongoose ODM"| MONGO
    SERVER -->|"Seat locks TTL + cache"| CACHE

    subgraph MONGO["MongoDB Atlas"]
        direction LR
        C1[(users)] --- C2[(movies)] --- C3[(theatres)] --- C4[(shows)] --- C5[(bookings)] --- C6[(reviews)]
    end

    subgraph CACHE["Redis"]
        direction LR
        RC1[(seat-lock TTL)] --- RC2[(cache versioned)]
    end
```
---

## 🎫 Booking Workflow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant Redis
    participant MongoDB
    participant Stripe
    participant Email

    User->>Frontend: Select seats on seat map
    Frontend->>API: emit("seats:selecting", {showId, seats})
    API->>Redis: SET seat-lock:showId:seat (TTL 10min)
    API-->>Frontend: broadcast to all users in room (seats temporarily highlighted)

    User->>Frontend: Click "Proceed to Payment"
    Frontend->>API: POST /bookings/initiate {showId, seats}

    API->>MongoDB: START TRANSACTION
    MongoDB->>MongoDB: findOneAndUpdate - lock seats atomically
    Note over MongoDB: bookedSeats not elemMatch prevents<br/>race condition / double booking
    MongoDB->>Stripe: Create PaymentIntent
    Stripe-->>MongoDB: clientSecret
    MongoDB->>MongoDB: Save booking (status: IN_PROCESS)
    MongoDB->>MongoDB: COMMIT TRANSACTION
    API-->>Frontend: {bookingId, clientSecret, totalAmount}

    Frontend->>Stripe: Confirm payment (card details)
    Stripe-->>Frontend: Payment success

    Frontend->>API: POST /bookings/confirm {bookingId, paymentIntentId}
    API->>Stripe: Verify PaymentIntent status
    Stripe-->>API: SUCCEEDED
    API->>MongoDB: Update booking -> SUCCESSFUL + generate ticketCode
    API->>Redis: DEL seat-lock keys (permanent booking now)
    API->>API: emit("seats:booked") - broadcast via Redis adapter
    API->>Email: sendBookingConfirmEmail (non-blocking)
    API-->>Frontend: {booking, ticketCode}
    Frontend-->>User: Ticket page with QR code

    alt Payment Failed / User Cancels
        Frontend->>API: POST /bookings/cancel {bookingId}
        API->>MongoDB: Update booking -> CANCELLED
        API->>MongoDB: Remove seats from bookedSeats
        API->>Stripe: Cancel PaymentIntent
        API->>API: emit("seats:released")
        API->>Email: sendBookingCancelEmail (non-blocking)
        API-->>Frontend: Cancellation confirmed
    end

    Note over API,Redis: Redis TTL auto-expires abandoned seat locks.<br/>Cron job (every 5 min) is the second line of defense.
```

---

## 🔐 Authentication Flow

```mermaid
flowchart TD
    A([User visits /signup]) --> B[Fill form: name, email, password, role]
    B --> C{Client-side Zod validation}
    C -- Invalid --> D[Show field error toast]
    C -- Valid --> E[POST /auth/signup]
    E --> F[Delete unverified user with same email if exists]
    F --> G[Create User - isEmailVerified false]
    G --> H[Generate 6-digit OTP - 10 minute expiry]
    H --> I[Save OTP hash to DB]
    I --> J[Send OTP email via Nodemailer]
    J --> K([Redirect to /verify-otp])

    K --> L[User enters OTP]
    L --> M{OTP valid and not expired?}
    M -- No --> N[Show error - Resend after 60s]
    M -- Yes --> O[isEmailVerified true - Clear OTP from DB]
    O --> P([Redirect to /login])

    P --> Q["POST /auth/signin (rate-limited: 20 attempts / 15min)"]
    Q --> R{isEmailVerified?}
    R -- No --> S[Block login]
    R -- Yes --> T{userStatus?}
    T -- REJECTED --> U[Block login]
    T -- PENDING --> V[Allow login - Show pending wall]
    T -- APPROVED --> W[Sign JWT 24h]
    W --> X{userRole?}
    X -- CUSTOMER --> Y([/movies])
    X -- ADMIN/CLIENT --> Z([/dashboard])

    style A fill:#1a1a2e,color:#fff
    style K fill:#1a1a2e,color:#fff
    style P fill:#1a1a2e,color:#fff
    style Y fill:#16a34a,color:#fff
    style Z fill:#7c3aed,color:#fff
    style D fill:#dc2626,color:#fff
    style S fill:#dc2626,color:#fff
    style U fill:#dc2626,color:#fff
```

---

## ⚡ Real-time Architecture

```mermaid
sequenceDiagram
    participant U1 as User 1
    participant U2 as User 2
    participant Server as Socket.io Server
    participant Redis as Redis (TTL + Pub/Sub)

    U1->>Server: emit("join:show", showId)
    U2->>Server: emit("join:show", showId)
    Server->>Redis: SCAN seat-lock:showId:*
    Server-->>U1: emit("seats:state", currentBlockedSeats)
    Server-->>U2: emit("seats:state", currentBlockedSeats)

    U1->>Server: emit("seats:selecting", {seats: A1, A2})
    Server->>Redis: SET seat-lock A1 EX 600, SET seat-lock A2 EX 600
    Server-->>U2: emit("seats:blocked", {seats: A1 A2, userId})
    Note over U2: A1, A2 shown as being selected (orange)

    U2->>Server: emit("seats:selecting", {seats: A3, A4})
    Server-->>U1: emit("seats:blocked", {seats: A3 A4, userId})

    U1->>Server: Booking confirmed
    Server->>Redis: DEL seat-lock A1, DEL seat-lock A2
    Server-->>U2: emit("seats:booked", {seats: A1 A2})
    Note over U2: A1, A2 permanently red, cannot select

    Note over Server,Redis: Redis TTL auto-expires the key after 10 min<br/>if User 1 abandons without paying.
    Server-->>U2: emit("seats:released", {seats: A1 A2})
    Note over U2: A1, A2 available again

    Note over Server,Redis: Socket.io Redis adapter means this works<br/>correctly even across multiple server instances.
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | Component-based UI |
| TypeScript | 5 | Strict typing — **zero `any`** |
| React Router | v6 | Code-split lazy routing |
| Framer Motion | 11 | Cinematic page animations |
| Socket.io Client | 4 | Real-time seat updates |
| Stripe React Elements | — | PCI-compliant payment UI |
| Axios | 1.x | HTTP client + interceptors |
| QRCode | — | Ticket QR generation |
| Cloudinary (via API) | — | Image upload with preview |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 20 / 4.x | REST API server |
| MongoDB + Mongoose | 7 / 8 | Database + ODM |
| **Redis** | 7 | Real-time seat-lock state (TTL) + movie caching (cache-aside, versioned invalidation) |
| Socket.io | 4 | WebSocket server |
| **Socket.io Redis Adapter** | — | Cross-instance broadcast (horizontal scaling) |
| JSON Web Token | — | Stateless auth (24h expiry) |
| Stripe Node | — | Payment processing |
| Nodemailer | — | OTP + booking emails |
| Cloudinary SDK | — | Image/video storage |
| Multer | — | Multipart file upload |
| Zod | 3 | Runtime request validation |
| bcryptjs | — | Password hashing (10 rounds) |
| crypto (built-in) | — | OTP generation |
| **Helmet + express-rate-limit** | — | Security headers + brute-force protection on auth endpoints |
| **Vitest + mongodb-memory-server** | — | Integration testing against a real (in-memory) replica set |

### DevOps & Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Multi-stage builds (server, client), one-command local stack |
| **GitHub Actions** | CI — runs the test suite on every push/PR |
| **k6** | Load testing — see [`PERFORMANCE.md`](./PERFORMANCE.md) |
| **Render** | Backend hosting (persistent process — required for Socket.io/WebSockets) |
| **Vercel** | Frontend hosting (static build) |
| **MongoDB Atlas** | Managed database |
| **Upstash** | Managed Redis (production) |
| **UptimeRobot** | Keeps the free-tier backend warm via periodic health checks |

---

## 📡 API Reference

<details>
<summary><b>🔐 Auth</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | ❌ | Register + send OTP email |
| POST | `/auth/verify-otp` | ❌ | Verify OTP → activate account |
| POST | `/auth/resend-otp` | ❌ | Resend OTP (60s cooldown) |
| POST | `/auth/signin` | ❌ | Login → JWT token |
| PATCH | `/auth/reset` | ✅ | Change password |

> All `/auth/*` endpoints are rate-limited to 20 requests / 15 min per IP.

</details>

<details>
<summary><b>🎬 Movies</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/movies` | ❌ | List with filters, search, pagination — **Redis cached** |
| GET | `/movies/:id` | ❌ | Movie details — **Redis cached** |
| POST | `/movies` | ADMIN | Create movie — invalidates list cache |
| PATCH | `/movies/:id` | ADMIN | Update movie — invalidates movie + list cache |
| DELETE | `/movies/:id` | ADMIN | Delete movie — invalidates movie + list cache |
| PATCH | `/movies/:id/status` | ADMIN | Toggle active status — invalidates cache |

</details>

<details>
<summary><b>🏛 Theatres</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/theatres` | ❌ | List theatres |
| GET | `/theatres/:id` | ❌ | Theatre details |
| POST | `/theatres` | CLIENT/ADMIN | Create theatre |
| PATCH | `/theatres/:id` | CLIENT/ADMIN | Update theatre |
| DELETE | `/theatres/:id` | ADMIN | Delete theatre |
| PATCH | `/theatres/:id/movies` | CLIENT/ADMIN | Add/remove movies |

</details>

<details>
<summary><b>🎭 Shows</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/shows` | ❌ | List shows (filter by movie/theatre/date) |
| POST | `/shows` | CLIENT/ADMIN | Create show |
| PATCH | `/shows/:id` | CLIENT/ADMIN | Update show |
| DELETE | `/shows/:id` | ADMIN | Delete show |

</details>

<details>
<summary><b>🎫 Bookings</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/bookings/initiate` | ✅ | Lock seats (Mongo txn + Redis) + create Stripe PaymentIntent |
| POST | `/bookings/confirm` | ✅ | Verify payment + issue QR ticket + release Redis locks |
| POST | `/bookings/cancel` | ✅ | Release seats + cancel payment |
| GET | `/bookings/my` | ✅ | Current user's bookings |
| GET | `/bookings/:id` | ✅ | Single booking details |
| GET | `/bookings` | ADMIN | All bookings |

</details>

<details>
<summary><b>⭐ Reviews</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/movies/:id/reviews` | ❌ | Reviews + rating distribution |
| GET | `/movies/:id/reviews/my` | ✅ | Current user's review |
| POST | `/reviews` | ✅ | Add review (one per user per movie) |
| PATCH | `/reviews/:id` | ✅ | Edit own review |
| DELETE | `/reviews/:id` | ✅ | Delete own review / ADMIN |
| POST | `/reviews/:id/like` | ✅ | Toggle like |

</details>

<details>
<summary><b>👤 Users</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users` | ADMIN | List all users with filters |
| PATCH | `/users/profile` | ✅ | Update name / phone / avatar |
| PATCH | `/users/change-password` | ✅ | Change password |
| PATCH | `/users/:id` | ADMIN | Update role / status |
| DELETE | `/users/:id` | ADMIN | Delete user |

</details>

<details>
<summary><b>📤 Upload</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/upload/image` | Optional | Upload image → Cloudinary URL |
| POST | `/upload/video` | ADMIN | Upload video → Cloudinary URL |
| DELETE | `/upload/:publicId` | ✅ | Delete from Cloudinary |

</details>

<details>
<summary><b>❤️ Health</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | ❌ | Liveness check — used by Docker healthcheck + UptimeRobot |

</details>

---

## 📁 Project Structure

```
cineverse/
├── client/                              # React + TypeScript
│   ├── Dockerfile                       # Multi-stage build → nginx
│   ├── nginx.conf                       # SPA routing fallback
│   └── src/
│       ├── api/
│       │   └── index.api.ts             # Axios client + all API methods
│       ├── components/
│       │   ├── booking/                 # BookingCard, PaymentForm, SeatGrid, TicketCard
│       │   ├── common/                  # ErrorBoundary, ImageUpload, Modal
│       │   ├── dashboard/               # admin/ + client/ tabs, forms
│       │   ├── home/                    # Landing page sections (DB-powered)
│       │   └── movies/                  # ReviewCard, ReviewForm, ShowFilters
│       ├── context/                     # AuthContext, SocketContext
│       ├── hooks/                       # useShowSocket
│       ├── pages/                       # auth/, booking/, movies/, admin/, profile/
│       └── types/                       # All TypeScript interfaces (0 any)
│
├── server/                              # Node.js + Express (no src/ nesting)
│   ├── Dockerfile
│   ├── config/
│   │   ├── db.js                        # MongoDB connection
│   │   └── redis.js                     # 3 Redis clients (pub/sub adapter + general)
│   ├── controllers/                     # auth, user, movie, theatre, show, booking, review, upload
│   ├── middlewares/                     # auth, validation, user
│   ├── models/                          # Mongoose schemas with indexes
│   ├── routes/                          # Express routers
│   ├── services/                        # Business logic layer
│   │   ├── booking.service.js           # Atomic transactions + Stripe + Redis cleanup
│   │   ├── cache.service.js             # Cache-aside + versioned list invalidation
│   │   ├── email.service.js
│   │   └── review.service.js            # Rating aggregation pipeline
│   ├── socket.js                        # Socket.io + Redis adapter + TTL seat locks
│   ├── tests/
│   │   ├── setup/                       # testDb.js (in-memory replica set), mockStripe.js
│   │   ├── services/                    # booking.service.test.js
│   │   ├── redis-smoke-test.mjs
│   │   └── cache-smoke-test.mjs
│   └── utils/                           # constants, error.utils, response.utils
│
├── k6/                                  # Load test scripts
│   ├── movie-list-cache-miss.js
│   ├── movie-list-cache-hit.js
│   └── movie-list-mixed-realistic.js
│
├── .github/workflows/ci.yml             # Runs test suite on every push/PR
├── docker-compose.yml                   # server + client + redis (local dev)
└── PERFORMANCE.md                       # k6 benchmark methodology + results
```

---

## 🚀 Getting Started

### Prerequisites
```
Docker + Docker Compose (recommended), OR:
Node.js >= 18
MongoDB Atlas URI (or local MongoDB)
Redis (local install or Docker)
Stripe test account
Cloudinary account
Gmail account with App Password enabled
```

### Environment Variables

**`server/.env`**
```env
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cineverse
REDIS_URL=redis://localhost:6379          # or your Upstash URL in production
AUTH_KEY=your_super_secret_jwt_key_min_32_chars

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_51...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret

# Gmail (use App Password, not your real password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=xxxx_xxxx_xxxx_xxxx
EMAIL_FROM=Cineverse <your_email@gmail.com>

CLIENT_URL=http://localhost:5173
```

**`client/.env`**
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...
```

### Installation & Run

#### Option A — Docker (recommended, one command)
```bash
git clone https://github.com/AmanBhaskar16/Ticket-Booking-Platform.git
cd Ticket-Booking-Platform
cp .env.example .env
cp server/.env.example server/.env    # fill in real values
docker compose up --build
```
Client → `http://localhost:5173` · API → `http://localhost:3000/health`

Spins up the server, client, and Redis in one command. MongoDB is read from your Atlas URI in `server/.env` — no local Mongo container needed.

#### Option B — Manual
```bash
git clone https://github.com/AmanBhaskar16/Ticket-Booking-Platform.git
cd Ticket-Booking-Platform

cd server && npm install && npm run dev     # :3000 — needs local/Atlas Mongo + local/hosted Redis

cd ../client && npm install && npm run dev  # :5173
```

### First-time Setup
```
1. Open http://localhost:5173/signup
2. First registered user → auto ADMIN
3. Verify email via OTP
4. Login → Admin Dashboard
5. Add movies (Movies tab)
6. Add theatres + shows (Theatres tab)
7. Register a CLIENT account → approve via Admin
8. Start booking tickets!
```

---

## 🧪 Running Tests

```bash
cd server
npm install
npm test              # Vitest — runs against a real, temporary MongoDB replica set
```

Covers the highest-risk logic in the app: atomic seat locking, concurrent-request race conditions, Stripe payment confirmation, cancellation, and stale-booking expiry. Also runs automatically on every push via [GitHub Actions](./.github/workflows/ci.yml).

```bash
node tests/redis-smoke-test.mjs    # verifies TTL seat-locking against a live Redis
node tests/cache-smoke-test.mjs    # verifies cache-aside + versioned invalidation
```

---

## 🌐 Deployment Architecture

```mermaid
flowchart LR
    U[User Browser] -->|Static build| V["Vercel - Frontend"]
    V -->|REST + WebSocket| R["Render - Backend, persistent process"]
    R -->|Mongoose| A["MongoDB Atlas"]
    R -->|TLS| UP["Upstash - Managed Redis"]
    UR["UptimeRobot - pings /health every 5min"] -.->|keeps warm| R
```

**Why the backend isn't on Vercel too**: Vercel's serverless functions are short-lived and stateless — they can't hold the persistent WebSocket connections Socket.io needs, and a free-tier serverless timeout will kill any request that has to wait on a slow connection (e.g. Redis). The backend runs on **Render** instead, which keeps a real, long-running Node process alive — exactly what real-time seat locking requires. The frontend, being a static build, has no such constraint and stays on Vercel.

---

## 🔑 Key Engineering Decisions

### 1. Atomic Seat Locking — Zero Double Booking

```js
// MongoDB conditional update — transaction-safe
const show = await Show.findOneAndUpdate(
  {
    _id: showId,
    // Fails atomically if ANY requested seat is already booked
    bookedSeats: { $not: { $elemMatch: { $in: seats } } }
  },
  { $push: { bookedSeats: { $each: seats } } },
  { session, new: true }   // inside MongoDB multi-document transaction
);
if (!show) throw new ConflictError("Seats already taken by another user");
```
Verified under real concurrent load in the integration test suite — two simultaneous requests for the same seat resolve to exactly one winner, every time.

### 2. Redis Cache-Aside with Versioned Invalidation

```js
// Bumping one version key invalidates every cached list query at once —
// no need to scan and delete every possible filter combination.
const getListVersion = async () => (await redisClient.get(LIST_VERSION_KEY)) ?? "0";
const buildListKey = (version, filter) => `cache:movies:list:v${version}:${hashOf(filter)}`;
export const invalidateMovieListCache = () => redisClient.incr(LIST_VERSION_KEY);
```
Cut p95 latency on the movie list endpoint by ~10x under realistic mixed traffic — see [`PERFORMANCE.md`](./PERFORMANCE.md).

### 3. TTL-Based Seat Locks Instead of In-Memory State

```js
// Redis's own expiry replaces manual setTimeout cleanup, and — unlike an
// in-memory JS object — this state is shared across every server instance.
await redisClient.set(`seat-lock:${showId}:${seat}`, JSON.stringify({ userId }), { EX: 600 });
```
Paired with the Socket.io Redis adapter, this means real-time seat updates broadcast correctly even if the app scales to multiple server instances — not just within one process's memory.

### 4. Stale Booking Expiry (Belt-and-Suspenders)

```js
// Cron every 5 minutes — releases seats from abandoned bookings.
// Redis TTL (above) is the fast path; this cron is the guaranteed fallback
// in case a lock somehow survives without a corresponding Mongo cleanup.
const staleBookings = await Booking.find({
  status: "IN_PROCESS",
  createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) }
});
for (const booking of staleBookings) {
  await Show.findByIdAndUpdate(booking.showId, { $pull: { bookedSeats: { $in: booking.seats } } });
  await booking.updateOne({ status: "CANCELLED" });
}
```

### 5. Auto-calculated Movie Ratings

```js
// MongoDB aggregation pipeline on every review write
const result = await Review.aggregate([
  { $match: { movieId: new ObjectId(movieId) } },
  { $group: { _id: "$movieId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
]);
const avg = Math.round(result[0].avgRating * 10) / 10;
await Movie.findByIdAndUpdate(movieId, { rating: avg });
```

### 6. Centralized Error Parsing

```js
// Single utility handles all error types → human-readable messages
export const parseError = (error) => {
  if (error.name === "ValidationError")   // Mongoose field errors
    throw { err: firstFieldMessage, code: 400 };
  if (error.code === 11000)               // MongoDB duplicate key
    throw { err: "This email is already registered.", code: 409 };
  if (error.name === "CastError")         // Invalid ObjectId
    throw { err: `Invalid ${error.path}`, code: 400 };
  if (error.err) throw error;             // Already structured
  throw { err: error.message, code: 500 };
};
```

---

## ⚡ Performance & Production Considerations

### Measured impact of the Redis caching layer

Load-tested locally with [k6](https://k6.io) against `GET /api/v1/movies` (Docker Compose, local Redis) — full methodology and reproduction steps in [`PERFORMANCE.md`](./PERFORMANCE.md).

| Metric | Cache miss (MongoDB) | Realistic mixed traffic | Cache hit (Redis) |
|---|---:|---:|---:|
| p95 latency | 588ms | **57ms** | 12.6ms |
| Throughput | 51 req/s | 218 req/s | 147 req/s |

**~10x p95 latency reduction under realistic (80/20) mixed traffic; ~47x in the best case.** Zero errors across all load scenarios.

> Production uses a hosted Redis (Upstash) reached over the internet rather than a same-network Docker container, so absolute production latency differs from these local benchmarks — the architectural pattern and relative improvement are unaffected. See `PERFORMANCE.md` for the full caveat.

### Other production concerns

| Concern | Solution |
|---|---|
| **Double booking** | MongoDB atomic `findOneAndUpdate` + transaction |
| **Race conditions** | `$not.$elemMatch` conditional update — verified under concurrent load in the test suite |
| **Seat-lock state at scale** | Redis with native TTL — survives server restarts, shared across instances |
| **Cross-instance real-time sync** | Socket.io Redis adapter |
| **Orphaned seat locks** | Redis TTL (fast path) + cron fallback every 5 min |
| **Repeated read load** | Cache-aside pattern with versioned invalidation |
| **Brute-force auth attempts** | `express-rate-limit` on auth endpoints (20 req / 15 min per IP) |
| **Common web vulnerabilities** | `helmet` — standard security headers on every response |
| **Backend cold starts (free tier)** | UptimeRobot pings `/health` every 5 min to keep the Render instance warm |
| **Bundle size** | All pages lazy-loaded with `React.lazy()` + `Suspense` |
| **Runtime crashes** | Root + per-route `ErrorBoundary` components |
| **Email failures** | Fire-and-forget — never blocks API response |
| **Image storage** | Cloudinary auto-format (`fetch_format: "auto"`) + size limit |
| **Type safety** | Zero `any` across entire frontend codebase |
| **Input security** | Zod validation on all API endpoints |
| **Password security** | bcryptjs with 10 salt rounds |
| **Query performance** | Compound indexes: `{releaseStatus, isActive}`, `{genre, releaseDate}` |
| **OTP security** | `crypto.randomInt` — cryptographically secure, 10 min expiry |
| **Reproducible environments** | Multi-stage Docker builds; `docker compose up` for full local stack |
| **Regressions** | Integration test suite (Vitest + real replica-set MongoDB) run in CI on every push |

---

## 🗺 Roadmap / Known Next Steps

Honest list of what's next, in priority order:

- [ ] **Socket.io authentication** — connections are currently unauthenticated; next step is verifying JWT on socket handshake
- [ ] **Structured logging** — replace `console.log`/`console.error` with a proper logger (levels, JSON output) for production observability
- [ ] **Broader test coverage** — integration tests currently cover the booking flow (highest risk); auth, movies, and theatres are next
- [ ] **Self-hosted Redis on a private network** — currently uses Upstash over the public internet; a same-platform private-network Redis (e.g. a Render private service) would reduce latency further
- [ ] **Refactor shared response objects** — `errorResponseBody`/`successResponseBody` are currently shared mutable objects; safe under current usage but should become factory functions to remove the footgun

---

## 🧪 Stripe Test Cards

| Scenario | Card Number | Result |
|---|---|---|
| ✅ Success | `4242 4242 4242 4242` | Payment succeeds |
| ❌ Declined | `4000 0000 0000 0002` | Generic decline |
| 💳 Insufficient funds | `4000 0000 0000 9995` | Insufficient funds |
| 🔐 3D Secure | `4000 0025 0000 3155` | Requires authentication |

> Expiry: any future date · CVC: any 3 digits · ZIP: any 5 digits

---

## 🤝 Contributing

```bash
git checkout -b feature/your-feature
git commit -m "feat: describe your change"
git push origin feature/your-feature
# Open a Pull Request
```

---

## 📄 License

MIT © [Aman Bhaskar](https://github.com/AmanBhaskar16)

---

<div align="center">

**Built by Aman Bhaskar · IIIT Ranchi**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-aman--bhaskar-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/aman-bhaskar-1086a9269)
[![GitHub](https://img.shields.io/badge/GitHub-AmanBhaskar16-181717?style=flat-square&logo=github)](https://github.com/AmanBhaskar16)
[![LeetCode](https://img.shields.io/badge/LeetCode-600%2B%20Solved%20·%201752%20Rating-FFA116?style=flat-square&logo=leetcode)](https://leetcode.com/u/Aman_Bhaskar16/)

</div>
# Ticket-Booking
