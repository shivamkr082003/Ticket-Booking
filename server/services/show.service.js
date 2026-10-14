import Show from "../models/show.model.js";
import Theatre from "../models/theatre.model.js";
import { STATUS_CODES } from "../utils/constants.js";
import Movie from "../models/movie.model.js";
import { notifyBookingsOpen } from "./notification.service.js";

const hasUpcomingShows = (movieId) =>
  Show.exists({ movieId, isActive: true, showTime: { $gte: new Date() } });
import { handleValidationError } from "../utils/response.utils.js";
import { minCategoryPrice, seatCount, snapshotLayout } from "../utils/seatLayout.js";
import { applyPct, priceAdjustmentsFor, totalPct } from "../utils/dynamicPricing.js";

const findScreen = (theatre, name) =>
  theatre.screens?.find((s) => s.name.trim().toLowerCase() === String(name ?? "").trim().toLowerCase()) ?? null;

// Configured screens dictate capacity and pricing; free-text screens keep the legacy single price
const layoutFields = (screen, categoryPrices, adjustPct = 0) => {
  if (!screen) return { seatLayout: null };
  const seatLayout = snapshotLayout(screen, categoryPrices, adjustPct);
  return { seatLayout, noOfSeats: seatCount(seatLayout), price: minCategoryPrice(seatLayout) };
};

// Price + layout for a new show, with the theatre's dynamic pricing rules applied
const pricedFields = ({ theatre, movie, screen, showTime, price, categoryPrices, ignorePricingRules }) => {
  const priceAdjustments = ignorePricingRules ? [] : priceAdjustmentsFor(showTime, theatre.pricingRules, movie?.releaseDate);
  const pct = totalPct(priceAdjustments);
  const sc = findScreen(theatre, screen);
  return {
    price: applyPct(price, pct),
    priceAdjustments,
    ...layoutFields(sc, categoryPrices, pct),
  };
};

// ── CREATE ────────────────────────────────────────────────
export const createShowService = async (data) => {
  try {
    const {
      theatreId,
      movieId,
      screen,
      showTime,
      noOfSeats,
      price,
      format,
      language,
      categoryPrices,
      tags = [],
      ignorePricingRules = false,
    } = data;

    // Theatre must exist
    const theatre = await Theatre.findById(theatreId);
    if (!theatre)
      throw {
        err: "No theatre found for the given id",
        code: STATUS_CODES.NOT_FOUND,
      };

    // Movie must be available in that theatre
    const movieExists = theatre.movies.some(
      (id) => id.toString() === movieId.toString(),
    );
    if (!movieExists)
      throw {
        err: "Movie is not available in this theatre — add it first",
        code: STATUS_CODES.BAD_REQUEST,
      };

    const hadUpcoming = await hasUpcomingShows(movieId);
    const movie = await Movie.findById(movieId).select("releaseDate");
    const show = await Show.create({
      theatreId,
      movieId,
      screen,
      showTime,
      noOfSeats,
      format,
      language,
      tags,
      bookedSeats: [],
      isActive: true,
      ...pricedFields({ theatre, movie, screen, showTime, price, categoryPrices, ignorePricingRules }),
    });

    if (!hadUpcoming && new Date(showTime) > new Date())
      notifyBookingsOpen({ movieId, showTime }).catch(console.error);

    return show;
  } catch (error) {
    handleValidationError(error);
  }
};

// ── BULK SCHEDULE ─────────────────────────────────────────
// Same movie/screen/prices at many times. Times that are in the past or overlap
// another show on that screen are skipped (and reported), not fatal.
const CLEANUP_MIN = 20;   // turnaround between shows on one screen
const MAX_BULK = 120;

export const createShowsBulkService = async (data, now = new Date()) => {
  const { theatreId, movieId, screen, showTimes, noOfSeats, price, format, language, categoryPrices, tags = [], ignorePricingRules = false } = data;

  const theatre = await Theatre.findById(theatreId);
  if (!theatre) throw { err: "No theatre found for the given id", code: STATUS_CODES.NOT_FOUND };
  if (!theatre.movies.some((id) => id.toString() === movieId.toString()))
    throw { err: "Movie is not available in this theatre — add it first", code: STATUS_CODES.BAD_REQUEST };
  const movie = await Movie.findById(movieId).select("duration releaseDate");
  if (!movie) throw { err: "Movie not found", code: STATUS_CODES.NOT_FOUND };

  const times = [...new Set(showTimes.map((t) => new Date(t).getTime()))].sort((a, b) => a - b);
  if (times.length > MAX_BULK) throw { err: `At most ${MAX_BULK} shows at once`, code: STATUS_CODES.BAD_REQUEST };

  const blockMs = ((movie.duration || 150) + CLEANUP_MIN) * 60_000;
  const existing = await Show.find({
    theatreId, screen, isActive: true,
    showTime: { $gte: new Date(times[0] - blockMs), $lte: new Date(times[times.length - 1] + blockMs) },
  }).select("showTime");
  const taken = existing.map((s) => s.showTime.getTime());

  const skipped = [];
  const accepted = [];
  for (const t of times) {
    if (t <= now.getTime()) { skipped.push({ showTime: new Date(t), reason: "In the past" }); continue; }
    if ([...taken, ...accepted].some((o) => Math.abs(o - t) < blockMs)) {
      skipped.push({ showTime: new Date(t), reason: `Overlaps another show on ${screen}` }); continue;
    }
    accepted.push(t);
  }
  if (!accepted.length) return { created: [], skipped };

  const hadUpcoming = await hasUpcomingShows(movieId);
  try {
    const created = await Show.insertMany(accepted.map((t) => ({
      theatreId, movieId, screen, showTime: new Date(t), noOfSeats, format, language, tags,
      bookedSeats: [], isActive: true,
      ...pricedFields({ theatre, movie, screen, showTime: new Date(t), price, categoryPrices, ignorePricingRules }),
    })));
    if (!hadUpcoming) notifyBookingsOpen({ movieId, showTime: new Date(accepted[0]) }).catch(console.error);
    return { created, skipped };
  } catch (error) {
    handleValidationError(error);
  }
};

// ── GET ALL (with filters) ────────────────────────────────
export const getShowsService = async (filter = {}) => {
  try {
    const {
      theatreId,
      movieId,
      screen,
      format,
      language,
      isActive = "true", // default: only active shows
      date, // filter by showTime date e.g. "2024-12-25"
      upcoming, // "true" → only shows that haven't started yet
    } = filter;

    const query = {};

    if (isActive !== "all") query.isActive = isActive === "true";
    if (theatreId) query.theatreId = theatreId;
    if (movieId) query.movieId = movieId;
    if (screen) query.screen = screen;
    if (format) query.format = format;
    if (language) query.language = language;

    // Filter by date — get all shows on a specific day
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.showTime = { $gte: start, $lt: end };
    }

    if (upcoming === "true") {
      const now = new Date();
      const from = query.showTime?.$gte;
      query.showTime = { ...query.showTime, $gte: from && from > now ? from : now };
    }

    const shows = await Show.find(query)
      .populate("theatreId")
      .populate("movieId")
      .sort({ showTime: 1 }); // earliest shows first

    return shows;
  } catch (error) {
    throw error;
  }
};

// ── GET ONE ───────────────────────────────────────────────
export const getShowService = async (id) => {
  const show = await Show.findById(id)
    .populate("theatreId")
    .populate("movieId");
  if (!show)
    throw {
      err: "No show found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return show;
};

// ── HARD DELETE ───────────────────────────────────────────
export const deleteShowService = async (id) => {
  const show = await Show.findByIdAndDelete(id);
  if (!show)
    throw {
      err: "No show found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return show;
};

// ── SOFT DELETE (toggle isActive) ────────────────────────
export const updateShowStatusService = async (id, isActive) => {
  const show = await Show.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!show)
    throw {
      err: "No show found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return show;
};

// ── UPDATE ────────────────────────────────────────────────
export const updateShowService = async (id, data) => {
  try {
    const { categoryPrices, ignorePricingRules: _ignored, ...updates } = data;
    const existing = await Show.findById(id);
    if (!existing)
      throw { err: "No show found for the given id", code: STATUS_CODES.NOT_FOUND };

    const screenChanged = updates.screen !== undefined && updates.screen !== existing.screen;
    if (screenChanged) {
      if (existing.bookedSeats.length > 0)
        throw { err: "Seats are already sold for this show — the screen can't be changed", code: STATUS_CODES.CONFLICT };
      const theatre = await Theatre.findById(updates.theatreId ?? existing.theatreId);
      Object.assign(updates, layoutFields(theatre && findScreen(theatre, updates.screen), categoryPrices));
    } else if (existing.seatLayout) {
      // Capacity/price come from the layout; only category prices may change
      delete updates.noOfSeats;
      delete updates.price;
      if (categoryPrices) {
        const seatLayout = existing.seatLayout.toObject();
        seatLayout.categories = seatLayout.categories.map((c) => ({
          ...c, price: categoryPrices[c.key] > 0 ? Number(categoryPrices[c.key]) : c.price,
        }));
        Object.assign(updates, { seatLayout, price: minCategoryPrice(seatLayout) });
      }
    }

    const show = await Show.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!show)
      throw {
        err: "No show found for the given id",
        code: STATUS_CODES.NOT_FOUND,
      };
    return show;
  } catch (error) {
    handleValidationError(error);
  }
};
