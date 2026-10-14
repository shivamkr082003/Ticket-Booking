import Coupon from "../models/coupon.model.js";
import { STATUS_CODES } from "../utils/constants.js";
import { handleValidationError } from "../utils/response.utils.js";

export const listCouponsService = () => Coupon.find().sort({ createdAt: -1 });

export const createCouponService = async (data) => {
  try {
    if (await Coupon.exists({ code: data.code }))
      throw { err: `Coupon ${data.code} already exists`, code: STATUS_CODES.CONFLICT };
    return await Coupon.create(data);
  } catch (error) { handleValidationError(error); }
};

export const updateCouponService = async (id, data) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!coupon) throw { err: "Coupon not found", code: STATUS_CODES.NOT_FOUND };
    return coupon;
  } catch (error) { handleValidationError(error); }
};

export const deleteCouponService = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw { err: "Coupon not found", code: STATUS_CODES.NOT_FOUND };
  return coupon;
};
