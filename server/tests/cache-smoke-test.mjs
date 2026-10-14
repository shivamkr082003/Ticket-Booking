import { connectRedis, redisClient } from "../config/redis.js";
import {
    getOrSetCache,
    getCachedMovieList, cacheMovieList, invalidateMovieListCache,
    getCachedMovie, cacheMovie, invalidateMovie,
} from "../services/cache.service.js";

const assert = (cond, msg) => {
    if (!cond) throw new Error("FAILED: " + msg);
    console.log("✅", msg);
};

await connectRedis();
await redisClient.flushDb(); // clean slate for this test run

// ── getOrSetCache: generic cache-aside wrapper ─────────────
let dbCalls = 0;
const fakeFetch = async () => { dbCalls++; return { id: 1, name: "Inception" }; };

const r1 = await getOrSetCache("test:movie:1", fakeFetch);
const r2 = await getOrSetCache("test:movie:1", fakeFetch);
assert(dbCalls === 1, `second call is served from cache, not the DB (dbCalls=${dbCalls})`);
assert(r1.name === "Inception" && r2.name === "Inception", "cached value matches original");

// ── Single movie cache ──────────────────────────────────────
await cacheMovie("movie123", { name: "Dune" });
const cachedMovie = await getCachedMovie("movie123");
assert(cachedMovie.name === "Dune", "single movie cache read-after-write works");

await invalidateMovie("movie123");
const afterInvalidate = await getCachedMovie("movie123");
assert(afterInvalidate === null, "invalidateMovie clears the cache entry");

// ── Movie list cache + versioning ──────────────────────────
const filterA = { genre: "action", page: 1 };
const filterB = { page: 1, genre: "action" }; // same filter, different key order

await cacheMovieList(filterA, { movies: ["Matrix"] });
const hitB = await getCachedMovieList(filterB);
assert(hitB?.movies?.[0] === "Matrix", "key order doesn't matter — filterA and filterB hash the same");

// Bump version (simulating a movie being created/updated)
await invalidateMovieListCache();
const afterBump = await getCachedMovieList(filterA);
assert(afterBump === null, "bumping the list version invalidates ALL previously cached list queries at once");

// New writes after the bump should populate cleanly again
await cacheMovieList(filterA, { movies: ["Oppenheimer"] });
const freshHit = await getCachedMovieList(filterA);
assert(freshHit?.movies?.[0] === "Oppenheimer", "new list cache entries work fine after a version bump");

await redisClient.flushDb();
console.log("\n🎉 All cache smoke tests passed.");
process.exit(0);
