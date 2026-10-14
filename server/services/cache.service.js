import crypto from "crypto";
import { redisClient } from "../config/redis.js";

// ── Generic cache-aside helpers ────────────────────────────
// Any read path can use `getOrSetCache` instead of hand-rolling
// get -> miss -> query -> set every time.

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

export const getCache = async (key) => {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
};

export const setCache = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

export const deleteCache = async (key) => {
    await redisClient.del(key);
};

// Wraps a DB-fetching function with cache-aside behavior:
// cache hit -> return cached value, never touch the DB.
// cache miss -> run fetchFn(), cache its result, return it.
export const getOrSetCache = async (key, fetchFn, ttlSeconds = DEFAULT_TTL_SECONDS) => {
    const cached = await getCache(key);
    if (cached !== null) return cached;

    const fresh = await fetchFn();
    // Fire-and-forget: don't make the response wait on the cache write.
    setCache(key, fresh, ttlSeconds).catch((err) => console.error("Cache write failed:", err.message));
    return fresh;
};

// ── Movie-specific cache keys & invalidation ──────────────

const MOVIE_KEY = (id) => `cache:movie:${id}`;
const LIST_VERSION_KEY = "cache:movies:list:version";

// Every list cache key is namespaced under the current version number.
// Bumping the version (on any movie write) instantly "invalidates" every
// previously cached list response, without deleting anything explicitly —
// old-version keys are simply never read again and expire on their own TTL.
const getListVersion = async () => {
    const version = await redisClient.get(LIST_VERSION_KEY);
    return version ?? "0";
};

const buildListKey = (version, filter) => {
    // Sort keys so {genre:"x",page:1} and {page:1,genre:"x"} hash identically.
    const sorted = Object.keys(filter).sort().reduce((acc, k) => {
        acc[k] = filter[k];
        return acc;
    }, {});
    const hash = crypto.createHash("md5").update(JSON.stringify(sorted)).digest("hex");
    return `cache:movies:list:v${version}:${hash}`;
};

export const getCachedMovieList = async (filter) => {
    const version = await getListVersion();
    return getCache(buildListKey(version, filter));
};

export const cacheMovieList = async (filter, result) => {
    const version = await getListVersion();
    // Shorter TTL than single movies — safety net in case an invalidation
    // is ever missed somewhere, this still self-heals within 5 minutes.
    await setCache(buildListKey(version, filter), result, 5 * 60);
};

export const invalidateMovieListCache = async () => {
    await redisClient.incr(LIST_VERSION_KEY);
};

export const getCachedMovie = (id) => getCache(MOVIE_KEY(id));

export const cacheMovie = (id, movie) => setCache(MOVIE_KEY(id), movie, DEFAULT_TTL_SECONDS);

export const invalidateMovie = (id) => deleteCache(MOVIE_KEY(id));
