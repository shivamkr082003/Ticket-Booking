import express from "express";
import {createMovie,deleteMovie,getMovie,getMovies,updateMovie,updateMovieStatus,} from "../controllers/movie.controller.js";
import { validate } from "../middlewares/validation.middleware.js";
import { movieCreateSchema, movieUpdateSchema } from "../validations/movie.validation.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { getSimilarMoviesService } from "../services/movie.service.js";
import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";

const router = express.Router();

// PUBLIC
router.get("/movies",          getMovies);           // GET all (with filters)
router.get("/movies/:id",      getMovie);            // GET one
router.get("/movies/:id/similar", async (req, res) => {
  try {
    successResponseBody.message = "Similar movies fetched";
    successResponseBody.data    = await getSimilarMoviesService(req.params.id, req.query.limit);
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    errorResponseBody.err = error.err ?? error.message ?? error;
    return res.status(error.code ?? STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
});

// ADMIN ONLY
router.post("/movies",         isAuthenticated, isAdmin, validate(movieCreateSchema), createMovie);
router.patch("/movies/:id",    isAuthenticated, isAdmin, validate(movieUpdateSchema), updateMovie);
router.patch("/movies/:id/status", isAuthenticated, isAdmin, updateMovieStatus);
router.delete("/movies/:id",   isAuthenticated, isAdmin, deleteMovie);

export default router;