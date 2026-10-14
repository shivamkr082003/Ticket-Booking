import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import {
  getWatchlist, getWatchlistMovies, addToWatchlist, removeFromWatchlist, notifyOn, notifyOff, mergeWatchlist,
  getNotifications, readNotification, readAllNotifications,
} from "../controllers/me.controller.js";

const router = express.Router();

// ── Watchlist (synced to the account) ─────────────────────
router.get   ("/me/watchlist",                isAuthenticated, getWatchlist);
router.get   ("/me/watchlist/movies",         isAuthenticated, getWatchlistMovies);
router.post  ("/me/watchlist/merge",          isAuthenticated, mergeWatchlist);
router.put   ("/me/watchlist/:movieId",       isAuthenticated, addToWatchlist);
router.delete("/me/watchlist/:movieId",       isAuthenticated, removeFromWatchlist);
router.put   ("/me/notify/:movieId",          isAuthenticated, notifyOn);
router.delete("/me/notify/:movieId",          isAuthenticated, notifyOff);

// ── Notifications ─────────────────────────────────────────
router.get   ("/notifications",               isAuthenticated, getNotifications);
router.patch ("/notifications/read-all",      isAuthenticated, readAllNotifications);
router.patch ("/notifications/:id/read",      isAuthenticated, readNotification);

export default router;
