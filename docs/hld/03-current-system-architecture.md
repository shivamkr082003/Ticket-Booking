# 03 · Current system architecture

[← Back to index](README.md)

Everything on this page describes what **exists today**. Proposals are kept in [14 · Design gaps and recommendations](14-design-gaps-and-recommendations.md).

## 1. System context

```mermaid
flowchart LR
    customer(["Customer (CUSTOMER)"])
    owner(["Theatre owner (CLIENT)"])
    admin(["Platform admin (ADMIN)"])

    subgraph cineverse["Cineverse (this repository)"]
        web["React SPA (client/)"]
        api["Express API + Socket.io (server/)"]
    end

    stripe[["Stripe (PaymentIntents, Refunds)"]]
    atlas[("MongoDB Atlas")]
    redis[("Redis (Redis Cloud in production)")]
    cloudinary[["Cloudinary (image/video storage)"]]
    gmail[["Gmail (Gmail API over HTTPS, or SMTP locally)"]]
    youtube[["YouTube / Wikimedia (trailer and poster URLs only)"]]

    customer -->|browse, book, pay, cancel| web
    owner -->|theatres, screens, shows, check-in| web
    admin -->|movies, users, coupons, support| web
    web -->|"REST /api/v1 (HTTPS, JWT header)"| api
    web <-->|"WebSocket (seat events)"| api
    web -->|card details via Stripe.js| stripe
    web -.->|embeds| youtube
    api -->|Mongoose| atlas
    api -->|cache, seat locks, pub/sub| redis
    api -->|create/retrieve/cancel PaymentIntent, refunds| stripe
    api -->|upload/delete| cloudinary
    api -->|OTP, confirmations, reminders| gmail
```

*Source: [diagrams/system-context.mmd](diagrams/system-context.mmd)*

External systems with real integrations: **MongoDB Atlas**, **Redis**, **Stripe**, **Cloudinary** and **Gmail**. YouTube and Wikimedia only appear as URLs stored in movie documents; the server never calls them.

## 2. High-level architecture

```mermaid
flowchart TB
    subgraph browser["User browser"]
        spa["React 19 SPA (Vite build)<br/>React Router, Axios, socket.io-client, Stripe.js"]
    end

    subgraph vercel["Vercel (static hosting)"]
        dist["client/dist (index.html + assets)"]
    end

    subgraph render["Render web service: single Node.js process (monolith)"]
        express["Express 5 app (server/index.js)<br/>helmet, CORS, rate limits, auditTrail"]
        routes["15 route modules under /api/v1"]
        services["Service layer (server/services)"]
        sock["Socket.io server (server/socket.js)"]
        cron["In-process setInterval jobs (every 5 min)<br/>expireStaleBookingsService, sendShowRemindersService"]
        express --> routes --> services
        cron --> services
    end

    atlas[("MongoDB Atlas<br/>13 collections, multi-document transactions")]
    redis[("Redis<br/>cache:* keys, seat-lock:* keys, Socket.io adapter pub/sub")]
    stripe[["Stripe API"]]
    cloud[["Cloudinary"]]
    mail[["Gmail API / SMTP"]]

    spa -->|loads| dist
    spa -->|"HTTPS REST /api/v1 (sync)"| express
    spa <-->|"WebSocket (async events)"| sock
    spa -->|confirmPayment| stripe
    services -->|Mongoose| atlas
    services -->|"node-redis (cache)"| redis
    sock -->|"seat-lock keys + redis-adapter"| redis
    services -->|"stripe SDK (sync calls)"| stripe
    services -->|upload_stream| cloud
    services -.->|"fire-and-forget emails"| mail
```

*Source: [diagrams/current-architecture.mmd](diagrams/current-architecture.mmd)*

### Architectural style

- **Modular monolith.** A single Node.js process (`server/index.js`) contains the REST API, the Socket.io server and the scheduled jobs. Modules are folders (routes → controllers → services → models), not separately deployed services.
- **Single-page application.** `client/` builds into static files. All data comes from the API at run time. There is no server-side rendering.
- **Shared database.** All modules read and write the same MongoDB database. The data ownership notes below are logical conventions only, not enforced boundaries.
- **Redis has three jobs:** a read-through cache (`cache:*`), short-lived seat locks (`seat-lock:*`, `socket-seats:*`) and the Socket.io pub/sub adapter. `config/redis.js` opens **three connections**: publisher, subscriber, and a general client.

### Server start-up sequence (`server/index.js`)

1. `dotenv.config()`, then `await connectDB()`. The process stops if MongoDB is unreachable.
2. Register middleware in order: `helmet()` → `cors({ origin: CLIENT_URL })` → `express.json()` → general rate limiter → stricter auth rate limiter on `/auth/signin|signup|verify-otp|resend-otp|reset` → `auditTrail`.
3. Mount 15 routers under `/api/v1`, plus `GET /` and `GET /health`.
4. Create the HTTP server, `await connectRedis()` (the process stops if Redis is unreachable), then `initSocket(httpServer)`.
5. `listen(PORT)`, then start two `setInterval` timers (5 minutes each): `expireStaleBookingsService` and `sendShowRemindersService`.

**Not found in repository:** a global Express error-handling middleware, graceful shutdown handling, or readiness checks (`/health` returns `ok` without touching MongoDB or Redis).

## 3. Communication paths

| From → To | Protocol | Sync / async | Notes |
|---|---|---|---|
| Browser → API | HTTPS REST, JSON | Synchronous request/response | JWT in the `x-access-token` header (Axios interceptor). 15 s client timeout. |
| Browser ↔ Socket.io | WebSocket (polling fallback) | Asynchronous events | Rooms per show: `show:<showId>`. The client sends `auth.token`, but the **server never checks it**. |
| Browser → Stripe | Stripe.js | Synchronous in the browser | Card data goes to Stripe directly. |
| API → MongoDB | Mongoose driver | Synchronous (awaited) | Transactions for booking, cancel, gift card redemption. |
| API → Redis | node-redis | Synchronous (awaited) | Cache reads/writes; cache writes are fire-and-forget. |
| API → Stripe | Stripe SDK | Synchronous (awaited) | PaymentIntent create/retrieve/cancel, refunds. |
| API → Gmail / SMTP | HTTPS / SMTP | **Fire-and-forget** promises in the request process | Failures are logged, never retried. |
| API → Cloudinary | HTTPS upload stream | Synchronous | Upload endpoints only. |
| Timers → services | In-process function calls | Asynchronous (every 5 min) | Runs in every server process. |

## 4. Frontend-to-backend request flow

The same layering applies to every REST call. Example: a customer opens a movie list.

```mermaid
sequenceDiagram
    autonumber
    participant P as Page (e.g. MoviePage.tsx)
    participant A as api/index.api.ts (Axios)
    participant E as Express middleware chain
    participant R as routes/movie.routes.js
    participant C as controllers/movie.controller.js getMovies
    participant S as services/movie.service.js fetchMoviesService
    participant K as services/cache.service.js
    participant M as models/movie.model.js

    P->>A: moviesApi.getAll({releaseStatus, isActive, limit})
    A->>E: GET /api/v1/movies?… (+ x-access-token if logged in)
    E->>E: helmet, cors, json, rate limit, auditTrail (no-op for GET)
    E->>R: route match
    R->>C: getMovies(req, res)
    C->>S: fetchMoviesService(req.query)
    S->>K: getCachedMovieList(filter) (version key + md5 of sorted filter)
    alt cache hit
        K-->>S: cached result
    else miss
        S->>M: Movie.find(query).sort().skip().limit() + countDocuments
        S-)K: cacheMovieList(filter, result) (TTL 300 s, not awaited)
    end
    S-->>C: {movies, pagination}
    C-->>A: 200 {success, message, err, data}
    A-->>P: extractArray(data, "movies")
```

### Response envelope

Every hand-written controller returns `{ success, message, err, data }`. These are **module-level objects that are shared and mutated across requests** (`server/utils/response.utils.js`). Zod validation failures instead return `400 { success: false, err: <zod flatten>, message: "Validation failed" }` from `validation.middleware.js`. See [11](11-security-review.md#m1-shared-mutable-response-objects) for the risk this creates.

### Authentication on the request path

```mermaid
flowchart LR
    req["Request with x-access-token"] --> auth{"isAuthenticated<br/>jwt.verify(AUTH_KEY)"}
    auth -- missing --> f403["403 No token provided"]
    auth -- invalid --> f401["401 (client clears token, redirects to /login)"]
    auth -- ok --> load["getUserById → req.user, req.userId"]
    load --> role{"Role guard?<br/>isAdmin / isAdminOrClient"}
    role -- role mismatch --> f403b["403 / 401"]
    role -- ok --> own{"Ownership guard?<br/>ownsTheatreParam / ownsTheatreInBody / ownsShowParam"}
    own -- not owner --> f403c["403 You can only manage your own theatres"]
    own -- ok --> zod{"validate(schema)"}
    zod -- invalid --> f400["400 Validation failed"]
    zod -- ok --> handler["Controller → service"]
```

Note: `userStatus` (`PENDING`, `REJECTED`) is checked **only at signin** (and only for `REJECTED`), never on later requests.

## 5. Backend module interactions

```mermaid
flowchart LR
    subgraph client["client/src"]
        pages["pages/*<br/>HomePage, MoviePage, SeatSelectionPage,<br/>PaymentPage, TicketPage, MyBookingsPage,<br/>AdminPanel, ClientPanel, WalletPage, PrimePage"]
        comps["components/*<br/>SeatGrid, BookingSummary, PaymentForm,<br/>FoodPicker, dashboard tabs"]
        ctx["context/*<br/>AuthContext, SocketContext,<br/>CityContext, ThemeContext"]
        hook["hooks/useShowSocket.ts"]
        apic["api/index.api.ts (Axios instance + typed API objects)"]
        pages --> comps
        pages --> apic
        pages --> hook --> ctx
    end

    subgraph server["server/"]
        mw["middlewares/<br/>auth (isAuthenticated, isAdmin, isAdminOrClient)<br/>ownership (ownsTheatreParam, ownsTheatreInBody, ownsShowParam)<br/>validation (Zod), audit (auditTrail)"]
        ctrl["controllers/ (13 files)"]
        svc["services/<br/>booking, pricing, show, theatre, movie, cache,<br/>wallet, prime, coupon, notification, email,<br/>support, payout, stats, review, theatreReview,<br/>watchlist, user, stripe, cloudinary"]
        utl["utils/<br/>seatLayout, dynamicPricing, refundPolicy,<br/>constants, response.utils"]
        mdl["models/ (13 Mongoose models)"]
        sk["socket.js"]
        mw --> ctrl --> svc --> mdl
        svc --> utl
        svc -->|emitBookingConfirmed / emitBookingCancelled| sk
    end

    apic -->|REST| mw
    hook <-->|"join:show, seats:selecting, seats:deselecting /<br/>seats:state, seats:blocked, seats:released, seats:booked"| sk
```

*Source: [diagrams/component-architecture.mmd](diagrams/component-architecture.mmd)*

### Data ownership (logical)

| Module (services) | Collections it writes |
|---|---|
| `user.service`, `auth.controller` | `users` |
| `movie.service`, `review.service` | `movies` (incl. cached `rating`), `reviews` |
| `theatre.service`, `theatreReview.service` | `theatres` (incl. cached `rating`), `theatrereviews` |
| `show.service` | `shows` (except `bookedSeats`) |
| `booking.service` | `bookings`, `shows.bookedSeats`, coupon `usedCount` |
| `wallet.service`, `prime.service` | `wallettxns`, `giftcards`, `users.walletBalance`, `users.prime*` |
| `notification.service`, `support.service` | `notifications`, `supporttickets` |
| `audit.middleware` | `auditlogs` |

Cross-module writes happen inside `booking.service` (Show + Booking + Wallet in one transaction) and in `cancelBookingService` (Booking + Show + Wallet).

## 6. Real-time subsystem

`server/socket.js` exposes these events:

| Direction | Event | Payload | Effect |
|---|---|---|---|
| client → server | `join:show` | `showId` | Join room `show:<id>`; reply `seats:state` with locked seats (Redis `SCAN seat-lock:<id>:*`). |
| client → server | `leave:show` | `showId` | Leave room. |
| client → server | `seats:selecting` | `{showId, seats, userId}` | `SET seat-lock:<show>:<seat>` with `EX 600`; track in `socket-seats:<socketId>`; broadcast `seats:blocked`; `setTimeout` 600 s to broadcast `seats:released`. |
| client → server | `seats:deselecting` | `{showId, seats, userId}` | Delete locks whose stored `userId` equals the payload's `userId`; broadcast `seats:released`. |
| (disconnect) | — | — | Release every lock recorded for that socket. |
| server → room | `seats:booked` | `{showId, seats}` | Sent by `emitBookingConfirmed` after payment; also deletes the lock keys. |
| server → room | `seats:released` | `{showId, seats}` | Sent on deselect, disconnect, timeout, or booking cancellation. |

The Redis adapter (`@socket.io/redis-adapter`) means room broadcasts would reach sockets on other server instances. Production runs a single instance today.
