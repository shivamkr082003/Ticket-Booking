
import { addTheatreService, checkMoviesInATheatreService, deleteTheatreService, getAllTheatresService, getMoviesOfTheatreService, getTheatreCitiesService, getTheatreService, updateMoviesInTheatreService, updateTheatreService, updateTheatreStatusService } from "../services/theatre.service.js";
import { STATUS_CODES } from "../utils/constants.js";
import { errorResponseBody, successResponseBody } from "../utils/response.utils.js";


// ── ADD A NEW THEATRE ──────────────────────────────────────────────── 
export const addTheatre = async (req, res) => {
  try {
    // inject owner from authenticated user — CLIENT creates their own theatre
    const theatre = await addTheatreService({ ...req.body, owner: req.user.id });

    successResponseBody.message = "Theatre added successfully";
    successResponseBody.data = theatre;
    return res.status(STATUS_CODES.CREATED).json(successResponseBody);

  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── PERMANENTLY DELETE A THEATRE ─────────────────────────────────────
export const deleteTheatre = async (req, res) => {
  try {
    const response = await deleteTheatreService(req.params.id);
    successResponseBody.data = response;
    successResponseBody.message = "Theatre deleted successfully";
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── UPDATE THE THEATRE ───────────────────────────────────────────────
export const updateTheatre = async (req, res) => {
  try {
    const response = await updateTheatreService(req.params.id,req.body);
    successResponseBody.data = response;
    successResponseBody.message = "Theatre updated successfully";
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── GET A SINGLE THEATRE ─────────────────────────────────────────────
export const getTheatre = async (req, res) => {
  try {
    const response = await getTheatreService(req.params.id);
    successResponseBody.data = response;
    successResponseBody.message = "Theatre fetched successfully";
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── GET ALL THE THEATRES WITH FILTERS  ───────────────────────────────
export const getTheatres = async (req, res) => {
  try {
    const response = await getAllTheatresService(req.query);
    successResponseBody.data = response;
    successResponseBody.message = "Theatres fetched successfully";
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── CITIES WITH ACTIVE THEATRES (city picker) ────────────────────────
export const getTheatreCities = async (req, res) => {
  try {
    successResponseBody.data = await getTheatreCitiesService();
    successResponseBody.message = "Cities fetched successfully";
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    errorResponseBody.err = error.message ?? error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

// ── UPDATE MOVIES INSIDE A THEATRE ───────────────────────────────────
export const updateMovies = async (req, res) => {
  try {
  const { movieIds, insert } = req.body;
    if (!movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      errorResponseBody.err = "movieIds must be a non-empty array";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }
    const response = await updateMoviesInTheatreService(req.params.id, movieIds, insert);
    successResponseBody.message = `Movies ${insert ? "added to" : "removed from"} theatre successfully`;
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── GET ALL THE MOVIES IN A THEATRE  ─────────────────────────────────
export const getTheatreMovies = async (req, res) => {
  try {
    const response = await getMoviesOfTheatreService(req.params.id);
    successResponseBody.message = "Movies fetched for theatre successfully";
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── CHECK THE AVAILABILITY OF A MOVIE  ───────────────────────────────
export const checkMovies = async (req, res) => {
  try {
    const response = await checkMoviesInATheatreService(req.params.theatreId,req.params.movieId);
    successResponseBody.message = "Movie availability checked successfully";
    successResponseBody.data    = { isAvailable: response };
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ──  SOFT DELETE A THEATRE ───────────────────────────────────────────
export const updateTheatreStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      errorResponseBody.err = "isActive must be a boolean";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }
    const response = await updateTheatreStatusService(req.params.id, isActive);
    successResponseBody.message = `Theatre ${isActive ? "activated" : "deactivated"} successfully`;
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};
