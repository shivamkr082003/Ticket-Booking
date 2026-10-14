import Booking from "../models/bookings.model.js";
import Theatre from "../models/theatre.model.js";
import Movie   from "../models/movie.model.js";
import Review  from "../models/review.model.js";
import { BOOKING_STATUS } from "../utils/constants.js";
import { getOrSetCache } from "./cache.service.js";

const STATS_KEY = "cache:stats:platform";
const STATS_TTL = 5 * 60; // seconds — landing-page numbers don't need to be live

const computePlatformStats = async () => {
    const [tickets, theatreAgg, movies, ratingAgg] = await Promise.all([
        Booking.aggregate([
            { $match: { status: BOOKING_STATUS.successful } },
            { $group: { _id: null, seats: { $sum: { $size: "$seats" } } } },
        ]),
        Theatre.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, screens: { $sum: "$totalScreens" }, theatres: { $sum: 1 }, cities: { $addToSet: { $toLower: "$city" } } } },
        ]),
        Movie.countDocuments({ isActive: true, releaseStatus: "RELEASED" }),
        Review.aggregate([
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]),
    ]);

    return {
        ticketsSold:  tickets[0]?.seats ?? 0,
        theatres:     theatreAgg[0]?.theatres ?? 0,
        screens:      theatreAgg[0]?.screens ?? 0,
        cities:       theatreAgg[0]?.cities?.length ?? 0,
        moviesShowing: movies,
        avgRating:    ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0, // out of 10
        reviews:      ratingAgg[0]?.count ?? 0,
    };
};

export const getPlatformStatsService = async () => {
    try {
        return await getOrSetCache(STATS_KEY, computePlatformStats, STATS_TTL);
    } catch {
        // Cache unavailable — still serve fresh numbers
        return computePlatformStats();
    }
};
