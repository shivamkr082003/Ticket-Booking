import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import {createShowsBulkService,createShowService,deleteShowService,getShowsService,getShowService,updateShowService,updateShowStatusService} from "../services/show.service.js";

export const createShow = async (req, res) => {
  try {
    const response = await createShowService(req.body);
    successResponseBody.message = "Show created successfully";
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.CREATED).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

export const createShowsBulk = async (req, res) => {
  try {
    const response = await createShowsBulkService(req.body);
    successResponseBody.message = `${response.created.length} show(s) scheduled`;
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.CREATED).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

export const getShows = async (req, res) => {
  try {
    const response = await getShowsService(req.query);
    successResponseBody.message = "Shows fetched successfully";
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody); // ← bug fix: was missing .json()
  }
};

export const getShow = async (req, res) => {
  try {
    const response = await getShowService(req.params.id);
    successResponseBody.message = "Show fetched successfully";
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

export const deleteShow = async (req, res) => {
  try {
    const response = await deleteShowService(req.params.id);
    successResponseBody.message = "Show deleted successfully";
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

export const updateShow = async (req, res) => {
  try {
    const response = await updateShowService(req.params.id, req.body);
    successResponseBody.message = "Show updated successfully";
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

export const updateShowStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      errorResponseBody.err = "isActive must be a boolean";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }
    const response = await updateShowStatusService(req.params.id, isActive);
    successResponseBody.message = `Show ${isActive ? "activated" : "deactivated"} successfully`;
    successResponseBody.data    = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};