import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import { getWatchlistService, getWatchlistMoviesService, setWatchlistService, setNotifyService, mergeWatchlistService } from "../services/watchlist.service.js";
import { listNotificationsService, markReadService, markAllReadService } from "../services/notification.service.js";

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

export const getWatchlist       = handle((req) => getWatchlistService(req.userId), "Watchlist fetched");
export const getWatchlistMovies = handle((req) => getWatchlistMoviesService(req.userId), "Watchlist fetched");
export const addToWatchlist     = handle((req) => setWatchlistService(req.userId, req.params.movieId, true), "Added to watchlist");
export const removeFromWatchlist= handle((req) => setWatchlistService(req.userId, req.params.movieId, false), "Removed from watchlist");
export const notifyOn           = handle((req) => setNotifyService(req.userId, req.params.movieId, true), "We'll let you know");
export const notifyOff          = handle((req) => setNotifyService(req.userId, req.params.movieId, false), "Notification removed");
export const mergeWatchlist     = handle((req) => mergeWatchlistService(req.userId, Array.isArray(req.body?.ids) ? req.body.ids : []), "Watchlist synced");

export const getNotifications   = handle((req) => listNotificationsService(req.userId), "Notifications fetched");
export const readNotification   = handle((req) => markReadService(req.userId, req.params.id), "Marked as read");
export const readAllNotifications = handle((req) => markAllReadService(req.userId), "All marked as read");
