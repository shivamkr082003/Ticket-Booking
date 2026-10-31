// Uploads landscape hero banners to Cloudinary and sets Movie.bannerUrl.
//   1. Put images in server/scripts/banners/, named after the movie: avatar-fire-and-ash.jpg
//      (run with no images first — it prints the expected file name for every movie)
//   2. npm run banners
// URLs are also saved to scripts/data/banners.json so `npm run seed -- --reset` keeps them.
import "dotenv/config";

import fs       from "fs";
import path     from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "../config/db.js";
import Movie     from "../models/movie.model.js";

const HERE        = path.dirname(fileURLToPath(import.meta.url));
const BANNER_DIR  = path.join(HERE, "banners");
const OUT_FILE    = path.join(HERE, "data", "banners.json");
const EXTENSIONS  = [".jpg", ".jpeg", ".png", ".webp"];
const MIN_WIDTH   = 1600;   // anything narrower looks soft across a full-width hero

const slugify = (name) =>
    name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
        .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
    await connectDB();
    const movies = await Movie.find().select("name releaseStatus bannerUrl").sort({ releaseStatus: -1, name: 1 });
    const bySlug = new Map(movies.map((m) => [slugify(m.name), m]));

    fs.mkdirSync(BANNER_DIR, { recursive: true });
    const files = fs.readdirSync(BANNER_DIR).filter((f) => EXTENSIONS.includes(path.extname(f).toLowerCase()));

    if (!files.length) {
        console.log(`No images in ${path.relative(process.cwd(), BANNER_DIR)}/ — name them like this:\n`);
        for (const m of movies) console.log(`  ${slugify(m.name)}.jpg   ${m.releaseStatus === "RELEASED" ? "(hero)" : ""}`);
        return;
    }

    const saved = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) : {};
    let done = 0;

    for (const file of files) {
        const slug  = slugify(path.parse(file).name);
        const movie = bySlug.get(slug);
        if (!movie) { console.log(`✗ ${file}: no movie matches "${slug}"`); continue; }

        // Fixed public_id + overwrite → re-running replaces the image instead of duplicating it
        const res = await cloudinary.uploader.upload(path.join(BANNER_DIR, file), {
            folder: "cineverse/banners",
            public_id: slug,
            overwrite: true,
            resource_type: "image",
            transformation: [{ width: 2560, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
        });

        await Movie.updateOne({ _id: movie._id }, { bannerUrl: res.secure_url });
        saved[movie.name] = res.secure_url;
        done += 1;
        const warn = res.width < MIN_WIDTH ? `  ⚠ only ${res.width}px wide — will look soft, use ${MIN_WIDTH}px+` : "";
        console.log(`✓ ${movie.name} (${res.width}×${res.height})${warn}`);
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(saved, null, 2) + "\n");
    await clearMovieCache();
    console.log(`\n${done} banner(s) set. Saved to ${path.relative(process.cwd(), OUT_FILE)}`);
}

// Movie detail/list responses are cached in Redis — drop them so the new banners show immediately
async function clearMovieCache() {
    try {
        const { createClient } = await import("redis");
        const r = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
        await r.connect();
        for await (const keys of r.scanIterator({ MATCH: "cache:movie*", COUNT: 200 })) {
            const list = Array.isArray(keys) ? keys : [keys];
            if (list.length) await r.del(list);
        }
        await r.quit();
    } catch (e) {
        console.log("Could not clear Redis cache (restart the server or wait 5 min):", e.message);
    }
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
