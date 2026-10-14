import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar     from "../../../components/common/Navbar/Navbar.tsx";
import { PageSpinner} from "../../../components/common/SharedUI/SharedUI.tsx";
import { showToast } from "../../../components/common/Toast/toast.ts";
import BookingCard   from "../../../components/booking/BookingCard/BookingCard.tsx";
import Modal         from "../../../components/common/Modal/Modal.tsx";
import { bookingsApi } from "../../../api/index.api.ts";
import type { Booking, RefundQuote } from "../../../types/movie.types.ts";
import "./MyBookingsPage.css";

type Filter = "ALL" | "SUCCESSFUL" | "IN_PROCESS" | "CANCELLED";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All",        value: "ALL"        },
  { label: "Confirmed",  value: "SUCCESSFUL" },
  { label: "Processing", value: "IN_PROCESS" },
  { label: "Cancelled",  value: "CANCELLED"  },
];

export default function MyBookingsPage() {
  const navigate = useNavigate();

  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<Filter>("ALL");
  const [cancelId,   setCancelId]   = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [quote,      setQuote]      = useState<RefundQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [refundTo,   setRefundTo]   = useState<"SOURCE" | "WALLET">("SOURCE");

  const fetchBookings = useCallback(() => {
    setLoading(true);
    bookingsApi.getMyBookings()
      .then(setBookings)
      .catch((e: unknown) => showToast(e instanceof Error ? e.message : "Failed to load bookings", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Fetch the live refund quote whenever the cancel dialog opens
  useEffect(() => {
    if (!cancelId) return;
    let cancelled = false;
    bookingsApi.refundQuote(cancelId)
      .then(q => { if (!cancelled) setQuote(q); })
      .catch((e: unknown) => { if (!cancelled) setQuoteError(e instanceof Error ? e.message : "Could not calculate refund"); });
    return () => { cancelled = true; };
  }, [cancelId]);

  const closeCancel = () => { setCancelId(null); setQuote(null); setQuoteError(""); setRefundTo("SOURCE"); };
  const cancelTarget = bookings.find(b => b._id === cancelId);
  // Wallet-only bookings always refund to the wallet; there's no card to send it back to
  const canChooseRefund = !!quote?.refundAmount && cancelTarget?.status === "SUCCESSFUL" && cancelTarget.paidWith !== "WALLET";

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      const res = await bookingsApi.cancel(cancelId, "Cancelled by user", canChooseRefund ? refundTo : "SOURCE");
      showToast(res.refundAmount
        ? res.refundMethod === "WALLET"
          ? `Booking cancelled — ₹${res.refundAmount} added to your wallet`
          : `Booking cancelled — ₹${res.refundAmount} refund ${res.refundStatus === "FAILED" ? "needs attention, our team will follow up" : "is on its way"}`
        : "Booking cancelled");
      fetchBookings();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to cancel booking", "error");
    } finally {
      setCancelling(false);
      closeCancel();
    }
  };

  const filtered = filter === "ALL"
    ? bookings
    : bookings.filter(b => b.status === filter);

  // Stats
  const confirmed  = bookings.filter(b => b.status === "SUCCESSFUL").length;
  const totalSpent = bookings
    .filter(b => b.status === "SUCCESSFUL")
    .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      <div className="mbp-container container">

        {/* Header */}
        <div className="mbp-header">
          <div>
            <p className="mbp-eyebrow">Your History</p>
            <h1 className="mbp-title">MY BOOKINGS</h1>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/movies")}>
            + Book New
          </button>
        </div>

        {/* Stats */}
        {!loading && bookings.length > 0 && (
          <div className="mbp-stats">
            <div className="mbp-stat">
              <p className="mbp-stat-val">{bookings.length}</p>
              <p className="mbp-stat-label">Total Bookings</p>
            </div>
            <div className="mbp-stat">
              <p className="mbp-stat-val">{confirmed}</p>
              <p className="mbp-stat-label">Confirmed</p>
            </div>
            <div className="mbp-stat">
              <p className="mbp-stat-val">₹{totalSpent.toLocaleString()}</p>
              <p className="mbp-stat-label">Total Spent</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mbp-filters">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`mbp-filter-chip ${filter === f.value ? "active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value !== "ALL" && (
                <span className="mbp-filter-count">
                  {bookings.filter(b => b.status === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎟</div>
            <p className="empty-state-title">
              {filter === "ALL" ? "No Bookings Yet" : `No ${filter.toLowerCase()} bookings`}
            </p>
            <p className="empty-state-sub">
              {filter === "ALL" ? "Book your first movie experience!" : "Try a different filter"}
            </p>
            {filter === "ALL" && (
              <button className="btn btn-primary" style={{ marginTop: 20 }}
                onClick={() => navigate("/movies")}>
                Browse Movies
              </button>
            )}
          </div>
        ) : (
          <div className="mbp-list">
            {filtered.map(b => (
              <BookingCard
                key={b._id}
                booking={b}
                onView={id => navigate(`/ticket/${id}`, { state: { booking: b } })}
                onCancel={id => setCancelId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal — shows the exact refund before confirming */}
      {cancelId && (
        <Modal
          title="CANCEL BOOKING"
          onClose={closeCancel}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeCancel}>
                Keep Booking
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={cancelling || !quote?.cancellable}
              >
                {cancelling ? "Cancelling…" : quote?.refundAmount ? `Cancel & refund ₹${quote.refundAmount}` : "Yes, Cancel"}
              </button>
            </>
          }
        >
          {!quote && !quoteError && <div className="mbp-quote-loading"><span className="spinner" style={{ width: 26, height: 26, borderWidth: 2 }} /></div>}
          {quoteError && <p className="mbp-quote-error">{quoteError}</p>}
          {quote && (
            <div className="mbp-quote">
              {quote.cancellable ? (
                <div className={`mbp-quote-hero ${quote.refundPct === 100 ? "is-full" : quote.refundPct > 0 ? "is-partial" : ""}`}>
                  <span className="mbp-quote-label">You'll get back</span>
                  <span className="mbp-quote-amount">₹{quote.refundAmount.toLocaleString("en-IN")}</span>
                  <span className="mbp-quote-reason">
                    {quote.reason}{(quote.feeRetained ?? 0) > 0 && ` · ₹${quote.feeRetained} booking fee is non-refundable`}
                  </span>
                </div>
              ) : (
                <div className="mbp-quote-hero is-closed">
                  <span className="mbp-quote-label">Cancellation closed</span>
                  <span className="mbp-quote-reason">{quote.reason}</span>
                </div>
              )}
              {quote.cancellable && canChooseRefund && (
                <fieldset className="mbp-refund-to">
                  <legend>Refund to</legend>
                  <label className={refundTo === "WALLET" ? "active" : ""}>
                    <input type="radio" name="refundTo" checked={refundTo === "WALLET"} onChange={() => setRefundTo("WALLET")} />
                    <span><b>Cineverse wallet</b><small>Instant · use it on your next booking</small></span>
                  </label>
                  <label className={refundTo === "SOURCE" ? "active" : ""}>
                    <input type="radio" name="refundTo" checked={refundTo === "SOURCE"} onChange={() => setRefundTo("SOURCE")} />
                    <span><b>Original payment method</b><small>5–7 business days{(cancelTarget?.walletApplied ?? 0) > 0 ? " · wallet part returns instantly" : ""}</small></span>
                  </label>
                </fieldset>
              )}
              <ul className="mbp-policy">
                <li><b>100%</b> refund up to {quote.policy?.fullRefundHours ?? 24} hours before the show</li>
                <li><b>{quote.policy?.partialRefundPct ?? 50}%</b> refund until {quote.policy?.cancelCutoffHours ?? 2} hours before (Prime members: 100%)</li>
                <li>No cancellations within {quote.policy?.cancelCutoffHours ?? 2} hours of showtime</li>
                <li>The booking fee is non-refundable (Prime members don't pay one)</li>
              </ul>
              {quote.refundAmount > 0 && !canChooseRefund && cancelTarget?.paidWith === "WALLET" && (
                <p className="mbp-quote-note">This booking was paid from your wallet, so the refund goes straight back there.</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}