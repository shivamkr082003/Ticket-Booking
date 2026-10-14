import express from "express";
import { isAuthenticated, isAdminOrClient } from "../middlewares/auth.middleware.js";
import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import { getPayoutsService } from "../services/payout.service.js";

const router = express.Router();

// Owners see their own cinemas; admins see every cinema
router.get("/payouts", isAuthenticated, isAdminOrClient, async (req, res) => {
  try {
    successResponseBody.message = "Payouts fetched";
    successResponseBody.data    = await getPayoutsService({ user: req.user, months: req.query.months });
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    errorResponseBody.err = error.err ?? error.message ?? error;
    return res.status(error.code ?? STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
});

export default router;
