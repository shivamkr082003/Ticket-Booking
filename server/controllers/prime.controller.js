import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import {
    getPrimePlanService,
    getPrimeStatusService,
    subscribePrimeService,
    confirmPrimeService,
} from "../services/prime.service.js";

const handleError = (res, error) => {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error.message ?? error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
};

// GET /prime/plan
export const getPrimePlan = (req, res) => {
    successResponseBody.message = "Prime plan fetched successfully";
    successResponseBody.data    = getPrimePlanService();
    return res.status(STATUS_CODES.OK).json(successResponseBody);
};

// GET /prime/me
export const getPrimeStatus = async (req, res) => {
    try {
        successResponseBody.message = "Prime membership fetched successfully";
        successResponseBody.data    = await getPrimeStatusService(req.user._id);
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        return handleError(res, error);
    }
};

// POST /prime/subscribe
export const subscribePrime = async (req, res) => {
    try {
        const response = await subscribePrimeService(req.user._id);
        successResponseBody.message = response.activated ? "Prime Pass activated" : "Payment initiated";
        successResponseBody.data    = response;
        return res.status(response.activated ? STATUS_CODES.OK : STATUS_CODES.CREATED).json(successResponseBody);
    } catch (error) {
        return handleError(res, error);
    }
};

// POST /prime/confirm
export const confirmPrime = async (req, res) => {
    try {
        successResponseBody.message = "Prime Pass extended successfully";
        successResponseBody.data    = await confirmPrimeService({
            userId:          req.user._id,
            paymentIntentId: req.body.paymentIntentId,
        });
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        return handleError(res, error);
    }
};
