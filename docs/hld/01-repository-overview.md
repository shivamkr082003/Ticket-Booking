# 01 · Repository overview

[← Back to index](README.md)

## Snapshot

| Item | Value |
|---|---|
| Repository | `shivamkr082003/Ticket-Booking` (git remote `origin`) |
| Commit analysed | `f8142b3` on `main` (21 Oct 2026). The working tree had no uncommitted application changes; only this `docs/` folder is new. |
| Shape | Monorepo with two deployable apps: `client/` (React SPA) and `server/` (Node.js API). One backend process — a **modular monolith**, not microservices. |
| Size (approx.) | `server/services/*.js` ≈ 2,950 lines · `server/tests/services/*.js` ≈ 1,390 lines |

## Technology stack (from manifests, confirmed by imports)

### Frontend — `client/package.json`

| Concern | Library | Evidence of use |
|---|---|---|
| UI | React `^19.2.0` + TypeScript `~5.9.3` | `client/src/**/*.tsx` |
| Build/dev server | Vite `^7.3.1` | `client/vite.config.ts` |
| Styling | Per-component CSS + Tailwind `^4.2.1` (via `@tailwindcss/vite`) | `client/src/index.css` imports `tailwindcss` |
| Routing | `react-router-dom ^7.13.1` | `client/src/App.tsx` (`<Route path=…>`) |
| HTTP | `axios ^1.13.6` | `client/src/api/index.api.ts` (single instance, interceptors) |
| Real-time | `socket.io-client ^4.8.3` | `client/src/context/SocketContext.tsx`, `client/src/hooks/useShowSocket.ts` |
| Payments | `@stripe/stripe-js ^8.9.0`, `@stripe/react-stripe-js ^5.6.1` | `PaymentPage.tsx`, `PaymentForm.tsx`, `PrimePage.tsx`, `WalletPage.tsx` |
| Animation | `framer-motion ^12.35.0` | UI components |
| QR codes | `qrcode ^1.5.4` | Ticket page |

### Backend — `server/package.json`

| Concern | Library | Evidence of use |
|---|---|---|
| Runtime | Node.js (22 in CI, Docker and `render.yaml`; developer machine runs 26) | `.github/workflows/ci.yml`, `server/Dockerfile`, `render.yaml` |
| HTTP framework | Express `^5.2.1` | `server/index.js` |
| Database / ODM | MongoDB via Mongoose `^9.2.4` | `server/config/db.js`, `server/models/*.js` |
| Cache, locks, pub/sub | `redis ^6.1.0` (node-redis) + `@socket.io/redis-adapter ^8.3.0` | `server/config/redis.js`, `server/socket.js`, `server/services/cache.service.js` |
| Real-time | `socket.io ^4.8.3` | `server/socket.js` |
| Payments | `stripe ^20.4.1` | `server/services/stripe.service.js`, `booking/prime/wallet` services |
| Auth | `jsonwebtoken ^9.0.3`, `bcryptjs ^3.0.3` | `auth.controller.js`, `auth.middleware.js`, `user.model.js` |
| Validation | `zod ^4.3.6` | `server/validations/*.js` + `validation.middleware.js` |
| Hardening | `helmet ^8.3.0`, `express-rate-limit ^8.6.0`, `cors` | `server/index.js` |
| Uploads | `multer ^2.1.1` (memory storage) + `cloudinary ^2.9.0` | `server/routes/upload.routes.js`, `services/cloudinary.service.js` |
| Email | `nodemailer ^8.0.2` (SMTP + MIME composition), Gmail REST API via `fetch` | `server/services/email.service.js` |
| Tests | `vitest ^4.1.10`, `mongodb-memory-server ^11.2.0` | `server/tests/**`, `server/vitest.config.js` |
| Load tests | k6 scripts | `k6/*.js`, `PERFORMANCE.md` |

**Not found in repository:** message brokers (Kafka, RabbitMQ, SQS), job queues (BullMQ, Agenda), an ORM migration system, GraphQL, a search engine, structured logging or metrics (no Winston/Pino/Prometheus/Sentry), a Stripe webhook route, server-side rendering.

## Directory layout

```text
client/src/
  api/index.api.ts        one Axios instance + typed API objects (moviesApi, showsApi, bookingsApi, …)
  context/                AuthContext, SocketContext, CityContext, ThemeContext
  hooks/                  useShowSocket (seat events), useMovie(s), useWatchlist
  pages/                  HomePage, movies/, booking/ (SeatSelection, Payment, Ticket, MyBookings),
                          admin/ (AdminPanel, ClientPanel), prime/, wallet/, profile/, help/, legal/
  components/             booking/ (SeatGrid, BookingSummary, PaymentForm, FoodPicker…), dashboard/, home/, common/
server/
  index.js                bootstraps DB, middleware, routes, Redis, Socket.io, setInterval jobs
  socket.js               seat-lock events over Socket.io + Redis
  config/                 db.js (Mongoose), redis.js (3 Redis clients)
  routes/                 15 route modules mounted under /api/v1
  middlewares/            auth, ownership, validation (Zod), audit, user
  controllers/            13 controllers
  services/               business logic (booking, pricing, wallet, prime, cache, email…)
  models/                 13 Mongoose models
  utils/                  seatLayout, dynamicPricing, refundPolicy, constants, response.utils
  validations/            10 Zod schema files
  scripts/seed.js         demo data generator (not used at runtime)
  tests/                  vitest suites + in-memory replica set setup
k6/                       load-test scripts
docker-compose.yml        local stack: redis + server + client (Mongo stays on Atlas)
render.yaml               Render blueprint for the API
.vercelignore             keeps server/ and .env files out of Vercel uploads
```

## Evidence inventory

| Design area | Evidence inspected |
|---|---|
| Application architecture | `server/index.js`, `server/socket.js`, `server/config/*`, `client/src/App.tsx`, `client/src/context/*` |
| APIs | `server/routes/*.js`, `server/controllers/*.js`, `server/validations/*.js`, `client/src/api/index.api.ts` |
| Business logic | `server/services/*.js`, `server/utils/{seatLayout,dynamicPricing,refundPolicy}.js` |
| Data model | `server/models/*.js` (no migrations exist; schemas are the source of truth) |
| Booking workflow | `booking.service.js`, `pricing.service.js`, `SeatSelectionPage.tsx`, `useShowSocket.ts` |
| Payment workflow | `booking.service.js`, `prime.service.js`, `wallet.service.js`, `PaymentPage.tsx`, `PaymentForm.tsx` (no webhook handlers exist) |
| Background processing | `server/index.js` (`setInterval`), `expireStaleBookingsService`, `sendShowRemindersService` |
| Security | `auth.middleware.js`, `ownership.middleware.js`, `auth.controller.js`, `user.service.js`, `upload.routes.js`, `index.js` |
| Deployment | `render.yaml`, `.vercelignore`, `server/Dockerfile`, `client/Dockerfile`, `client/nginx.conf`, `docker-compose.yml`, `.github/workflows/ci.yml`, `server/vercel.json`, `client/vercel.json` |
| Testing | `server/tests/services/*.test.js` (8 files, 63 tests), `server/tests/setup/*`, `k6/*.js`, `PERFORMANCE.md` |

## Environment configuration

Configuration comes from `.env` files (git-ignored) locally and from the Render/Vercel dashboards in production. Only **names** are listed; no values were copied.

| App | Variables |
|---|---|
| server | `PORT`, `CLIENT_URL`, `MONGODB_URI`, `REDIS_URL`, `AUTH_KEY` (JWT secret), `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, optional `LOAD_TEST` |
| client | `VITE_API_BASE_URL`, `VITE_STRIPE_PUBLISHABLE_KEY` (both baked in at build time) |

**Verified limitation:** there is no `.env.example` file, even though the README's setup steps refer to one.
