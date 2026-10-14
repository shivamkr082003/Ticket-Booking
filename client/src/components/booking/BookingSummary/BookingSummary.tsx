import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AddOn, CancellationPolicy, LineItem } from "../../../types/movie.types.ts";
import { PLATFORM_POLICY } from "../../../constants/policy.ts";
import { hrs } from "../../../utils/plural.ts";
import { BOOKING_FEE, bookingFeeFor } from "../../../utils/fees.ts";
import "./BookingSummary.css";

interface ShowInfo {
  movieName:  string;
  poster?:    string;
  theatre:    string;
  showTime:   string;
  format:     string;
  language:   string;
  screen:     string;
  price:      number;
}

interface BookingSummaryProps {
  show:          ShowInfo;
  selectedSeats: string[];
  onConfirm:     () => void;
  confirming:    boolean;
  disabled:      boolean;
  ctaLabel?:     string;
  /** Prime Pass discount in ₹ (0 / omitted for non-members) */
  discount?:     number;
  /** What a non-member would save — shows a Prime upsell when > 0 */
  primeSavings?: number;
  /** Per seat-category breakdown; omitted → every seat at show.price */
  lineItems?:    LineItem[];
  /** Food & beverages added to the order */
  addOns?:         AddOn[];
  couponCode?:     string | null;
  couponDiscount?: number;
  /** Prime members don't pay the booking fee */
  prime?:          boolean;
  /** Wallet money put towards this order (₹); the CTA shows what's left to pay */
  walletApplied?:  number;
  /** The cinema's own refund windows, when it set any */
  policy?:         Partial<CancellationPolicy> | null;
  /** Extra content under the totals (offers picker) */
  children?:       ReactNode;
}

export default function BookingSummary({
  show, selectedSeats, onConfirm, confirming, disabled, ctaLabel = "Proceed to Pay",
  discount = 0, primeSavings = 0, lineItems, addOns = [], couponCode, couponDiscount = 0, prime = false, walletApplied = 0, policy, children,
}: BookingSummaryProps) {
  const lines = lineItems?.length
    ? lineItems
    : selectedSeats.length ? [{ category: "STANDARD", label: "", price: show.price, seats: selectedSeats }] : [];
  const subtotal = lines.reduce((a, l) => a + l.price * l.seats.length, 0);
  const foodTotal = addOns.reduce((a, f) => a + f.price * f.qty, 0);
  const fee      = bookingFeeFor(selectedSeats.length, prime);
  const total    = subtotal - discount + foodTotal - couponDiscount + fee.bookingFee + fee.bookingFeeGst;
  // A non-member's Prime saving includes the fee they'd stop paying
  const upsell   = primeSavings > 0 ? primeSavings + bookingFeeFor(selectedSeats.length).bookingFee + bookingFeeFor(selectedSeats.length).bookingFeeGst : 0;

  const fmt = (d: string) => new Date(d).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="bs-card">
      <p className="bs-heading">BOOKING SUMMARY</p>

      {/* Movie */}
      <div className="bs-movie">
        {show.poster && (
          <img src={show.poster} alt={show.movieName} className="bs-poster"
            onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
        )}
        <div className="bs-movie-info">
          <p className="bs-movie-name">{show.movieName}</p>
          <p className="bs-theatre">{show.theatre}</p>
          <p className="bs-time">{fmt(show.showTime)}</p>
          <div className="bs-tags">
            <span className="bs-tag">{show.format}</span>
            <span className="bs-tag">{show.language}</span>
            <span className="bs-tag">{show.screen}</span>
          </div>
        </div>
      </div>

      <div className="bs-divider" />

      {/* Seats */}
      <div className="bs-row">
        <span className="bs-label">Selected Seats</span>
        {selectedSeats.length > 0 && <span className="bs-count">{selectedSeats.length}</span>}
      </div>
      {selectedSeats.length === 0 ? (
        <p className="bs-no-seats">No seats selected yet</p>
      ) : (
        <div className="bs-seat-tags">
          {selectedSeats.map(s => (
            <span key={s} className="bs-seat-tag">{s}</span>
          ))}
        </div>
      )}

      <div className="bs-divider" />

      {/* Price breakdown */}
      {lines.length === 0 && (
        <div className="bs-row">
          <span className="bs-label">0 seats</span>
          <span className="bs-amount">₹0</span>
        </div>
      )}
      {lines.map(l => (
        <div key={l.category} className="bs-row">
          <span className="bs-label">
            {l.seats.length} × {l.label ? `${l.label} · ` : ""}₹{l.price}
          </span>
          <span className="bs-amount">₹{l.price * l.seats.length}</span>
        </div>
      ))}
      {discount > 0 && (
        <div className="bs-row bs-discount">
          <span>✦ Prime Pass discount</span>
          <span>− ₹{discount}</span>
        </div>
      )}
      {addOns.length > 0 && (
        <>
          <p className="bs-sublabel">Food &amp; beverages</p>
          {addOns.map(f => (
            <div key={f.itemId} className="bs-row">
              <span className="bs-label bs-label--item">{f.qty} × {f.name}</span>
              <span className="bs-amount">₹{f.price * f.qty}</span>
            </div>
          ))}
        </>
      )}
      {couponDiscount > 0 && (
        <div className="bs-row bs-discount">
          <span>🏷 Offer {couponCode}</span>
          <span>− ₹{couponDiscount}</span>
        </div>
      )}
      {selectedSeats.length > 0 && (prime ? (
        <div className="bs-row bs-discount">
          <span>✦ Booking fee waived</span>
          <span><s className="bs-strike">₹{fee.feeWaived}</s> ₹0</span>
        </div>
      ) : (
        <div className="bs-row bs-fee">
          <span className="bs-label" title={`₹${BOOKING_FEE.perTicket} per ticket + ${BOOKING_FEE.gstPct}% GST`}>
            Booking fee <small>(incl. ₹{fee.bookingFeeGst} GST)</small>
          </span>
          <span className="bs-amount">₹{fee.bookingFee + fee.bookingFeeGst}</span>
        </div>
      ))}
      <div className="bs-row bs-total">
        <span>Total</span>
        <span>₹{total}</span>
      </div>
      {walletApplied > 0 && (
        <>
          <div className="bs-row bs-discount">
            <span>💳 Paid from wallet</span>
            <span>− ₹{Math.min(walletApplied, total)}</span>
          </div>
          <div className="bs-row bs-due">
            <span>To pay now</span>
            <span>₹{Math.max(0, total - walletApplied)}</span>
          </div>
        </>
      )}

      {children}

      <button
        className="bs-cta"
        onClick={onConfirm}
        disabled={disabled || confirming || selectedSeats.length === 0}
      >
        {confirming
          ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          : walletApplied >= total && total > 0 ? `${ctaLabel === "Continue" ? "Continue" : "Pay with wallet"} · ₹${total}` : `${ctaLabel} · ₹${Math.max(0, total - walletApplied)}`
        }
      </button>

      {discount === 0 && upsell > 0 && (
        <Link to="/prime" className="bs-prime-upsell">
          <span className="bs-prime-icon">✦</span>
          <span>Save <strong>₹{upsell}</strong> on this booking with Prime Pass — 15% off &amp; no booking fee</span>
        </Link>
      )}

      <p className="bs-note">
        {(() => {
          const p = { ...PLATFORM_POLICY, ...(policy ?? {}) };
          return `Full refund up to ${hrs(p.fullRefundHours)} before the show · ${p.partialRefundPct}% until ${hrs(p.cancelCutoffHours)} before · booking fee non-refundable`;
        })()}
      </p>
    </div>
  );
}
