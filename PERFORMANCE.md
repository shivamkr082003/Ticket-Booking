# Performance: Redis caching on the movie list

This measures how much the Redis cache-aside layer speeds up `GET /api/v1/movies`, the endpoint behind the home page, the movie listing, and the filters.

## Results

Measured on 16 Oct 2026 with the k6 scripts in [`k6/`](./k6).

| Metric | Cache miss (MongoDB) | Realistic mixed traffic | Cache hit (Redis) |
|---|---:|---:|---:|
| Virtual users | 20 | 30 | 20 |
| Requests | 1,798 | 9,661 | 5,249 |
| Median latency | 71.9 ms | 2.75 ms | 5.03 ms |
| p90 latency | 575.9 ms | 60.1 ms | 6.52 ms |
| **p95 latency** | **592.0 ms** | **69.8 ms** | **7.14 ms** |
| Max latency | 1.88 s | 317.6 ms | 85.0 ms |
| Throughput | 51 req/s | 214 req/s | 150 req/s |
| Failed requests | 0 | 0 | 0 |

- With realistic mixed traffic, p95 latency drops from 592 ms to 70 ms, about **8.5× faster** than going to MongoDB every time.
- When every request hits the cache, p95 is 7 ms, about **83× faster**.
- No request failed in any run.

## What each test does

All three scripts call `GET /api/v1/movies`. Each virtual user waits 100 ms between requests.

| Script | Traffic | What it isolates |
|---|---|---|
| [`movie-list-cache-miss.js`](./k6/movie-list-cache-miss.js) | A random `_r` value makes every query unique, so Redis never has the answer. | Pure MongoDB latency (no caching) |
| [`movie-list-cache-hit.js`](./k6/movie-list-cache-hit.js) | The same query every time. Only the first request goes to MongoDB. | Pure Redis read latency |
| [`movie-list-mixed-realistic.js`](./k6/movie-list-mixed-realistic.js) | 80% of requests use five popular filters, 20% use unique filters. | What real browsing looks like |

The cache key is an MD5 hash of the sorted query string, so any extra parameter (like `_r`) produces a new key.

## How to read the numbers

- **Throughput is capped by the test, not the server.** With 20 users each pausing 100 ms, the ceiling is about 200 req/s. The cache-hit run reaches 150 req/s because it spends part of its time ramping up and down. The mixed run uses 30 users, so it goes higher. Compare the cache-miss and cache-hit runs by **latency**, not throughput.
- **Cache-miss latency includes the internet.** MongoDB is a cloud Atlas cluster, so every miss pays a network round trip from India to the cluster. The median miss is 72 ms. The p95 of 592 ms shows the cluster slowing down under 20 concurrent queries. A database in the same region as the server would have a lower miss latency, which would make the gap smaller.
- **Redis is local.** Redis ran in Docker on the same machine, so a cache hit has almost no network cost. With a hosted Redis, every hit would also pay a network round trip.
- **Small dataset.** The database held 23 movies (demo seed data). A larger collection would make the MongoDB queries slower, but would not change cache-hit latency.

## Setup

| | |
|---|---|
| Machine | Apple M4, 16 GB RAM, macOS |
| API server | Node.js v26.8.2, one process, running locally |
| Redis | `redis:7-alpine` in Docker, local |
| MongoDB | MongoDB Atlas (cloud) |
| Load tool | k6 v2.3.0, on the same machine |
| Data | `npm run seed` (23 movies) |

## How to reproduce

The API allows 300 requests per IP every 15 minutes, which would block a load test. Setting `LOAD_TEST=true` turns that general limit off. The stricter login and OTP limits stay on. **Never set it in production.**

```bash
# 1. Local Redis (port 6390, to avoid clashing with anything on 6379)
docker run -d --rm --name bench-redis -p 6390:6379 redis:7-alpine

# 2. API server pointed at it, with the rate limit off
cd server
PORT=3100 REDIS_URL=redis://localhost:6390 LOAD_TEST=true node index.js

# 3. In another terminal, from the repo root (install k6 first: brew install k6)
k6 run -e BASE_URL=http://localhost:3100 k6/movie-list-cache-miss.js
k6 run -e BASE_URL=http://localhost:3100 k6/movie-list-cache-hit.js
k6 run -e BASE_URL=http://localhost:3100 k6/movie-list-mixed-realistic.js

# 4. Clean up
docker stop bench-redis
```

Run the cache-miss test first, while Redis is still empty. Expect your numbers to differ, depending on your machine and on how far you are from the Atlas cluster.
