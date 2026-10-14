import http from "k6/http";
import { check, sleep } from "k6";

// ── What this measures ──────────────────────────────────────
// Every request uses the EXACT SAME filter, so it hashes to the same
// cache key every time. The very first request across the whole run is
// a cache miss (populates Redis); every request after that — across all
// virtual users — hits the cache. This isolates Redis read latency
// vs. the MongoDB baseline measured by the cache-miss script.

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
    stages: [
        { duration: "10s", target: 20 },
        { duration: "20s", target: 20 },
        { duration: "5s",  target: 0 },
    ],
    thresholds: {
        http_req_duration: ["p(95)<2000"],
    },
};

export default function () {
    // Fixed, identical query every single time — this is the whole point.
    const res = http.get(`${BASE_URL}/api/v1/movies?genre=Action&page=1`);

    check(res, {
        "status is 200": (r) => r.status === 200,
    });

    sleep(0.1);
}
