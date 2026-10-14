import { STATUS_CODES } from "../utils/constants.js";

export const validate = (schema) => (req, res, next) => {

  const result = schema.safeParse(req.body);

  if (!result.success) {
    console.log("schema error");
    return res.status(400).json({
      success: false,
      err: result.error.flatten(),
      message: "Validation failed"
    });
  }

  req.body = result.data; // sanitized data
  next();
};