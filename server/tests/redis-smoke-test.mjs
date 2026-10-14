import { redisClient, connectRedis, pubClient, subClient } from "../config/redis.js";

const assert = (cond, msg) => {
    if (!cond) throw new Error("FAILED: " + msg);
    console.log("✅", msg);
};

await connectRedis();

// ── Mimic seats:selecting ──────────────────────────────────
const showId = "show123";
const seatKey = (s) => `seat-lock:${showId}:${s}`;

await redisClient.set(seatKey("A1"), JSON.stringify({ userId: "u1", socketId: "sock1" }), { EX: 5 });
await redisClient.set(seatKey("A2"), JSON.stringify({ userId: "u1", socketId: "sock1" }), { EX: 5 });

const ttl = await redisClient.ttl(seatKey("A1"));
assert(ttl > 0 && ttl <= 5, `TTL is set correctly on seat-lock key (got ${ttl}s)`);

// ── Mimic join:show (scanIterator) ─────────────────────────
const found = [];
for await (const batch of redisClient.scanIterator({ MATCH: seatKey("*"), COUNT: 100 })) {
    for (const key of batch) found.push(key.split(":").pop());
}
assert(found.sort().join(",") === "A1,A2", `scanIterator finds both locked seats (found: ${found})`);

// ── Mimic socket-seats tracking set ────────────────────────
await redisClient.sAdd("socket-seats:sock1", [`${showId}:A1`, `${showId}:A2`]);
await redisClient.expire("socket-seats:sock1", 5);
const members = await redisClient.sMembers("socket-seats:sock1");
assert(members.length === 2, `sAdd/sMembers tracks seats for a socket (got ${members.length})`);

// ── Mimic disconnect release ────────────────────────────────
await redisClient.del(seatKey("A1"));
await redisClient.del(seatKey("A2"));
await redisClient.del("socket-seats:sock1");
const remaining = [];
for await (const batch of redisClient.scanIterator({ MATCH: seatKey("*"), COUNT: 100 })) {
    remaining.push(...batch);
}
assert(remaining.length === 0, "release cleans up all seat-lock keys");

// ── Mimic ownership-checked release (deselecting) ──────────
await redisClient.set(seatKey("B1"), JSON.stringify({ userId: "u1" }), { EX: 5 });
const raw = await redisClient.get(seatKey("B1"));
const { userId } = JSON.parse(raw);
assert(userId === "u1", "GET + JSON.parse round-trips correctly for ownership check");
await redisClient.del(seatKey("B1"));

// ── Redis Socket.io adapter clients ────────────────────────
assert(pubClient.isReady, "pub client (for Socket.io adapter) connects");
assert(subClient.isReady, "sub client (for Socket.io adapter) connects");

console.log("\n🎉 All Redis smoke tests passed.");
process.exit(0);
