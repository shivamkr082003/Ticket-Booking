import express from "express";
import { getPrimePlan, getPrimeStatus, subscribePrime, confirmPrime } from "../controllers/prime.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { confirmPrimeSchema } from "../validations/prime.validation.js";

const router = express.Router();

// ── PUBLIC ────────────────────────────────────────────────
router.get ("/prime/plan",      getPrimePlan);

// ── MEMBER ────────────────────────────────────────────────
router.get ("/prime/me",        isAuthenticated, getPrimeStatus);
router.post("/prime/subscribe", isAuthenticated, subscribePrime);
router.post("/prime/confirm",   isAuthenticated, validate(confirmPrimeSchema), confirmPrime);

export default router;
