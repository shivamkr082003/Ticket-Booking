import jwt from "jsonwebtoken";

import { errorResponseBody } from '../utils/response.utils.js';
import { USER_ROLE, STATUS_CODES } from '../utils/constants.js';
import { getUserById } from "../services/user.service.js";


export const validateSignupRequest = async (req, res, next) => {
    // validate name of the user
    if(!req.body.name) {
        errorResponseBody.err = "Name of the user not present in the request";
        return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // validate email of the user
    if(!req.body.email) {
        errorResponseBody.err = "Email of the user not present in the request";
        return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // validate password present of the user
    if(!req.body.password) {
        errorResponseBody.err = "Password of the user not present in the request";
        return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // request is valid
    next();
}

export const validateSigninRequest = async (req, res, next) => {
    // validate user email presence
    if(!req.body.email) {
        errorResponseBody.err = "No email provided for sign in";
        return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // validate user password presence
    if(!req.body.password) {
        errorResponseBody.err = "No password provided for sign in";
        return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // request is valid
    next();
}

export const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.headers["x-access-token"];
        if(!token) {
            console.log("No token provided");
            errorResponseBody.err = "No token provided";
            return res.status(STATUS_CODES.FORBIDDEN).json(errorResponseBody);
        }
        const response = jwt.verify(token, process.env.AUTH_KEY);
        if(!response) {
            console.log("Token not verified");
            errorResponseBody.err = "Token not verified";
            return res.status(STATUS_CODES.UNAUTHORISED).json(errorResponseBody);
        }
        const user = await getUserById(response.id);
        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        console.log(error);
        // Expired / not-yet-valid tokens are 401 too, so the client logs the user out
        if(error.name == "TokenExpiredError") {
            errorResponseBody.err = "Your session has expired. Please log in again.";
            return res.status(STATUS_CODES.UNAUTHORISED).json(errorResponseBody);
        }
        if(error.name == "JsonWebTokenError" || error.name == "NotBeforeError") {
            errorResponseBody.err = error.message;
            return res.status(STATUS_CODES.UNAUTHORISED).json(errorResponseBody);
        }
        if(error.code == STATUS_CODES.NOT_FOUND) {
            errorResponseBody.err = "User doesn't exist"
            return res.status(error.code).json(errorResponseBody);
        }
        errorResponseBody.err = error;
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
    }
}

export const validateResetPasswordRequest = (req, res, next) => {
    // validate old password presence
    if(!req.body.oldPassword) {
        errorResponseBody.err = 'Missing the old password in the request';
        return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // validate new password presence
    if(!req.body.newPassword) {
        errorResponseBody.err = 'Missing the new password in the request';
        return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
    }

    // we can proceed
    next();
}


export const isAdmin = async (req, res, next) => {
    if (req.user.userRole !== USER_ROLE.admin) {
        errorResponseBody.err = "User is not an admin, cannot proceed with the request";
        return res.status(STATUS_CODES.FORBIDDEN).json(errorResponseBody);
    }
    next();
}

export const isClient = async (req, res, next) => {
    const user = await getUserById(req.user);
    if(user.userRole != USER_ROLE.client) {
        errorResponseBody.err = "User is not a client, cannot proceed with the request";
        return res.status(STATUS_CODES.UNAUTHORISED).json(errorResponseBody);
    }
    next();
}

export const isAdminOrClient = async (req, res, next) => {
    const user = await getUserById(req.user);
    if(user.userRole != USER_ROLE.admin && user.userRole != USER_ROLE.client) {
        console.log("Not client or admin");
        errorResponseBody.err = "User is neither a client not an admin, cannot proceed with the request";
        return res.status(STATUS_CODES.UNAUTHORISED).json(errorResponseBody);
    }
    next();
}