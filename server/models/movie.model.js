import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        trim : true,
        index : true
    },
    description : {
        type : String,
        required : true,
        maxlength : 2000
    },
    casts : {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length > 0;
            },
            message: "At least one cast member is required"
        }
    },
    trailerUrl : {
        type: String,
        required : true,
        match: /^(https?:\/\/).+/   // basic URL validation
    },
    languages : {
        type: [String],
        required: true,
        default: ["English"],
    },
    releaseDate : {
        type : Date,
        required : true,
        index : true
    },
    duration : {
        type : Number, // in minutes
        required : true,
        min : 1
    },
    posterUrl : {
        type : String,
        required : true
    },
    bannerUrl : {
        type : String,
        default : ""
    },
    images: {                       // ← NEW: stills, behind-the-scenes etc
        type: [String],
        default: []
    },
    genre : {
        type: [String],
        required: true,
        validate: {
            validator: (v) => v.length > 0,
            message: "At least one genre is required"
        },
        index: true
    },
    rating : {
        type : Number,
        min : 0,
        max : 10,
        default : 0
    },
    certificate : {
        type : String,
        enum : ["U", "UA", "A", "R", "PG-13"],
        default : "UA"
    },
    director : {
        type : String,
        required : true,
        trim : true
    },
    releaseStatus : {
        type: String,
        enum: ["COMING_SOON", "RELEASED", "BANNED"],
        default: "COMING_SOON",
        index: true
    },
    // This helps to never delete movie permanently from the db =>  Soft Delete
     isActive: {
        type: Boolean,
        default: true,
        index : true
    }
},{timestamps : true});


//  Indexes (Important for Production Performance)
// Full-text search
movieSchema.index({ name: "text", description: "text" });
// Frequently used filters
movieSchema.index({ releaseStatus: 1, isActive: 1 });
movieSchema.index({ genre: 1, releaseDate: -1 });

const Movie = mongoose.model("Movie",movieSchema);

export default Movie;