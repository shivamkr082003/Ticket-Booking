import express from "express";
import { getOffers, getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../controllers/coupon.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { couponCreateSchema, couponUpdateSchema } from "../validations/coupon.validation.js";

const router = express.Router();

// ── PUBLIC — offers customers can apply right now ─────────
router.get("/offers", getOffers);

// ── ADMIN ─────────────────────────────────────────────────
router.get   ("/coupons",     isAuthenticated, isAdmin, getCoupons);
router.post  ("/coupons",     isAuthenticated, isAdmin, validate(couponCreateSchema), createCoupon);
router.patch ("/coupons/:id", isAuthenticated, isAdmin, validate(couponUpdateSchema), updateCoupon);
router.delete("/coupons/:id", isAuthenticated, isAdmin, deleteCoupon);

export default router;
