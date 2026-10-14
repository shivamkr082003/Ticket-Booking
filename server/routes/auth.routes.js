import express from "express";
import {
    validateSignupRequest,
    validateSigninRequest,
    validateResetPasswordRequest,
    isAuthenticated,
} from "../middlewares/auth.middleware.js";
import {
    signup,
    signin,
    verifyOtp,
    resendOtp,
    resetPassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/auth/signup",     validateSignupRequest,      signup);
router.post("/auth/verify-otp", verifyOtp);
router.post("/auth/resend-otp", resendOtp);
router.post("/auth/signin",     validateSigninRequest,      signin);
router.patch("/auth/reset",     isAuthenticated, validateResetPasswordRequest, resetPassword);

export default router;