import mongoose from "mongoose";
import Review from "../models/review.model.js";
import Movie from "../models/movie.model.js";
import { STATUS_CODES } from "../utils/constants.js";

// ── Recalculate & save movie average rating ───────────────
const updateMovieRating = async (movieId) => {
  // console.log("updateMovieRating called for:", movieId, typeof movieId);
  const objectId = new mongoose.Types.ObjectId(movieId.toString());
  const result = await Review.aggregate([
    { $match: { movieId: objectId } },
    {
      $group: {
        _id: "$movieId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avgRating =
    result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : null;

  // console.log("Aggregate result:", result, "avgRating:", avgRating);
  await Movie.findByIdAndUpdate(movieId, { rating: avgRating });
  // console.log("Movie rating updated to:", avgRating);
  return avgRating;
};

// ── CREATE review ─────────────────────────────────────────
export const createReviewService = async ({
  movieId,
  userId,
  rating,
  comment,
}) => {
  // Check movie exists
  const movie = await Movie.findById(movieId);
  if (!movie) throw { err: "Movie not found", code: STATUS_CODES.NOT_FOUND };

  // Check user hasn't already reviewed
  const existing = await Review.findOne({ movieId, userId });
  if (existing)
    throw {
      err: "You have already reviewed this movie",
      code: STATUS_CODES.CONFLICT,
    };

  const review = await Review.create({ movieId, userId, rating, comment });

  // Update movie average rating
  await updateMovieRating(movieId);

  return await review.populate("userId", "name");
};

// ── UPDATE review ─────────────────────────────────────────
export const updateReviewService = async ({
  reviewId,
  userId,
  rating,
  comment,
}) => {
  const review = await Review.findById(reviewId);
  if (!review) throw { err: "Review not found", code: STATUS_CODES.NOT_FOUND };
  if (review.userId.toString() !== userId.toString())
    throw { err: "Unauthorized", code: STATUS_CODES.FORBIDDEN };

  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  await review.save();

  await updateMovieRating(review.movieId);

  return await review.populate("userId", "name");
};

// ── DELETE review ─────────────────────────────────────────
export const deleteReviewService = async ({ reviewId, userId, isAdmin }) => {
  const review = await Review.findById(reviewId);
  if (!review) throw { err: "Review not found", code: STATUS_CODES.NOT_FOUND };

  if (!isAdmin && review.userId.toString() !== userId.toString())
    throw { err: "Unauthorized", code: STATUS_CODES.FORBIDDEN };

  const movieId = review.movieId;
  await review.deleteOne();
  await updateMovieRating(movieId);
};

// ── GET reviews for a movie ───────────────────────────────
export const getMovieReviewsService = async ({
  movieId,
  page = 1,
  limit = 10,
}) => {
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    Review.find({ movieId })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Review.countDocuments({ movieId }),
  ]);

  const ratingDist = await Review.aggregate([
    { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  return {
    reviews,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
    ratingDistribution: ratingDist,
  };
};

// ── TOGGLE like on review ─────────────────────────────────
export const toggleLikeReviewService = async ({ reviewId, userId }) => {
  const review = await Review.findById(reviewId);
  if (!review) throw { err: "Review not found", code: STATUS_CODES.NOT_FOUND };

  const alreadyLiked = review.likes.some(
    (id) => id.toString() === userId.toString(),
  );
  if (alreadyLiked) {
    review.likes = review.likes.filter(
      (id) => id.toString() !== userId.toString(),
    );
  } else {
    review.likes.push(userId);
  }
  await review.save();
  return { liked: !alreadyLiked, likesCount: review.likes.length };
};

// ── GET user's review for a movie ────────────────────────
export const getUserReviewService = async ({ movieId, userId }) => {
  return await Review.findOne({ movieId, userId }).populate("userId", "name");
};

// ── GET TOP REVIEWS (for landing page) ───────────────────
export const getTopReviewsService = async (limit = 6) => {
  const reviews = await Review.find({ comment: { $exists: true, $ne: "" } })
    .sort({ rating: -1, likes: -1, createdAt: -1 })
    .limit(limit)
    .populate("userId", "name avatar")
    .populate("movieId", "name posterUrl");
  return reviews;
};
