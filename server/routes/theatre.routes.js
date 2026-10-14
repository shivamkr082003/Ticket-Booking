import express from "express";
import { validate } from "../middlewares/validation.middleware.js";
import { theatreCreateSchema, theatreUpdateSchema } from "../validations/theatre.validation.js";
import { isAuthenticated, isAdminOrClient, isAdmin } from './../middlewares/auth.middleware.js';
import { addTheatre, checkMovies, deleteTheatre, getTheatre, getTheatreCities, getTheatreMovies, getTheatres, updateMovies, updateTheatre, updateTheatreStatus } from "../controllers/theatre.controller.js";
import { ownsTheatreParam } from "../middlewares/ownership.middleware.js";
import { getTheatreReviews, getMyTheatreReview, putTheatreReview, delTheatreReview } from "../controllers/theatreReview.controller.js";
import { theatreReviewSchema } from "../validations/theatreReview.validation.js";

const router = express.Router();

// ── PUBLIC ────────────────────────────────────────────────
router.get("/theatres",                             getTheatres);
router.get("/theatres/cities",                      getTheatreCities);   // before /:id
router.get("/theatres/:id",                         getTheatre);
router.get("/theatres/:id/movies",                  getTheatreMovies);
router.get("/theatres/:theatreId/movies/:movieId",  checkMovies);
router.get("/theatres/:id/reviews",                 getTheatreReviews);

// ── CUSTOMERS — verified-visit reviews ───────────────────
router.get   ("/theatres/:id/reviews/me", isAuthenticated, getMyTheatreReview);
router.put   ("/theatres/:id/reviews/me", isAuthenticated, validate(theatreReviewSchema), putTheatreReview);
router.delete("/theatres/:id/reviews/me", isAuthenticated, delTheatreReview);
 
// ── CLIENT or ADMIN ───────────────────────────────────────
router.post  ("/theatres",              isAuthenticated, isAdminOrClient, validate(theatreCreateSchema), addTheatre);
router.patch ("/theatres/:id",          isAuthenticated, isAdminOrClient, ownsTheatreParam, validate(theatreUpdateSchema), updateTheatre);
router.patch ("/theatres/:id/movies",   isAuthenticated, isAdminOrClient, ownsTheatreParam, updateMovies);
router.patch ("/theatres/:id/status",   isAuthenticated, isAdminOrClient, ownsTheatreParam, updateTheatreStatus);  // soft delete
 
// ── ADMIN ONLY ────────────────────────────────────────────
router.delete("/theatres/:id",          isAuthenticated, isAdmin, deleteTheatre); // hard delete
export default router;