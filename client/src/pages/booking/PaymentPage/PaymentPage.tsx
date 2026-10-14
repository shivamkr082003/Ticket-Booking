import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import AppNavbar     from "../../../components/common/Navbar/Navbar.tsx";
import { showToast } from "../../../components/common/Toast/toast.ts";
import PaymentForm   from "../../../components/booking/PaymentForm/PaymentForm.tsx";
import BookingSummary from "../../../components/booking/BookingSummary/BookingSummary.tsx";
import { bookingsApi } from "../../../api/index.api.ts";
import { useTheme } from "../../../context/ThemeContext.tsx";
import { stripeAppearance } from "../../../utils/stripeAppearance.ts";
import "./PaymentPage.css";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!STRIPE_KEY) {
  console.error("VITE_STRIPE_PUBLISHABLE_KEY is not set in .env");
}
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const booking  = location.state?.booking;

  // Guard — if no booking state, redirect back
  if (!booking) {
    navigate("/movies");
    return null;
  }

  const handleSuccess = async (paymentIntentId: string) => {
    try {
      const confirmed = await bookingsApi.confirm(booking.bookingId, paymentIntentId);
      showToast("🎉 Booking confirmed!");
      navigate(`/ticket/${confirmed._id}`, { state: { booking: confirmed } });
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to confirm booking", "error");
    }
  };

  const handleError = (message: string) => {
    showToast(message, "error");
  };

  const stripeOptions = {
    clientSecret: booking.clientSecret,
    appearance:   stripeAppearance(theme),
  };

  const showInfo = {
    movieName: booking.show.name,
    poster:    booking.show.poster,
    theatre:   booking.show.theatre,
    showTime:  booking.show.showTime,
    format:    booking.show.format,
    language:  booking.show.language,
    screen:    booking.show.screen,
    price:     booking.show.price,
  };

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      <div className="pp-container container">
        <div className="pp-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <div>
            <h1 className="pp-title">COMPLETE PAYMENT</h1>
            <p className="pp-sub">Secure payment powered by Stripe</p>
          </div>
        </div>

        <div className="pp-layout">
          {/* Payment form */}
          <div className="pp-form-wrap">
            <Elements stripe={stripePromise} options={stripeOptions}>
              <PaymentForm
                totalAmount={booking.cardAmount ?? booking.totalAmount}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </Elements>
          </div>

          {/* Summary */}
          <div className="pp-summary-wrap">
            <BookingSummary
              show={showInfo}
              selectedSeats={booking.seats}
              onConfirm={() => {}}
              confirming={false}
              disabled={true}
              ctaLabel="Pay"
              discount={booking.discount ?? 0}
              lineItems={booking.lineItems}
              addOns={booking.addOns}
              couponCode={booking.couponCode}
              couponDiscount={booking.couponDiscount}
              prime={(booking.feeWaived ?? 0) > 0}
              walletApplied={booking.walletApplied ?? 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}