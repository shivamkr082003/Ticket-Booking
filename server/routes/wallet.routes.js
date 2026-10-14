import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { getWallet, redeemGiftCard, purchaseGiftCard, confirmGiftCard, myGiftCards } from "../controllers/wallet.controller.js";
import { redeemSchema, giftCardPurchaseSchema, giftCardConfirmSchema } from "../validations/wallet.validation.js";

const router = express.Router();

router.get ("/wallet",                isAuthenticated, getWallet);
router.post("/wallet/redeem",         isAuthenticated, validate(redeemSchema), redeemGiftCard);
router.get ("/gift-cards/mine",       isAuthenticated, myGiftCards);
router.post("/gift-cards/purchase",   isAuthenticated, validate(giftCardPurchaseSchema), purchaseGiftCard);
router.post("/gift-cards/confirm",    isAuthenticated, validate(giftCardConfirmSchema), confirmGiftCard);

export default router;
