import { STATUS_CODES } from "./constants.js";

export const errorResponseBody = {
    success : false,
    message : "Internal server error",
    err : {},
    data : {}
}

export const successResponseBody = {
    success : true,
    message : "Processed the request successfully.",
    err : {},
    data : {}
}

export const handleValidationError = (error) => {
  if (error.name === "ValidationError") {
    const err = {};
    Object.keys(error.errors).forEach((key) => {
      err[key] = error.errors[key].message;
    });
    throw { err, code: STATUS_CODES.UNPROCESSABLE_ENTITY };
  }
  throw error;
};