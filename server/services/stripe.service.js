import Stripe from "stripe";

// Lazy init — ensures dotenv is loaded before Stripe is created.
// Shared by bookings and Prime Pass so there is exactly one client.
let _stripe = null;
export const getStripe = () => {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return _stripe;
};
