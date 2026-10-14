import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import { getWalletService, redeemGiftCardService, purchaseGiftCardService, confirmGiftCardService, myGiftCardsService } from "../services/wallet.service.js";

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

export const getWallet       = handle((req) => getWalletService(req.userId), "Wallet fetched");
export const redeemGiftCard  = handle((req) => redeemGiftCardService(req.userId, req.body.code), "Gift card redeemed");
export const purchaseGiftCard= handle((req) => purchaseGiftCardService(req.userId, req.body), "Gift card payment started");
export const confirmGiftCard = handle((req) => confirmGiftCardService(req.userId, req.body), "Gift card ready");
export const myGiftCards     = handle((req) => myGiftCardsService(req.userId), "Gift cards fetched");
