import mongoose from "mongoose";
import User from "../models/user.model.js";
import Movie from "../models/movie.model.js";
import { STATUS_CODES } from "../utils/constants.js";

const MAX_WATCHLIST = 200;

const view = (u) => ({ watchlist: u.watchlist.map(String), notify: u.notifyMovies.map(String) });

const checkMovie = async (movieId) => {
    if (!mongoose.isValidObjectId(movieId)) throw { err: "Invalid movie id", code: STATUS_CODES.BAD_REQUEST };
    if (!(await Movie.exists({ _id: movieId }))) throw { err: "Movie not found", code: STATUS_CODES.NOT_FOUND };
};

export const getWatchlistService = async (userId) =>
    view(await User.findById(userId).select("watchlist notifyMovies"));

export const getWatchlistMoviesService = async (userId) => {
    const u = await User.findById(userId).select("watchlist notifyMovies")
        .populate("watchlist", "name posterUrl genre languages releaseDate releaseStatus rating certificate duration isActive");
    return { movies: u.watchlist.filter(Boolean), notify: u.notifyMovies.map(String) };
};

export const setWatchlistService = async (userId, movieId, on) => {
    if (on) await checkMovie(movieId);
    const update = on ? { $addToSet: { watchlist: movieId } } : { $pull: { watchlist: movieId, notifyMovies: movieId } };
    const u = await User.findByIdAndUpdate(userId, update, { new: true }).select("watchlist notifyMovies");
    if (u.watchlist.length > MAX_WATCHLIST) throw { err: `Watchlist is limited to ${MAX_WATCHLIST} movies`, code: STATUS_CODES.BAD_REQUEST };
    return view(u);
};

// "Notify me when bookings open" — also puts the movie on the watchlist
export const setNotifyService = async (userId, movieId, on) => {
    if (on) await checkMovie(movieId);
    const update = on
        ? { $addToSet: { notifyMovies: movieId, watchlist: movieId } }
        : { $pull: { notifyMovies: movieId } };
    return view(await User.findByIdAndUpdate(userId, update, { new: true }).select("watchlist notifyMovies"));
};

// After sign-in, fold the device's local hearts into the account
export const mergeWatchlistService = async (userId, ids = []) => {
    const valid = [...new Set(ids.filter((id) => mongoose.isValidObjectId(id)))].slice(0, MAX_WATCHLIST);
    const existing = valid.length ? (await Movie.find({ _id: { $in: valid } }).select("_id")).map((m) => m._id) : [];
    const u = await User.findByIdAndUpdate(userId, { $addToSet: { watchlist: { $each: existing } } }, { new: true })
        .select("watchlist notifyMovies");
    return view(u);
};
