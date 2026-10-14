import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "./PaymentForm.css";

interface PaymentFormProps {
  totalAmount:  number;
  onSuccess:    (paymentIntentId: string) => void;
  onError:      (message: string) => void;
}

export default function PaymentForm({ totalAmount, onSuccess, onError }: PaymentFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // No redirect — handle in-app
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message ?? "Payment failed. Please try again.";
      setErrorMsg(msg);
      onError(msg);
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      const msg = "Payment not completed. Please try again.";
      setErrorMsg(msg);
      onError(msg);
      setProcessing(false);
    }
  };

  return (
    <form className="pf-form" onSubmit={handleSubmit}>
      <p className="pf-heading">PAYMENT DETAILS</p>

      <div className="pf-stripe-wrap">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: { address: { country: "IN" } },
            },
          }}
        />
      </div>

      {errorMsg && (
        <div className="pf-error">
          <span>⚠</span> {errorMsg}
        </div>
      )}

      <div className="pf-test-note">
        <p>🧪 Test mode — use card <strong>4242 4242 4242 4242</strong></p>
        <p>Any future expiry · Any 3-digit CVV · Any zip</p>
      </div>

      <button
        type="submit"
        className="pf-pay-btn"
        disabled={!stripe || !elements || processing}
      >
        {processing
          ? <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Processing…</>
          : `Pay ₹${totalAmount}`
        }
      </button>
    </form>
  );
}