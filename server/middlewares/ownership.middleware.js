import mongoose from "mongoose";
import Theatre from "../models/theatre.model.js";
import Show from "../models/show.model.js";
import { STATUS_CODES, USER_ROLE } from "../utils/constants.js";
import { errorResponseBody } from "../utils/response.utils.js";

// Theatre owners (CLIENT) may only manage their own theatres and the shows in them.
// Admins can manage everything. Must run after isAuthenticated.

const deny = (res, code, err) => {
    errorResponseBody.err = err;
    return res.status(code).json(errorResponseBody);
};

export async function canManageTheatreId(user, theatreId) {
    if (user.userRole === USER_ROLE.admin) return { ok: true };
    if (!mongoose.isValidObjectId(theatreId)) return { ok: false, code: STATUS_CODES.BAD_REQUEST, err: "Invalid theatre id" };
    const theatre = await Theatre.findById(theatreId).select("owner");
    if (!theatre) return { ok: false, code: STATUS_CODES.NOT_FOUND, err: "No theatre found for the given id" };
    if (theatre.owner?.toString() !== user._id.toString())
        return { ok: false, code: STATUS_CODES.FORBIDDEN, err: "You can only manage your own theatres" };
    return { ok: true };
}

/** Theatre id from req.params.id */
export const ownsTheatreParam = async (req, res, next) => {
    const r = await canManageTheatreId(req.user, req.params.id);
    return r.ok ? next() : deny(res, r.code, r.err);
};

/** New show: theatre comes from the body */
export const ownsTheatreInBody = async (req, res, next) => {
    const r = await canManageTheatreId(req.user, req.body?.theatreId);
    return r.ok ? next() : deny(res, r.code, r.err);
};

/** Existing show (req.params.id) — and the target theatre if the update moves it */
export const ownsShowParam = async (req, res, next) => {
    if (req.user.userRole === USER_ROLE.admin) return next();
    if (!mongoose.isValidObjectId(req.params.id)) return deny(res, STATUS_CODES.BAD_REQUEST, "Invalid show id");
    const show = await Show.findById(req.params.id).select("theatreId");
    if (!show) return deny(res, STATUS_CODES.NOT_FOUND, "No show found for the given id");
    for (const theatreId of new Set([show.theatreId.toString(), req.body?.theatreId].filter(Boolean))) {
        const r = await canManageTheatreId(req.user, theatreId);
        if (!r.ok) return deny(res, r.code, r.err);
    }
    return next();
};
