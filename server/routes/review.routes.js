import express from "express";
import {
    createReview,
    updateReview,
    deleteReview,
    getMovieReviews,
    toggleLikeReview,
    getMyReview,
    getTopReviews,
} from "../controllers/review.controller.js";
import { isAuthenticated, isAdminOrClient } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createReviewSchema, updateReviewSchema } from "../validations/review.validation.js";

const router = express.Router();


// Top reviews for landing page (no auth)
router.get ("/reviews/top",getTopReviews);

// Movie reviews
router.get ("/movies/:movieId/reviews",     getMovieReviews);
router.get ("/movies/:movieId/reviews/my",  isAuthenticated, getMyReview);

// Review CRUD
router.post  ("/reviews",          isAuthenticated, validate(createReviewSchema), createReview);
router.patch ("/reviews/:id",      isAuthenticated, validate(updateReviewSchema), updateReview);
router.delete("/reviews/:id",      isAuthenticated, deleteReview);
router.post  ("/reviews/:id/like", isAuthenticated, toggleLikeReview);

export default router;