import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient, redisClient } from "./config/redis.js";

let io;

const BLOCK_TIMEOUT_SECONDS = 10 * 60; // 10 minutes — same window as before

// ── Redis key helpers ──────────────────────────────────────
// One key per (show, seat), e.g. "seat-lock:64f.../A1" -> JSON string.
// Using Redis's native TTL on each key replaces the old setTimeout-based
// cleanup entirely, and — unlike the old in-memory object — this state
// is shared by every server instance and survives a server restart.
const seatKey = (showId, seat) => `seat-lock:${showId}:${seat}`;
const socketSeatsKey = (socketId) => `socket-seats:${socketId}`;

// ── Init socket server ────────────────────────────────────
export const initSocket = async (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL ?? "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
        }
    });

    // Every io.to(room).emit(...) call below now gets published through
    // Redis, so it reaches sockets connected to ANY server instance,
    // not just this process.
    io.adapter(createAdapter(pubClient, subClient));

    io.on("connection", (socket) => {
        console.log("🔌 Socket connected:", socket.id);

        socket.on("join:show", async (showId) => {
            socket.join(`show:${showId}`);
            const blockedSeats = await getBlockedSeats(showId);
            socket.emit("seats:state", { showId, tempBlocked: blockedSeats });
        });

        socket.on("leave:show", (showId) => {
            socket.leave(`show:${showId}`);
        });

        socket.on("seats:selecting", async ({ showId, seats, userId }) => {
            const value = JSON.stringify({ userId, socketId: socket.id });

            // SET ... EX <seconds> atomically stores the value AND schedules
            // its own expiry — Redis handles the cleanup, we don't have to.
            await Promise.all(
                seats.map((seat) => redisClient.set(seatKey(showId, seat), value, { EX: BLOCK_TIMEOUT_SECONDS }))
            );

            // Track which seats this socket locked, so we can release them
            // on disconnect. This tracking set expires on the same timeline.
            await redisClient.sAdd(socketSeatsKey(socket.id), seats.map((s) => `${showId}:${s}`));
            await redisClient.expire(socketSeatsKey(socket.id), BLOCK_TIMEOUT_SECONDS);

            socket.to(`show:${showId}`).emit("seats:blocked", { showId, seats, userId });

            // No setTimeout needed here anymore — Redis's own TTL will
            // expire the seat-lock keys. We just notify clients afterward.
            setTimeout(() => {
                io.to(`show:${showId}`).emit("seats:released", { showId, seats, userId });
            }, BLOCK_TIMEOUT_SECONDS * 1000);
        });

        socket.on("seats:deselecting", async ({ showId, seats, userId }) => {
            await releaseTempSeats(showId, seats, userId);
            socket.to(`show:${showId}`).emit("seats:released", { showId, seats, userId });
        });

        socket.on("disconnect", async () => {
            console.log("🔌 Socket disconnected:", socket.id);
            await releaseBySocket(socket.id);
        });
    });

    return io;
};

// ── Get io instance ───────────────────────────────────────
export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};

// ── Emit booking confirmed (from booking service) ─────────
export const emitBookingConfirmed = async (showId, seats) => {
    if (!io) return;
    io.to(`show:${showId}`).emit("seats:booked", { showId, seats });
    await Promise.all(seats.map((seat) => redisClient.del(seatKey(showId, seat))));
};

// ── Emit booking cancelled (seats released) ───────────────
export const emitBookingCancelled = (showId, seats) => {
    if (!io) return;
    io.to(`show:${showId}`).emit("seats:released", { showId, seats });
};

// ── Helpers ───────────────────────────────────────────────

// Reads all currently-locked seats for a show. SCAN (not KEYS) is used
// deliberately — KEYS blocks the entire Redis server until it finishes
// scanning every key in the database, which is fine on your laptop but a
// real outage risk in production with millions of keys. SCAN walks the
// keyspace in small batches instead.
const getBlockedSeats = async (showId) => {
    const seats = [];
    // node-redis v6's scanIterator yields BATCHES (arrays of keys) per
    // iteration, not one key at a time — verified against a live Redis
    // instance, since this differs from older client versions/docs.
    for await (const batch of redisClient.scanIterator({ MATCH: seatKey(showId, "*"), COUNT: 100 })) {
        for (const key of batch) {
            seats.push(key.split(":").pop());
        }
    }
    return seats;
};

const releaseTempSeats = async (showId, seats, userId) => {
    await Promise.all(seats.map(async (seat) => {
        const raw = await redisClient.get(seatKey(showId, seat));
        if (!raw) return;
        const { userId: lockOwner } = JSON.parse(raw);
        // Only release seats this user actually holds — otherwise one
        // user's deselect could accidentally release someone else's lock.
        if (lockOwner === userId) await redisClient.del(seatKey(showId, seat));
    }));
};

const releaseBySocket = async (socketId) => {
    const key = socketSeatsKey(socketId);
    const entries = await redisClient.sMembers(key);
    if (entries.length === 0) return;

    const byShow = {};
    for (const entry of entries) {
        const [showId, seat] = entry.split(":");
        (byShow[showId] ??= []).push(seat);
        await redisClient.del(seatKey(showId, seat));
    }
    await redisClient.del(key);

    for (const [showId, seats] of Object.entries(byShow)) {
        io.to(`show:${showId}`).emit("seats:released", { showId, seats });
    }
};
