import express from "express";
import {
  createShow,
  createShowsBulk,
  deleteShow,
  getShows,
  getShow,
  updateShow,
  updateShowStatus,
} from "../controllers/show.controller.js";
import { isAdminOrClient, isAuthenticated } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { bulkCreateShowSchema, createShowSchema, updateShowSchema } from "../validations/show.validation.js";
import { ownsShowParam, ownsTheatreInBody } from "../middlewares/ownership.middleware.js";

const router = express.Router();

// ── PUBLIC ────────────────────────────────────────────────
router.get("/shows",      getShows);   // GET all (filter by theatreId, movieId, etc)
router.get("/shows/:id",  getShow);    // GET one

// ── CLIENT or ADMIN ───────────────────────────────────────
router.post  ("/shows",              isAuthenticated, isAdminOrClient, validate(createShowSchema), ownsTheatreInBody, createShow);
router.post  ("/shows/bulk",         isAuthenticated, isAdminOrClient, validate(bulkCreateShowSchema), ownsTheatreInBody, createShowsBulk);
router.patch ("/shows/:id",          isAuthenticated, isAdminOrClient, validate(updateShowSchema), ownsShowParam, updateShow);
router.patch ("/shows/:id/status",   isAuthenticated, isAdminOrClient, ownsShowParam, updateShowStatus);   // soft delete
router.delete("/shows/:id",          isAuthenticated, isAdminOrClient, ownsShowParam, deleteShow);         // hard delete

export default router;