import express    from "express";
import dotenv     from "dotenv";
import cors       from "cors";
import http       from "http";
import helmet     from "helmet";
import rateLimit  from "express-rate-limit";
import connectDB  from "./config/db.js";
import { initSocket } from "./socket.js";
import { connectRedis } from "./config/redis.js";
import { expireStaleBookingsService } from "./services/booking.service.js";

import movieRoutes   from "./routes/movie.routes.js";
import authRoutes    from "./routes/auth.routes.js";
import userRoutes    from "./routes/user.routes.js";
import theatreRoutes from "./routes/theatre.routes.js";
import showRoutes    from "./routes/show.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import primeRoutes  from "./routes/prime.routes.js";
import statsRoutes  from "./routes/stats.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import meRoutes     from "./routes/me.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import payoutRoutes from "./routes/payout.routes.js";
import supportRoutes from "./routes/support.routes.js";
import { auditTrail } from "./middlewares/audit.middleware.js";
import { sendShowRemindersService } from "./services/notification.service.js";
dotenv.config();

const app = express();
await connectDB();
// ── Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin:      process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
// General rate limit — applies to every request, generous enough not to
// bother real users, but stops naive scraping/abuse.
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit:    300,             // 300 requests per IP per window
    standardHeaders: true,
    legacyHeaders:   false,
});
app.use(generalLimiter);

// Stricter limit specifically for auth/OTP endpoints — these are the ones
// that matter most for brute-force protection (login, signup, OTP verify).
// A real user fails a password/OTP a handful of times at most; this
// generously allows for typos while still blocking automated guessing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit:    20,              // 20 attempts per IP per 15 min
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: "Too many attempts. Please try again later.", err: {}, data: {} },
});

app.use("/api/v1/auth/signin", authLimiter);
app.use("/api/v1/auth/signup", authLimiter);
app.use("/api/v1/auth/verify-otp", authLimiter);
app.use("/api/v1/auth/resend-otp", authLimiter);
app.use("/api/v1/auth/reset", authLimiter);

// Staff changes are recorded after the response is sent
app.use(auditTrail);

// ── Routes ────────────────────────────────────────────────
app.get("/", (req, res) => res.send("API is running..."));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/v1", movieRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", theatreRoutes);
app.use("/api/v1", showRoutes);
app.use("/api/v1", bookingRoutes);
app.use("/api/v1", reviewRoutes);
app.use("/api/v1", uploadRoutes);
app.use("/api/v1", primeRoutes);
app.use("/api/v1", statsRoutes);
app.use("/api/v1", couponRoutes);
app.use("/api/v1", meRoutes);
app.use("/api/v1", walletRoutes);
app.use("/api/v1", payoutRoutes);
app.use("/api/v1", supportRoutes);

// ── HTTP Server + Socket.io ───────────────────────────────
const httpServer = http.createServer(app);
await connectRedis();
await initSocket(httpServer);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
    console.log(` Server running at http://localhost:${PORT}`);

    // ── Cron: expire stale bookings every 5 minutes ───────
    // Releases seats of abandoned bookings (payment not completed)
    setInterval(async () => {
        try {
            const count = await expireStaleBookingsService();
            if (count > 0) console.log(`Expired ${count} stale booking(s)`);
        } catch (e) {
            console.error("Cron error:", e.message);
        }
    }, 5 * 60 * 1000); // every 5 minutes

    // ── Cron: "your show starts in 3 hours" email + in-app reminder ──
    setInterval(async () => {
        try {
            const sent = await sendShowRemindersService();
            if (sent > 0) console.log(`Sent ${sent} show reminder(s)`);
        } catch (e) {
            console.error("Reminder cron error:", e.message);
        }
    }, 5 * 60 * 1000);
});