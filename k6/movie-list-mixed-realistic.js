import http from "k6/http";
import { check, sleep } from "k6";

// ── What this measures ──────────────────────────────────────
// A realistic blend, not an artificial extreme: most real users browse a
// small set of popular views (homepage, top genres, page 1) which stay
// warm in Redis — but some fraction always search/filter in ways nobody
// else has, which are guaranteed cache misses. This estimates your actual
// blended p95 under normal traffic, sitting between the two pure
// cache-hit / cache-miss numbers measured separately.

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// A small, fixed set of "popular" filters — these are the ones that stay
// warm in Redis, the same way a real homepage/top-genres page would.
const POPULAR_FILTERS = [
    "genre=Action&page=1",
    "genre=Comedy&page=1",
    "genre=Drama&page=1",
    "page=1",                 // e.g. the default/homepage listing
    "genre=Action&page=2",
];

const RARE_GENRES = ["Horror", "Thriller", "Romance", "SciFi", "Animation", "Documentary", "Musical"];

export const options = {
    stages: [
        { duration: "10s", target: 30 },
        { duration: "30s", target: 30 },
        { duration: "5s",  target: 0 },
    ],
    thresholds: {
        http_req_duration: ["p(95)<2000"],
    },
};

export default function () {
    let url;

    // 80% of requests: pick one of the small set of popular filters —
    // these will be cache hits almost all of the time (after brief warm-up).
    if (Math.random() < 0.8) {
        const filter = POPULAR_FILTERS[Math.floor(Math.random() * POPULAR_FILTERS.length)];
        url = `${BASE_URL}/api/v1/movies?${filter}`;
    } else {
        // 20% of requests: a near-unique filter combo — guaranteed cache misses,
        // modeling users doing uncommon searches/filters.
        const genre = RARE_GENRES[Math.floor(Math.random() * RARE_GENRES.length)];
        const page = Math.floor(Math.random() * 10) + 1;
        const cacheBuster = Math.floor(Math.random() * 1000000);
        url = `${BASE_URL}/api/v1/movies?genre=${genre}&page=${page}&_r=${cacheBuster}`;
    }

    const res = http.get(url);

    check(res, {
        "status is 200": (r) => r.status === 200,
    });

    sleep(0.1);
}
