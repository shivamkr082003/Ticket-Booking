import { v2 as cloudinary } from "cloudinary";

// Lazy init
let configured = false;
const getCloudinary = () => {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
  }
  return cloudinary;
};

// ── Upload image ──────────────────────────────────────────
export const uploadImage = async (fileBuffer, folder = "cineverse") => {
  return new Promise((resolve, reject) => {
    getCloudinary()
      .uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [
            { quality: "auto", fetch_format: "auto" },
            { width: 1200, crop: "limit" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      )
      .end(fileBuffer);
  });
};

// ── Upload video ──────────────────────────────────────────
export const uploadVideo = async (
  fileBuffer,
  folder = "cineverse/trailers",
) => {
  return new Promise((resolve, reject) => {
    getCloudinary()
      .uploader.upload_stream(
        {
          folder,
          resource_type: "video",
          transformation: [{ quality: "auto" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      )
      .end(fileBuffer);
  });
};

// ── Delete file ───────────────────────────────────────────
export const deleteFile = async (publicId, resourceType = "image") => {
  return getCloudinary().uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

// ── Get optimized URL ─────────────────────────────────────
export const getOptimizedUrl = (publicId, options = {}) => {
  return getCloudinary().url(publicId, {
    fetch_format: "auto",
    quality: "auto",
    ...options,
  });
};
