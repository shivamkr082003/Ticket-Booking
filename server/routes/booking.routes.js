import express from "express";
import {initiateBooking,confirmBooking,cancelBooking,getMyBookings,getBooking,getAllBookings,getOwnerBookings,getRefundQuote,getOrderQuote,checkInBooking} from "../controllers/booking.controller.js";
import { isAuthenticated, isAdmin, isAdminOrClient } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {initiateBookingSchema,confirmBookingSchema,cancelBookingSchema,quoteBookingSchema,checkInSchema} from "../validations/booking.validation.js";

const router = express.Router();

// ── CUSTOMER ──────────────────────────────────────────────
router.post("/bookings/quote",    isAuthenticated, validate(quoteBookingSchema),    getOrderQuote);
router.post("/bookings/initiate", isAuthenticated, validate(initiateBookingSchema), initiateBooking);
router.post("/bookings/check-in", isAuthenticated, isAdminOrClient, validate(checkInSchema), checkInBooking);
router.post("/bookings/confirm",  isAuthenticated, validate(confirmBookingSchema),  confirmBooking);
router.post("/bookings/cancel",   isAuthenticated, validate(cancelBookingSchema),   cancelBooking);
router.get ("/bookings/my",       isAuthenticated, getMyBookings);
router.get ("/bookings/owner",    isAuthenticated, isAdminOrClient, getOwnerBookings);   // before /:id
router.get ("/bookings/:id/refund-quote", isAuthenticated, getRefundQuote);
router.get ("/bookings/:id",      isAuthenticated, getBooking);

// ── ADMIN ─────────────────────────────────────────────────
router.get ("/bookings",          isAuthenticated, isAdmin, getAllBookings);

export default router;