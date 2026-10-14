import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import { listCouponsService, createCouponService, updateCouponService, deleteCouponService } from "../services/coupon.service.js";
import { listActiveOffers } from "../services/pricing.service.js";

const handle = (fn, message, status = STATUS_CODES.OK) => async (req, res) => {
  try {
    successResponseBody.message = message;
    successResponseBody.data    = await fn(req);
    return res.status(status).json(successResponseBody);
  } catch (error) {
    if (error.err) { errorResponseBody.err = error.err; return res.status(error.code).json(errorResponseBody); }
    errorResponseBody.err = error.message ?? error;
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
  }
};

export const getOffers    = handle(() => listActiveOffers(), "Offers fetched successfully");
export const getCoupons   = handle(() => listCouponsService(), "Coupons fetched successfully");
export const createCoupon = handle((req) => createCouponService(req.body), "Coupon created", STATUS_CODES.CREATED);
export const updateCoupon = handle((req) => updateCouponService(req.params.id, req.body), "Coupon updated");
export const deleteCoupon = handle((req) => deleteCouponService(req.params.id), "Coupon deleted");
