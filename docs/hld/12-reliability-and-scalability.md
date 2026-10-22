# 12 · Reliability and scalability

[← Back to index](README.md)

## 1. Current runtime profile (facts)

| Item | Value | Source |
|---|---|---|
| API instances | 1 (Render free web service) | `render.yaml` (`plan: free`) |
| Instance behaviour | Sleeps after ~15 min without traffic; cold start ~50 s; UptimeRobot pings `/health` every 5 min to keep it awake | Render free tier; UptimeRobot configured outside the repo |
| Database | MongoDB Atlas `cluster0` (tier and region not recorded in the repo) | `MONGODB_URI` host |
| Redis | Redis Cloud (tier and region not recorded in the repo) | `REDIS_URL` host |
| Data volume (seeded) | 23 movies · 15 theatres · 46 screens · 3,858 shows · ~15.7 k bookings · 41 customers | `npm run seed` output, 16 Oct 2026 |
| Production traffic | **No measurements exist.** There is no analytics, metrics or APM in the repository. | — |

## 2. Measurements that do exist

### k6 load test of `GET /api/v1/movies` (16 Oct 2026, local server, Docker Redis, Atlas)

Copied from [`PERFORMANCE.md`](../../PERFORMANCE.md):

| | Cache miss (MongoDB) | Mixed 80/20 | Cache hit (Redis) |
|---|---:|---:|---:|
| Virtual users | 20 | 30 | 20 |
| p95 latency | 592 ms | 70 ms | 7.1 ms |
| Throughput | 51 req/s | 214 req/s | 150 req/s |
| Errors | 0 | 0 | 0 |

Throughput was capped by the scripts' 100 ms think time, so latency is the meaningful comparison. Cache-miss latency includes the round trip from India to Atlas.

### Production response size and time (17 Oct 2026, single request each, gzip)

| Endpoint | Size | Time |
|---|---:|---:|
| `GET /shows?upcoming=true` (homepage ShowtimePicker, MoviePage) | 627,603 B | 11.8 s |
| `GET /shows` (AdminPanel, ClientPanel load all shows) | 1,709,574 B | 31.2 s |

These are single samples on a free instance, not a benchmark. They do show the endpoint is the heaviest in the app.

## 3. Bottlenecks and risks

| # | Issue | Evidence | Why it matters | Verified / plausible | Severity | Fix | Change type |
|---|---|---|---|---|---|---|---|
| R1 | `GET /shows` returns every matching show with **full** populated theatre (screens, menu) and movie | `show.service.js` `getShowsService`: `.populate("theatreId").populate("movieId")`, no limit | Payload grows with shows × theatre size; slow page loads, memory and CPU spikes on a small instance | Verified (measured) | High | Project needed fields (`theatreId: name city address`, `movieId: name posterUrl duration`), add `city`/`date` filters, paginate, add `{isActive, showTime}` and `{movieId, showTime}` indexes | Code + index |
| R2 | Payment confirmation depends on the browser | No webhook | Paid-but-unticketed bookings ([09 F2/F3](09-payment-and-failure-handling.md#f2-payment-succeeds-but-the-booking-expires)) | Verified | High | Stripe webhook | Code + config |
| R3 | Redis is a hard dependency | `await connectRedis()` before `listen`; `fetchMoviesService` has no cache-error fallback | A Redis outage stops the server from starting and breaks movie discovery while running | Verified (code) | Medium | Degrade gracefully: catch cache errors (as `stats.service.js` does), start without Redis, disable live locks | Code |
| R4 | Jobs run in the web process via `setInterval` | `server/index.js` | They sleep with the free instance; they run N times with N instances (guarded, so safe but wasteful); no visibility | Verified | Medium | Separate worker / scheduled job; or leader election via a Redis lock | Code + infra |
| R5 | Fire-and-forget email and notifications | `email.service.js` callers use `.catch(console.error)` | Lost OTPs and confirmations; mass email blocks nothing but burns quota | Verified | Medium | Queue with retries (BullMQ on the existing Redis) | Code + infra |
| R6 | Refund reconciliation missing | `refundStatus` `PENDING`/`FAILED` never revisited | Customers wait for money that may never come | Verified | Medium | Webhook `charge.refunded` + periodic reconciliation | Code |
| R7 | No readiness or health depth | `/health` returns a constant | Render can route to an instance whose DB/Redis is down | Verified | Low | `/health/ready` pinging MongoDB and Redis | Code |
| R8 | Collection scans in jobs and show queries | Indexes listed in [06](06-database-design.md#query-patterns-vs-indexes) | Fine at ~4 k shows; grows linearly | Plausible | Low (now) | Indexes `{status, createdAt}` on bookings, `{showTime}` on shows | Index |
| R9 | `bookedSeats` array per show | `show.model.js` | Each booking rewrites one hot document; contention at a popular release (write conflicts → retries) | Plausible (not load-tested) | Low (now) | Keep until measured; then per-seat docs or sharding by show | Schema |
| R10 | N+1-style work in jobs | `expireStaleBookingsService` cancels sequentially with several queries + Stripe calls each; `cancelBookingService` re-imports models and reloads user/show | Slow if many bookings expire at once | Verified (code), impact unmeasured | Low | Batch, parallelise with limits | Code |
| R11 | Shared response singletons | `response.utils.js` | Possible cross-request leakage of messages under concurrency | Plausible | Medium | Per-request objects | Code |
| R12 | No logging/metrics/tracing | — | Incidents are invisible; no p95/p99 from production | Verified (absence) | Medium | Structured logger (pino), request ids, error tracking, metrics | Code + infra |
| R13 | Socket.io sticky sessions | Socket.io polling fallback needs sticky sessions with >1 instance | Multi-instance scale-out would break the polling fallback | Plausible | Low (single instance today) | Sticky sessions at the load balancer, or WebSocket-only transport | Infra |

## 4. What scales well already

- **Stateless REST layer.** JWT auth and user reload per request, no in-memory session state. Seat locks live in Redis, and Socket.io broadcasts go through the Redis adapter. More API instances would work functionally (with R4 and R13 handled).
- **Hot reads cached.** Movie lists and details and platform stats.
- **Contention resolved in one place.** The conditional update on a single show document is cheap, and it stays correct under concurrency.
- **TTL indexes** keep `notifications` and `auditlogs` bounded.

## Capacity estimation (hypothetical)

> **Measured traffic is unavailable.** The numbers below are **interview assumptions**, not facts about this deployment. They show how to reason about scaling this design.

**Assumptions (hypothetical):**

| Assumption | Value |
|---|---|
| Daily active users | 200,000 |
| Page views per user per day | 15 |
| Share of page views that call `/movies` or `/shows` | 60 % |
| Bookings per day | 20,000 (10 % of DAU), 2.5 seats avg |
| Peak factor | 10× average (Friday evening, blockbuster release) |
| Hot release: one show | 300 seats, 5,000 users trying in the first 2 minutes |

**Calculations:**

| Quantity | Formula | Result |
|---|---|---|
| Read requests/day | 200,000 × 15 × 0.6 | 1.8 M |
| Average read RPS | 1.8 M / 86,400 | ≈ 21 |
| Peak read RPS | 21 × 10 | ≈ 210 |
| Booking initiates/day | 20,000 × ~1.5 attempts | 30,000 |
| Peak initiate RPS | 30,000 / 86,400 × 10 | ≈ 3.5 |
| Hot-show initiate rate | 5,000 attempts / 120 s | ≈ 42 per second **on one document** |
| Seats sold per day | 20,000 × 2.5 | 50,000 |
| Booking storage/year | ~1.5 KB × 20,000 × 365 | ≈ 11 GB |

**What this implies for this design:**

1. **Reads (≈210 RPS peak).** The k6 mixed test reached 214 req/s at 70 ms p95 on one local process, with the load generator itself as the cap. Movie reads are fine with caching. `GET /shows` in its current form is not, because each call is megabytes (R1). Fix R1 before anything else.
2. **Hot show (≈42 writes/s on one document).** Each initiate is a transaction that also calls Stripe inside the callback. Write conflicts make losers retry the whole callback, including Stripe calls. Expected outcome: many 409s (correct) plus elevated latency and orphan PaymentIntents. Mitigations, in order: move the Stripe call after the seat reservation commits (short transactions); per-user hold limits; a virtual waiting room in front of hot shows; only then per-seat documents.
3. **Storage.** About 11 GB per year of bookings fits a single replica set; archive old shows/bookings before sharding.
4. **Email.** 20 k confirmations plus reminders per day far exceeds a Gmail account's limits. A transactional provider and a queue are required (R5).

## 5. Proposed scalability roadmap (only after fixing correctness)

| Step | Trigger | Change |
|---|---|---|
| 1 | Now | Fix C1, C2 ([11](11-security-review.md)), add webhook, fix R1 |
| 2 | First paying traffic | Paid instance (no sleep), worker for jobs and email, structured logging + error tracking, readiness probe |
| 3 | Sustained > 1 instance | Load balancer with WebSocket support and sticky sessions, `trust proxy`, socket auth, one scheduler (leader lock) |
| 4 | Hot releases | Waiting room / queue per show, per-user hold limits, short transactions |
| 5 | Large catalogue / history | Read replicas for analytics and dashboards, archive old bookings, per-seat documents if write contention is measured |
