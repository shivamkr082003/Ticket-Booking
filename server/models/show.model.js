import mongoose from "mongoose";
import { seatLayoutSchema } from "./theatre.model.js";

const showSchema = new mongoose.Schema({
    theatreId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Theatre"
    },
    movieId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Movie"
    },
    showTime : {
        type: Date,
        required: true
    },
     screen: {                       // : "Screen 1", "Audi 2", "IMAX Hall"
        type: String,
        required: true,
        trim: true,
        default: "Screen 1"
    },
    noOfSeats : {
        type: Number,
        required: true,
        min : 1
    },
     bookedSeats: {                  // : ["A1","A2","B5"]
        type: [String],
        default: []
    },
    seatLayout: {                   // snapshot of the screen layout + category prices; null = legacy 8×10 single price
        type: seatLayoutSchema,
        default: null
    },
    price: {
        type: Number,
        required: true
    },
    language: {                     // : which dubbed version
        type: String,
        trim: true,
        default: "Hindi"
    },
    format: {
        type: String,
        enum: ["2D","3D","IMAX","4DX","Dolby Atmos"],
        default : "2D"
    },
    tags: {                         // accessibility & audience tags shown with the showtime
        type: [String],
        enum: ["Subtitled", "Audio Description", "Wheelchair Accessible", "Sensory Friendly", "Kids"],
        default: []
    },
    priceAdjustments: {             // dynamic pricing applied at scheduling, e.g. [{ label: "Weekend", pct: 10 }]
        type: [{ _id: false, label: String, pct: Number }],
        default: []
    },
    isActive: {                     // : soft delete / cancel show
        type: Boolean,
        default: true,
        index: true
    }
}, {timestamps: true});

showSchema.index({theatreId: 1,movieId: 1,showTime: 1});

const Show = mongoose.model('Show', showSchema);

export default Show;