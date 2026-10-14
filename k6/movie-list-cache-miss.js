import http from "k6/http";
import { check, sleep } from "k6";

// ── What this measures ──────────────────────────────────────
// Every request uses a DIFFERENT filter combination, so the cache key
// (services/cache.service.js hashes the filter object) is different every
// time. Redis will never have what's asked for, so every single request
// falls through to the real fetchMoviesService() -> MongoDB Atlas query.
// This is your "no caching" baseline — pure database latency under load.

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// A pool of genres to randomize across — swap these for real genre values
// that exist in your actual movie data, so queries return real results
// (an empty result set is still a valid DB round-trip, so this isn't
// strictly required for the latency measurement, but is more realistic).
const GENRES = ["Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "SciFi", "Animation"];

export const options = {
    stages: [
        { duration: "10s", target: 20 },  // ramp up to 20 concurrent users
        { duration: "20s", target: 20 },  // hold at 20 for 20s
        { duration: "5s",  target: 0 },   // ramp down
    ],
    thresholds: {
        http_req_duration: ["p(95)<2000"], // fail the run if p95 exceeds 2s (adjust as needed)
    },
};

export default function () {
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    const page = Math.floor(Math.random() * 5) + 1; // random page 1-5
    // Random component guarantees a near-unique filter combo per request,
    // making a genuine cache hit astronomically unlikely.
    const cacheBuster = Math.floor(Math.random() * 1000000);

    const res = http.get(
        `${BASE_URL}/api/v1/movies?genre=${genre}&page=${page}&_r=${cacheBuster}`
    );

    check(res, {
        "status is 200": (r) => r.status === 200,
    });

    sleep(0.1);
}
