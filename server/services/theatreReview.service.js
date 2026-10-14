import mongoose from "mongoose";
import TheatreReview from "../models/theatreReview.model.js";
import Theatre from "../models/theatre.model.js";
import Show from "../models/show.model.js";
import Booking from "../models/bookings.model.js";
import { BOOKING_STATUS, STATUS_CODES } from "../utils/constants.js";

const PAGE = 10;
const round1 = (n) => Math.round((n ?? 0) * 10) / 10;

const assertId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw { err: "Invalid theatre id", code: STATUS_CODES.BAD_REQUEST };
};

/** Has this user actually watched something here? (paid booking for a show that has started) */
export const hasVisited = async (userId, theatreId, now = new Date()) => {
    const showIds = await Show.find({ theatreId, showTime: { $lte: now } }).distinct("_id");
    if (!showIds.length) return false;
    return !!(await Booking.exists({ userId, showId: { $in: showIds }, status: BOOKING_STATUS.successful }));
};

const refreshRating = async (theatreId) => {
    const [agg] = await TheatreReview.aggregate([
        { $match: { theatreId: new mongoose.Types.ObjectId(String(theatreId)) } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 },
            cleanliness: { $avg: "$cleanliness" }, sound: { $avg: "$sound" }, seating: { $avg: "$seating" } } },
    ]);
    const rating = agg
        ? { avg: round1(agg.avg), count: agg.count, cleanliness: round1(agg.cleanliness), sound: round1(agg.sound), seating: round1(agg.seating) }
        : { avg: 0, count: 0, cleanliness: 0, sound: 0, seating: 0 };
    await Theatre.updateOne({ _id: theatreId }, { rating });
    return rating;
};

export const listTheatreReviewsService = async (theatreId, page = 1) => {
    assertId(theatreId);
    const p = Math.max(1, Number(page) || 1);
    const [reviews, total, theatre, dist] = await Promise.all([
        TheatreReview.find({ theatreId }).sort({ createdAt: -1 }).skip((p - 1) * PAGE).limit(PAGE).populate("userId", "name avatar"),
        TheatreReview.countDocuments({ theatreId }),
        Theatre.findById(theatreId).select("rating"),
        TheatreReview.aggregate([{ $match: { theatreId: new mongoose.Types.ObjectId(String(theatreId)) } }, { $group: { _id: "$rating", n: { $sum: 1 } } }]),
    ]);
    if (!theatre) throw { err: "Theatre not found", code: STATUS_CODES.NOT_FOUND };
    const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: dist.find((d) => d._id === star)?.n ?? 0 }));
    return { reviews, summary: theatre.rating ?? { avg: 0, count: 0 }, distribution, pagination: { page: p, total, totalPages: Math.ceil(total / PAGE) } };
};

export const myTheatreReviewService = async (userId, theatreId) => {
    assertId(theatreId);
    const [review, visited] = await Promise.all([
        TheatreReview.findOne({ theatreId, userId }),
        hasVisited(userId, theatreId),
    ]);
    return { review, canReview: visited };
};

export const upsertTheatreReviewService = async (userId, theatreId, data) => {
    assertId(theatreId);
    if (!(await Theatre.exists({ _id: theatreId }))) throw { err: "Theatre not found", code: STATUS_CODES.NOT_FOUND };
    if (!(await hasVisited(userId, theatreId)))
        throw { err: "You can review a cinema after you've watched a show there", code: STATUS_CODES.FORBIDDEN };
    const { rating, cleanliness, sound, seating, comment = "" } = data;
    const review = await TheatreReview.findOneAndUpdate(
        { theatreId, userId },
        { rating, cleanliness, sound, seating, comment },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    const summary = await refreshRating(theatreId);
    return { review, summary };
};

export const deleteTheatreReviewService = async (userId, theatreId) => {
    assertId(theatreId);
    const r = await TheatreReview.findOneAndDelete({ theatreId, userId });
    if (!r) throw { err: "Review not found", code: STATUS_CODES.NOT_FOUND };
    return { summary: await refreshRating(theatreId) };
};
