
import Movie from "../models/movie.model.js";
import { STATUS_CODES } from "../utils/constants.js";
import { handleValidationError } from "../utils/response.utils.js";
import { sendNewMovieEmail } from "./email.service.js";
import User from "../models/user.model.js";
import {
    getCachedMovie, cacheMovie, invalidateMovie,
    getCachedMovieList, cacheMovieList, invalidateMovieListCache,
} from "./cache.service.js";

// ── CREATE ────────────────────────────────────────────────
export const createMovieService = async (movieData) => {
    try {

        const {name, description, director, casts, genre, languages,duration, rating, certificate, releaseDate, releaseStatus,posterUrl, bannerUrl, trailerUrl, images} = movieData;
        
        const movie = await Movie.create({
          name, 
          description, 
          director, 
          casts, 
          genre, 
          languages,
          duration, 
          rating, 
          certificate, 
          releaseDate, 
          releaseStatus,
          posterUrl, 
          bannerUrl, 
          trailerUrl, 
          images,
        });

        // A new movie changes what every list query should return —
        // bump the list cache version so stale results stop being served.
        invalidateMovieListCache().catch(console.error);

        // Send new movie notification to all users (non-blocking)
        User.find({ userStatus: "APPROVED" }).select("name email").then(users => {
            if (users.length > 0) {
                sendNewMovieEmail({ users, movie }).catch(console.error);
            }
        }).catch(console.error);

        return movie;
    } catch (error) {
        handleValidationError(error);
    }
}

// ── HARD DELETE ───────────────────────────────────────────
// Permanently removes movie from DB
export const deleteMovieService = async (id) => {
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) {
    throw { 
      err: "No movie found for the given id", 
      code: STATUS_CODES.NOT_FOUND 
    };
  }
  invalidateMovie(id).catch(console.error);
  invalidateMovieListCache().catch(console.error);
  return movie;
};

// ── GET ONE ───────────────────────────────────────────────
export const getMovieService = async (id) => {
    const cached = await getCachedMovie(id);
    if (cached) return cached;

    const movie = await Movie.findById(id);
    if(!movie){
        return {
            err : "No movie found for the corresponding id provided",code : STATUS_CODES.NOT_FOUND
        }
    }
    cacheMovie(id, movie).catch(console.error);
    return movie;
}

// ── UPDATE ────────────────────────────────────────────────
export const updateMovieService = async (id,data) => {
    try {
    const movie = await Movie.findByIdAndUpdate(id, data, {new: true,runValidators: true});
    if (!movie) {
      throw { 
        err: "No movie found for the given id", 
        code: STATUS_CODES.NOT_FOUND 
      };
    }
    invalidateMovie(id).catch(console.error);
    invalidateMovieListCache().catch(console.error);
    return movie;
  } catch (error) {
    handleValidationError(error);
  }
}

// ── SOFT DELETE (toggle isActive) ────────────────────────
// Sets isActive: false — movie stays in DB but hidden from users
export const updateMovieStatusService = async (id, status) => {
    const movie = await Movie.findByIdAndUpdate(
        id,
        { isActive: status },
        { new: true }
    );

    if (!movie) {
        throw {
            err: "Movie not found",
            code: STATUS_CODES.NOT_FOUND
        };
    }

    invalidateMovie(id).catch(console.error);
    invalidateMovieListCache().catch(console.error);

    return movie;
};

// ── GET ALL (with filters + pagination) ───────────────────
export const fetchMoviesService = async (filter) => {
  try {
    const cached = await getCachedMovieList(filter);
    if (cached) return cached;

    const {
      name,
      genre,
      languages,
      releaseStatus,
      certificate,
      isActive = "true",
      page     = 1,
      limit    = 20,
      sortBy   = "releaseDate",
      order    = "desc",
    } = filter;
 
    const query = {};
 
    if (isActive !== "all") query.isActive = isActive === "true";
    if (name) query.name = { $regex: name, $options: "i" };
    if (genre) query.genre = { $in: Array.isArray(genre) ? genre : [genre] };
    if (languages) query.languages = { $in: Array.isArray(languages) ? languages : [languages] };
    if (releaseStatus) query.releaseStatus = releaseStatus;
    if (certificate) query.certificate = certificate;
 
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;
    const sortDir  = order === "asc" ? 1 : -1;
 
    const [movies, total] = await Promise.all([
      Movie.find(query).sort({ [sortBy]: sortDir }).skip(skip).limit(limitNum),
      Movie.countDocuments(query),
    ]);
 
    const result = {
      movies,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    cacheMovieList(filter, result).catch(console.error);

    return result;
  } catch (error) {
    console.error(error);
    throw { err: "Failed to fetch movies", code: STATUS_CODES.INTERNAL_SERVER_ERROR };
  }
};

// ── SIMILAR MOVIES ────────────────────────────────────────
// Shared genres count most, then a shared language, then the director; ties go to the better rated
export const getSimilarMoviesService = async (id, limit = 8) => {
  const movie = await Movie.findById(id).select("genre languages director");
  if (!movie) throw { err: "No movie found for the given id", code: STATUS_CODES.NOT_FOUND };
  const candidates = await Movie.find({
    _id: { $ne: movie._id },
    isActive: { $ne: false },
    releaseStatus: { $ne: "BANNED" },
    $or: [{ genre: { $in: movie.genre } }, { director: movie.director }],
  }).limit(200);
  const g = new Set(movie.genre), l = new Set(movie.languages);
  return candidates
    .map((m) => ({
      m,
      score: m.genre.filter((x) => g.has(x)).length * 3
        + (m.languages.some((x) => l.has(x)) ? 1 : 0)
        + (m.director && m.director === movie.director ? 2 : 0)
        + (m.rating ?? 0) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(20, Math.max(1, Number(limit) || 8)))
    .map(({ m }) => m);
};
