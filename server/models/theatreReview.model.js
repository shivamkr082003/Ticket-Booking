import mongoose from "mongoose";

// Verified-visit theatre reviews: only users with a past, paid booking at the theatre
const theatreReviewSchema = new mongoose.Schema({
    theatreId:   { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: true, index: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating:      { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    sound:       { type: Number, min: 1, max: 5 },
    seating:     { type: Number, min: 1, max: 5 },
    comment:     { type: String, trim: true, default: "", maxlength: 600 },
}, { timestamps: true });

theatreReviewSchema.index({ theatreId: 1, userId: 1 }, { unique: true });
theatreReviewSchema.index({ theatreId: 1, createdAt: -1 });

const TheatreReview = mongoose.model("TheatreReview", theatreReviewSchema);
export default TheatreReview;
