import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  successResponseBody,
  errorResponseBody,
} from "../utils/response.utils.js";
import { STATUS_CODES, isPrimeActive } from "../utils/constants.js";
import {
  createUser,
  getUserByEmail,
  getUserById,
  changePasswordService,
} from "../services/user.service.js";
import { sendOtpEmail } from "../services/email.service.js";
import User from "../models/user.model.js";

// ── Generate 6-digit OTP ──────────────────────────────────
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// ── POST /auth/signup ─────────────────────────────────────
export const signup = async (req, res) => {
  try {
    // Strip empty optional fields
    const body = { ...req.body };
    if (!body.phone) delete body.phone;
    if (!body.avatar) delete body.avatar;

    // Delete existing unverified user with same email (allows re-signup)
    await User.deleteOne({ email: body.email, isEmailVerified: false });

    // Create user — unverified
    body.isEmailVerified = false;

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const user = await createUser(body);

    // Save OTP to user
    await User.findByIdAndUpdate(user._id, {
      emailOtp: otp,
      emailOtpExpiry: otpExpiry,
    });

    // Send OTP email (non-blocking)
    sendOtpEmail({ email: user.email, name: user.name, otp }).catch(
      console.error,
    );

    successResponseBody.message = "OTP sent to your email. Please verify.";
    successResponseBody.data = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };
    return res.status(STATUS_CODES.CREATED).json(successResponseBody);
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error.message ?? String(error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── POST /auth/verify-otp ─────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      errorResponseBody.err = "userId and otp are required";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // Fetch user with OTP fields
    const user = await User.findById(userId).select(
      "+emailOtp +emailOtpExpiry",
    );
    if (!user) {
      errorResponseBody.err = "User not found";
      return res.status(STATUS_CODES.NOT_FOUND).json(errorResponseBody);
    }

    if (user.isEmailVerified) {
      errorResponseBody.err = "Email already verified";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    if (!user.emailOtp || user.emailOtp !== otp.toString()) {
      errorResponseBody.err = "Invalid OTP";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    if (user.emailOtpExpiry < new Date()) {
      errorResponseBody.err = "OTP has expired. Please request a new one.";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // Mark email verified + clear OTP
    await User.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      emailOtp: null,
      emailOtpExpiry: null,
    });

    successResponseBody.message =
      "Email verified successfully! You can now login.";
    successResponseBody.data = null;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error.message ?? error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── POST /auth/resend-otp ─────────────────────────────────
export const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      errorResponseBody.err = "userId is required";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    const user = await User.findById(userId);
    if (!user) {
      errorResponseBody.err = "User not found";
      return res.status(STATUS_CODES.NOT_FOUND).json(errorResponseBody);
    }

    if (user.isEmailVerified) {
      errorResponseBody.err = "Email already verified";
      return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(userId, {
      emailOtp: otp,
      emailOtpExpiry: otpExpiry,
    });

    sendOtpEmail({ email: user.email, name: user.name, otp }).catch(
      console.error,
    );

    successResponseBody.message = "OTP resent successfully";
    successResponseBody.data = null;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error.message ?? error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── POST /auth/signin ─────────────────────────────────────
export const signin = async (req, res) => {
  try {
    const user = await getUserByEmail(req.body.email);

    const isValidPassword = await user.isValidPassword(req.body.password);
    if (!isValidPassword)
      throw {
        err: "Invalid password for the given email",
        code: STATUS_CODES.UNAUTHORISED,
      };

    if (user.userStatus === "REJECTED")
      throw {
        err: "Your account has been rejected. Please contact support.",
        code: STATUS_CODES.FORBIDDEN,
      };

    // Block unverified users
    if (!user.isEmailVerified)
      throw {
        err: "Please verify your email before logging in.",
        code: STATUS_CODES.FORBIDDEN,
      };

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.AUTH_KEY,
      { expiresIn: "24h" },
    );

    successResponseBody.message = "Successfully logged in";
    successResponseBody.data = {
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        userRole: user.userRole,
        userStatus: user.userStatus,
        createdAt: user.createdAt,
        isPrime: isPrimeActive(user),
        primeExpiresAt: user.primeExpiresAt ?? null,
      },
    };

    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error.message ?? error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// ── PATCH /auth/reset ─────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    await changePasswordService({
      userId: req.user._id,
      currentPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
    });
    successResponseBody.message = "Password reset successfully";
    successResponseBody.data = null;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error.message ?? error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};
