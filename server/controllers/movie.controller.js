import { createMovieService ,deleteMovieService, fetchMoviesService, getMovieService, updateMovieService, updateMovieStatusService} from "../services/movie.service.js";
import { errorResponseBody,successResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";

// ── ADD A NEW MOVIE  ────────────────────────────────────────────────
export const createMovie =  async (req,res) => {
    try {
        const movie = await createMovieService(req.body);
        successResponseBody.message = "Movie added successfully";
        successResponseBody.data = movie;
        return res.status(STATUS_CODES.CREATED).json(successResponseBody);
    } catch (error) {
        if(error.err) {
            errorResponseBody.err = error.err;
            return res.status(error.code).json(errorResponseBody);
        }
        errorResponseBody.err = error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};

// ── PERMANENTLY DELETE A MOVIE ──────────────────────────────────────
export const deleteMovie = async (req,res) => {
    try {
        const response = await deleteMovieService(req.params.id);
        successResponseBody.message = "Movie deleted successfully";
        successResponseBody.data    = response;
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if(error.err) {
            errorResponseBody.err = error.err;
            return res.status(error.code).json(errorResponseBody);
        }
        errorResponseBody.err = error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
}

// ── GET A SINGLE MOVIE DETAILS ──────────────────────────────────────
export const getMovie = async (req,res) => {
    try {
        const movieDetails = await getMovieService(req.params.id);
        if (movieDetails.err) {
            errorResponseBody.err = movieDetails.err;
            return res.status(movieDetails.code).json(errorResponseBody);
        }
        successResponseBody.data    = movieDetails;
    successResponseBody.message = "Fetched movie details";
    return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if(error.err) {
            errorResponseBody.err = error.err;
            return res.status(error.code).json(errorResponseBody);
        }
        errorResponseBody.err = error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
}

// ── UPDATE MOVIE DETAILS ───────────────────────────────────────────
export const updateMovie = async (req,res) => {
    try {
        const movie = await updateMovieService(req.params.id,req.body);
        successResponseBody.data    = movie;
        successResponseBody.message = "Movie updated successfully";
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
}

// ── SOFT DELETE A MOVIE ─────────────────────────────────────────────
export const updateMovieStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
      errorResponseBody.err = "isActive must be a boolean";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }
        const movie = await updateMovieStatusService(req.params.id, isActive);
        successResponseBody.message = `Movie ${isActive ? "activated" : "deactivated"} successfully`;
        successResponseBody.data    = movie;
        return res.status(STATUS_CODES.OK).json(successResponseBody);

    } catch (error) {

        if(error.err) {
            errorResponseBody.err = error.err;
            return res.status(error.code).json(errorResponseBody);
        }
        errorResponseBody.err = error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
        
    }
};

// ── GET ALL THE MOVIES WITH FILTERS  ───────────────────────────────
export const getMovies = async (req,res) => {
    try {
        const response = await fetchMoviesService(req.query);
        successResponseBody.data = response;
        successResponseBody.message = "Movies fetched successfully";
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        if(error.err) {
            errorResponseBody.err = error.err;
            return res.status(error.code).json(errorResponseBody);
        }
        errorResponseBody.err = error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
}

