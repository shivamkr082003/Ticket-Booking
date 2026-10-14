import { createClient } from "redis";

// Two separate connections are required for Socket.io's Redis adapter:
// one only ever publishes, one only ever subscribes. Redis clients in
// subscribe mode can't run normal commands, so they must be separate.
export const pubClient = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
export const subClient = pubClient.duplicate();

// A third, general-purpose client for our own seat-lock reads/writes
// (GET/SET/SCAN/DEL) — kept separate from the pub/sub pair above.
export const redisClient = pubClient.duplicate();

export const connectRedis = async () => {
    await Promise.all([pubClient.connect(), subClient.connect(), redisClient.connect()]);
    console.log("🔴 Redis connected");
};

[pubClient, subClient, redisClient].forEach((client) => {
    client.on("error", (err) => console.error("Redis client error:", err.message));
});
