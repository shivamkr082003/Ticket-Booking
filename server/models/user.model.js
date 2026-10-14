import mongoose from "mongoose";
import bcrypt   from "bcryptjs";
import { USER_ROLE, USER_STATUS } from "../utils/constants.js";

const userSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: true, 
        trim: true, 
        unique: true
    },
    email: {
        type: String, 
        required: true, 
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email"],
        lowercase: true, 
        trim: true
    },
    password: {
        type: String, 
        required: true, 
        minLength: 6, 
        select: false
    },
    phone:  { 
        type: String, 
        trim: true, 
        default: "" 
    },
    avatar: { 
        type: String, 
        default: "" 
    },

    // ── Email verification ────────────────────────────────
    isEmailVerified: { 
        type: Boolean, 
        default: false 
    },
    emailOtp: { 
        type: String,  
        default: null, 
        select: false 
    },
    emailOtpExpiry: { 
        type: Date,    
        default: null, 
        select: false 
    },

    userRole: {
        type: String, 
        required: true,
        enum: {
            values: [USER_ROLE.customer, USER_ROLE.admin, USER_ROLE.client],
            message: "Invalid user role given"
        },
        default: USER_ROLE.customer
    },
    userStatus: {
        type: String, 
        required: true,
        enum: {
            values: [USER_STATUS.approved, USER_STATUS.pending, USER_STATUS.rejected, "UNVERIFIED"],
            message: "Invalid status for user given"
        },
        default: USER_STATUS.approved
    },

    // ── Prime Pass membership ─────────────────────────────
    primeExpiresAt: {
        type: Date,
        default: null
    },
    primeSince: {
        type: Date,
        default: null
    },
    primeTrialUsed: {
        type: Boolean,
        default: false
    },
    // Cineverse wallet — instant refunds & gift cards (ledger in WalletTxn)
    walletBalance: { type: Number, default: 0, min: 0 },
    // Account watchlist + one-shot "notify me when bookings open"
    watchlist:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    notifyMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    // Stripe PaymentIntent ids already credited — makes /prime/confirm idempotent
    primePaymentIds: {
        type: [String],
        default: [],
        select: false
    }
}, { timestamps: true });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isValidPassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

userSchema.index({ watchlist: 1 });
userSchema.index({ notifyMovies: 1 });

const User = mongoose.model("User", userSchema);
export default User;