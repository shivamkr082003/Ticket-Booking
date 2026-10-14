import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import {
    createReviewService,
    updateReviewService,
    deleteReviewService,
    getMovieReviewsService,
    toggleLikeReviewService,
    getUserReviewService,
    getTopReviewsService,
} from "../services/review.service.js";

// POST /reviews
export const createReview = async (req, res) => {
    try {
        const review = await createReviewService({
            movieId: req.body.movieId,
            userId:  req.user._id,
            rating:  req.body.rating,
            comment: req.body.comment,
        });
        successResponseBody.message = "Review added successfully";
        successResponseBody.data    = review;
        return res.status(STATUS_CODES.CREATED).json(successResponseBody);
    } catch (error) {
        if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
        errorResponseBody.err = error.message ?? error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};

// PATCH /reviews/:id
export const updateReview = async (req, res) => {
    try {
        const review = await updateReviewService({
            reviewId: req.params.id,
            userId:   req.user._id,
            rating:   req.body.rating,
            comment:  req.body.comment,
        });
        successResponseBody.message = "Review updated successfully";
        successResponseBody.data    = review;
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
        errorResponseBody.err = error.message ?? error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};

// DELETE /reviews/:id
export const deleteReview = async (req, res) => {
    try {
        await deleteReviewService({
            reviewId: req.params.id,
            userId:   req.user._id,
            isAdmin:  req.user.userRole === "ADMIN",
        });
        successResponseBody.message = "Review deleted successfully";
        successResponseBody.data    = null;
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
        errorResponseBody.err = error.message ?? error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};

// GET /movies/:movieId/reviews
export const getMovieReviews = async (req, res) => {
    try {
        const result = await getMovieReviewsService({
            movieId: req.params.movieId,
            page:    req.query.page,
            limit:   req.query.limit,
        });
        successResponseBody.message = "Reviews fetched successfully";
        successResponseBody.data    = result;
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
        errorResponseBody.err = error.message ?? error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};

// POST /reviews/:id/like
export const toggleLikeReview = async (req, res) => {
    try {
        const result = await toggleLikeReviewService({
            reviewId: req.params.id,
            userId:   req.user._id,
        });
        successResponseBody.message = result.liked ? "Review liked" : "Like removed";
        successResponseBody.data    = result;
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
        errorResponseBody.err = error.message ?? error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};

// GET /movies/:movieId/reviews/my
export const getMyReview = async (req, res) => {
    try {
        const review = await getUserReviewService({
            movieId: req.params.movieId,
            userId:  req.user._id,
        });
        successResponseBody.message = "Review fetched";
        successResponseBody.data    = review;
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
        errorResponseBody.err = error.message ?? error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};

// ── GET /reviews/top ──────────────────────────────────────
export const getTopReviews = async (req, res) => {
    try {
        const limit   = Math.min(Number(req.query.limit ?? 6), 20);
        const reviews = await getTopReviewsService(limit);
        successResponseBody.message = "Top reviews fetched";
        successResponseBody.data    = reviews;
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        errorResponseBody.err = error.message ?? "Failed to fetch reviews";
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};