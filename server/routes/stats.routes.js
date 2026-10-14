import express from "express";
import { getPlatformStats } from "../controllers/stats.controller.js";

const router = express.Router();

// ── PUBLIC — landing page stats strip ────────────────────
router.get("/stats", getPlatformStats);

export default router;
