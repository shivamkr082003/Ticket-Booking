import "./BookingCard.css";
import type { Movie, Theatre, Show, Booking } from "../../../types/movie.types.ts";

export type BookingStatus = "IN_PROCESS" | "SUCCESSFUL" | "CANCELLED" | "EXPIRED";

interface BookingCardProps {
  booking:  Booking;
  onView:   (id: string) => void;
  onCancel: (id: string) => void;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; cls: string }> = {
  SUCCESSFUL: { label: "Confirmed",  cls: "green"  },
  IN_PROCESS: { label: "Processing", cls: "yellow" },
  CANCELLED:  { label: "Cancelled",  cls: "red"    },
  EXPIRED:    { label: "Expired",    cls: "red"    },
};

// Mirrors the server policy: paid bookings stop being cancellable 2 hours before showtime
const CUTOFF_MS = 2 * 60 * 60 * 1000;
const beforeCancelCutoff = (showTime?: string) =>
  Boolean(showTime) && new Date(showTime!).getTime() - CUTOFF_MS > Date.now();

export default function BookingCard({ booking, onView, onCancel }: BookingCardProps) {
  const show    = typeof booking.showId === "object" ? booking.showId as Show : null;
  const movie   = show?.movieId && typeof show.movieId === "object" ? show.movieId as Movie : null;
  const theatre = show?.theatreId && typeof show.theatreId === "object" ? show.theatreId as Theatre : null;
  const status  = STATUS_CONFIG[booking.status] ?? { label: booking.status, cls: "yellow" };

  const showTime = show?.showTime
    ? new Date(show.showTime).toLocaleString("en-IN", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const canCancel = booking.status === "IN_PROCESS" || (booking.status === "SUCCESSFUL" && beforeCancelCutoff(show?.showTime));

  const refund = booking.status === "CANCELLED" && (booking.refundAmount ?? 0) > 0
    ? {
        amount: booking.refundAmount ?? 0,
        label:  booking.refundMethod === "WALLET" ? "Refunded to wallet" : booking.refundStatus === "REFUNDED" ? "Refunded" : booking.refundStatus === "FAILED" ? "Refund issue — support will contact you" : "Refund processing",
        cls:    booking.refundStatus === "REFUNDED" ? "ok" : booking.refundStatus === "FAILED" ? "bad" : "wait",
      }
    : null;

  return (
    <div className={`bkc bkc--${status.cls}`}>
      {/* Left — poster */}
      <div className="bkc-poster-wrap">
        {movie?.posterUrl
          ? <img src={movie.posterUrl} alt={movie.name} className="bkc-poster"
              onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
          : <div className="bkc-poster-fallback">🎬</div>
        }
      </div>

      {/* Center — info */}
      <div className="bkc-info">
        <div className="bkc-top">
          <h3 className="bkc-movie">{movie?.name ?? "—"}</h3>
          <span className={`badge badge-${status.cls}`}>{status.label}</span>
        </div>

        <p className="bkc-theatre">
          {theatre?.name ?? "—"}
          {theatre?.city ? ` · ${theatre.city}` : ""}
        </p>

        <div className="bkc-meta">
          <span>🕐 {showTime}</span>
          {show?.format   && <span className="bkc-sep" />}
          {show?.format   && <span>{show.format}</span>}
          {show?.language && <span className="bkc-sep" />}
          {show?.language && <span>{show.language}</span>}
        </div>

        <div className="bkc-seats">
          {(booking.lineItems?.length ? booking.lineItems : [{ category: "STANDARD", label: "", seats: booking.seats, price: 0 }]).map(l => (
            <span key={l.category} className="bkc-seat-group">
              {l.label && <span className="bkc-seat-cat">{l.label}</span>}
              {l.seats.map(s => <span key={s} className="bkc-seat-tag">{s}</span>)}
            </span>
          ))}
        </div>

        {refund && (
          <p className={`bkc-refund bkc-refund--${refund.cls}`}>
            ↩ ₹{refund.amount} · {refund.label}
          </p>
        )}

        {booking.ticketCode && (
          <p className="bkc-ticket-code">🎟 {booking.ticketCode}</p>
        )}
      </div>

      {/* Right — amount + actions */}
      <div className="bkc-right">
        <p className="bkc-amount">₹{booking.totalAmount}</p>
        <p className="bkc-date">
          {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          }) : "—"}
        </p>

        <div className="bkc-actions">
          {booking.status === "SUCCESSFUL" && (
            <button className="btn btn-primary btn-sm"
              onClick={() => onView(booking._id)}>
              View Ticket
            </button>
          )}
          {canCancel && (
            <button className="btn btn-ghost btn-sm bkc-cancel-btn"
              onClick={() => onCancel(booking._id)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}