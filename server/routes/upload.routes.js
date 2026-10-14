import express        from "express";
import multer         from "multer";
import { uploadImage, uploadVideo, deleteFile } from "../services/cloudinary.service.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

// Optional auth — attaches user if token present, but doesn't block if missing
const optionalAuth = async (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) return next(); // no token → continue without user
    try {
        const jwt  = await import("jsonwebtoken");
        const decoded = jwt.default.verify(token, process.env.AUTH_KEY);
        const { getUserById } = await import("../services/user.service.js");
        req.user = await getUserById(decoded.id);
    } catch { /* invalid token → continue without user */ }
    next();
};
import { STATUS_CODES } from "../utils/constants.js";
import { successResponseBody, errorResponseBody } from "../utils/response.utils.js";

const router = express.Router();

// Memory storage — files in buffer, not disk
const storage = multer.memoryStorage();

const imageUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files are allowed"));
    },
});

const videoUpload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("video/")) cb(null, true);
        else cb(new Error("Only video files are allowed"));
    },
});

// ── POST /upload/image ────────────────────────────────────
router.post("/upload/image",
    optionalAuth,
    imageUpload.single("image"),
    async (req, res) => {
        try {
            if (!req.file) {
                errorResponseBody.err = "No image file provided";
                return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
            }
            const folder = req.body.folder ?? "cineverse";
            const result = await uploadImage(req.file.buffer, folder);
            successResponseBody.message = "Image uploaded successfully";
            successResponseBody.data    = {
                url:      result.secure_url,
                publicId: result.public_id,
                width:    result.width,
                height:   result.height,
                format:   result.format,
            };
            return res.status(STATUS_CODES.CREATED).json(successResponseBody);
        } catch (error) {
            errorResponseBody.err = error.message ?? "Upload failed";
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
        }
    }
);

// ── POST /upload/video ────────────────────────────────────
router.post("/upload/video",
    isAuthenticated,
    isAdmin,
    videoUpload.single("video"),
    async (req, res) => {
        try {
            if (!req.file) {
                errorResponseBody.err = "No video file provided";
                return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponseBody);
            }
            const result = await uploadVideo(req.file.buffer);
            successResponseBody.message = "Video uploaded successfully";
            successResponseBody.data    = {
                url:      result.secure_url,
                publicId: result.public_id,
                duration: result.duration,
                format:   result.format,
            };
            return res.status(STATUS_CODES.CREATED).json(successResponseBody);
        } catch (error) {
            errorResponseBody.err = error.message ?? "Upload failed";
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
        }
    }
);

// ── DELETE /upload/:publicId ──────────────────────────────
router.delete("/upload/:publicId",
    isAuthenticated,
    async (req, res) => {
        try {
            const { publicId } = req.params;
            const { type = "image" } = req.query;
            await deleteFile(decodeURIComponent(publicId), type);
            successResponseBody.message = "File deleted successfully";
            successResponseBody.data    = null;
            return res.status(STATUS_CODES.OK).json(successResponseBody);
        } catch (error) {
            errorResponseBody.err = error.message ?? "Delete failed";
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(errorResponseBody);
        }
    }
);

export default router;