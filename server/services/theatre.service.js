import Movie from "../models/movie.model.js";
import Show from "../models/show.model.js";
import Theatre from "../models/theatre.model.js";
import { STATUS_CODES, SHOW_FORMATS } from "../utils/constants.js";
import { handleValidationError } from "../utils/response.utils.js";
import { assertValidLayout } from "../utils/seatLayout.js";

// Screens define the auditorium count whenever they're provided
const withScreens = (data) => {
  if (data.amenityPhotos && Array.isArray(data.amenities)) {
    data = {
      ...data,
      amenityPhotos: Object.fromEntries(
        Object.entries(data.amenityPhotos).filter(([label]) => data.amenities.includes(label)),
      ),
    };
  }
  if (!Array.isArray(data.screens)) return data;
  data.screens.forEach((s) => assertValidLayout(s.layout));
  const names = data.screens.map((s) => s.name.trim().toLowerCase());
  if (new Set(names).size !== names.length)
    throw { err: "Screen names must be unique within a theatre", code: STATUS_CODES.BAD_REQUEST };
  return data.screens.length ? { ...data, totalScreens: data.screens.length } : data;
};

// ── CREATE ────────────────────────────────────────────────
export const addTheatreService = async (data) => {
  try {
    const {
      name,
      description,
      city,
      state,
      pincode,
      address,
      owner,
      movies,
      totalScreens,
      amenities,
      images,
      phone,
      openingHours,
      screens,
      amenityPhotos,
      menu,
      location,
      cancellationPolicy,
      pricingRules,
    } = withScreens(data);

    // Duplicate check — same name + same owner
    const exists = await Theatre.findOne({ name, owner });
    if (exists)
      throw {
        err: "Theatre with this name already exists for this owner",
        code: STATUS_CODES.CONFLICT,
      };

    // Validate movie IDs if provided
    if (movies && movies.length) {
      const valid = await Movie.find({ _id: { $in: movies } }).select("_id");
      if (valid.length !== movies.length)
        throw {
          err: "Some movie IDs are invalid",
          code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const theatre = await Theatre.create({
      name,
      description,
      city,
      state,
      pincode,
      address,
      owner,
      movies: movies ?? [],
      totalScreens: totalScreens ?? 1,
      amenities: amenities ?? [],
      images: images ?? [],
      phone: phone ?? "",
      openingHours: openingHours ?? "",
      screens: screens ?? [],
      amenityPhotos: amenityPhotos ?? {},
      menu: menu ?? [],
      location: location ?? undefined,
      cancellationPolicy: cancellationPolicy ?? null,
      pricingRules: pricingRules ?? null,
    });

    return theatre;
  } catch (error) {
    handleValidationError(error);
  }
};

// ── HARD DELETE ───────────────────────────────────────────
export const deleteTheatreService = async (id) => {
  const theatre = await Theatre.findByIdAndDelete(id);
  if (!theatre)
    throw {
      err: "No theatre found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return theatre;
};

// ── SOFT DELETE ───────────────────────────────────────────
export const updateTheatreStatusService = async (id, isActive) => {
  const theatre = await Theatre.findByIdAndUpdate(
    id,
    { isActive },
    { new: true },
  );
  if (!theatre)
    throw {
      err: "No theatre found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return theatre;
};

// ── UPDATE ────────────────────────────────────────────────
export const updateTheatreService = async (id, data) => {
  try {
    const theatre = await Theatre.findByIdAndUpdate(id, withScreens(data), {
      new: true,
      runValidators: true,
    });
    if (!theatre)
      throw {
        err: "No theatre found for the given id",
        code: STATUS_CODES.NOT_FOUND,
      };
    return theatre;
  } catch (error) {
    handleValidationError(error);
  }
};

// ── CITIES (for the city picker) ──────────────────────────
export const getTheatreCitiesService = async () => {
  const rows = await Theatre.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: { $toLower: { $trim: { input: "$city" } } }, city: { $first: { $trim: { input: "$city" } } }, state: { $first: "$state" }, theatres: { $sum: 1 } } },
    { $sort: { theatres: -1, city: 1 } },
  ]);
  return rows.map(({ city, state, theatres }) => ({ city, state, theatres }));
};

// ── GET ONE ───────────────────────────────────────────────
export const getTheatreService = async (id) => {
  const theatre = await Theatre.findById(id).populate("movies");
  if (!theatre)
    throw {
      err: "No theatre found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return theatre;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── GET ALL (filters + pagination) ───────────────────────
export const getAllTheatresService = async (filter = {}) => {
  try {
    const {
      name,
      city,
      state,
      pincode,
      movieId,
      format, // "IMAX", "4DX"… → only theatres with upcoming shows in that format
      isActive = "true",
      page = 1,
      limit = 20,
    } = filter;

    const query = {};

    if (isActive !== "all") query.isActive = isActive === "true";
    if (name) query.name = { $regex: name, $options: "i" };
    if (city) query.city = { $regex: `^\\s*${escapeRegex(String(city).trim())}\\s*$`, $options: "i" };
    if (state) query.state = { $regex: state, $options: "i" };
    if (pincode) query.pincode = Number(pincode);
    if (movieId) query.movies = movieId;

    const upcomingShows = { isActive: true, showTime: { $gte: new Date() } };
    if (format && SHOW_FORMATS.includes(format)) {
      query._id = { $in: await Show.distinct("theatreId", { ...upcomingShows, format }) };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [theatres, total] = await Promise.all([
      Theatre.find(query).populate("movies").skip(skip).limit(limitNum),
      Theatre.countDocuments(query),
    ]);

    // Formats each theatre is actually screening — drives the IMAX / 4DX badges
    const formatRows = await Show.aggregate([
      { $match: { ...upcomingShows, theatreId: { $in: theatres.map((t) => t._id) } } },
      { $group: { _id: "$theatreId", formats: { $addToSet: "$format" } } },
    ]);
    const formatsByTheatre = new Map(
      formatRows.map((r) => [r._id.toString(), SHOW_FORMATS.filter((f) => r.formats.includes(f))]),
    );

    return {
      theatres: theatres.map((t) => ({
        ...t.toObject(),
        formats: formatsByTheatre.get(t._id.toString()) ?? [],
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } catch (error) {
    console.error(error);
    throw {
      err: "Failed to fetch theatres",
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }
};

// ── ADD / REMOVE MOVIES ───────────────────────────────────
export const updateMoviesInTheatreService = async (
  theatreId,
  movieIds,
  insert,
) => {
  try {
    // Validate all movieIds exist
    const valid = await Movie.find({ _id: { $in: movieIds } }).select("_id");
    if (valid.length !== movieIds.length)
      throw {
        err: "Some movie IDs are invalid",
        code: STATUS_CODES.BAD_REQUEST,
      };

    const update = insert
      ? { $addToSet: { movies: { $each: movieIds } } } // add, no duplicates
      : { $pull: { movies: { $in: movieIds } } }; // remove

    const theatre = await Theatre.findByIdAndUpdate(theatreId, update, {
      new: true,
    }).populate("movies");

    if (!theatre)
      throw {
        err: "No theatre found for the given id",
        code: STATUS_CODES.NOT_FOUND,
      };
    return theatre;
  } catch (error) {
    if (error.name === "TypeError")
      throw {
        err: "No theatre found for the given id",
        code: STATUS_CODES.NOT_FOUND,
      };
    throw error;
  }
};

// ── GET MOVIES OF THEATRE ─────────────────────────────────
export const getMoviesOfTheatreService = async (id) => {
  const theatre = await Theatre.findById(id, {
    name: 1,
    movies: 1,
    address: 1,
    city: 1,
  }).populate("movies");
  if (!theatre)
    throw {
      err: "No theatre found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return theatre;
};

// ── CHECK IF MOVIE EXISTS IN THEATRE ─────────────────────
export const checkMoviesInATheatreService = async (theatreId, movieId) => {
  const theatre = await Theatre.findById(theatreId);
  if (!theatre)
    throw {
      err: "No theatre found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return theatre.movies.some((id) => id.toString() === movieId);
};
