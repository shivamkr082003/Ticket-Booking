import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import { getPlatformStatsService } from "../services/stats.service.js";

// GET /stats
export const getPlatformStats = async (req, res) => {
    try {
        successResponseBody.message = "Stats fetched successfully";
        successResponseBody.data    = await getPlatformStatsService();
        return res.status(STATUS_CODES.OK).json(successResponseBody);
    } catch (error) {
        errorResponseBody.err = error.message ?? error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
};
