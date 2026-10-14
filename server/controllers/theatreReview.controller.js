import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import { listTheatreReviewsService, myTheatreReviewService, upsertTheatreReviewService, deleteTheatreReviewService } from "../services/theatreReview.service.js";

const handle = (fn, message) => async (req, res) => {
  try {
    successResponseBody.message = message;
    successResponseBody.data    = await fn(req);
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error.message ?? error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

export const getTheatreReviews  = handle((req) => listTheatreReviewsService(req.params.id, req.query.page), "Reviews fetched");
export const getMyTheatreReview = handle((req) => myTheatreReviewService(req.userId, req.params.id), "Review fetched");
export const putTheatreReview   = handle((req) => upsertTheatreReviewService(req.userId, req.params.id, req.body), "Review saved");
export const delTheatreReview   = handle((req) => deleteTheatreReviewService(req.userId, req.params.id), "Review deleted");
