import express from "express";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import { createTicketSchema, replyTicketSchema } from "../validations/support.validation.js";
import { createTicketService, myTicketsService, listTicketsService, replyTicketService } from "../services/support.service.js";
import { listAuditLogsService } from "../middlewares/audit.middleware.js";

const handle = (fn, message, status = STATUS_CODES.OK) => async (req, res) => {
  try {
    successResponseBody.message = message;
    successResponseBody.data    = await fn(req);
    return res.status(status).json(successResponseBody);
  } catch (error) {
    errorResponseBody.err = error.err ?? error.message ?? error;
    return res.status(error.code ?? STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

const router = express.Router();

// ── Customers ─────────────────────────────────────────────
router.post ("/support",      isAuthenticated, validate(createTicketSchema), handle((req) => createTicketService(req.user, req.body), "Request received", STATUS_CODES.CREATED));
router.get  ("/support/mine", isAuthenticated, handle((req) => myTicketsService(req.userId), "Requests fetched"));
// Admin replies / status, or a customer's follow-up on their own ticket
router.patch("/support/:id",  isAuthenticated, validate(replyTicketSchema), handle((req) => replyTicketService(req.user, req.params.id, req.body), "Ticket updated"));

// ── Admin ─────────────────────────────────────────────────
router.get  ("/support",      isAuthenticated, isAdmin, handle((req) => listTicketsService(req.query), "Tickets fetched"));
router.get  ("/audit-logs",   isAuthenticated, isAdmin, handle((req) => listAuditLogsService(req.query), "Activity fetched"));

export default router;
