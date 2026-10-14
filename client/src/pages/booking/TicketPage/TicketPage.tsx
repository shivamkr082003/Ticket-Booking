import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AppNavbar   from "../../../components/common/Navbar/Navbar.tsx";
import { PageSpinner } from "../../../components/common/SharedUI/SharedUI.tsx";
import TicketCard  from "../../../components/booking/TicketCard/TicketCard.tsx";
import { bookingsApi } from "../../../api/index.api.ts";
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "../../../utils/calendar.ts";
import { showToast } from "../../../components/common/Toast/toast.ts";
import { PLATFORM_POLICY } from "../../../constants/policy.ts";
import SplitBill from "../../../components/booking/SplitBill/SplitBill.tsx";
import type { Movie, Theatre, Show, Booking } from "../../../types/movie.types.ts";
import "./TicketPage.css";


const cancelBy = (showTime: string, hoursBefore: number) =>
  new Date(new Date(showTime).getTime() - hoursBefore * 3_600_000)
    .toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

export default function TicketPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate      = useNavigate();
  const location      = useLocation();

  const [booking,  setBooking]  = useState<Booking | null>(location.state?.booking ?? null);
  const [loading,  setLoading]  = useState(!location.state?.booking);
  const [splitting, setSplitting] = useState(false);

  useEffect(() => {
    if (booking || !bookingId) return;
    bookingsApi.getById(bookingId)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [bookingId,booking]);

  if (loading) return <div className="page-wrapper"><AppNavbar /><PageSpinner /></div>;

  if (!booking) return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-state-icon">🎟</div>
        <p className="empty-state-title">Ticket Not Found</p>
        <button className="btn btn-ghost" onClick={() => navigate("/my-bookings")}>← My Bookings</button>
      </div>
    </div>
  );

  const show    = booking.showId as Show;
  const movie   = typeof show?.movieId   === "object" ? show.movieId   as Movie   : null;
  const theatre = typeof show?.theatreId === "object" ? show.theatreId as Theatre : null;

  const ticketData = {
    ticketCode:  booking.ticketCode ?? "Ticket",
    movieName:   movie?.name        ?? "Movie",
    poster:      movie?.posterUrl,
    theatre:     theatre?.name      ?? "Theatre",
    city:        theatre?.city      ?? "",
    address:     theatre?.address   ?? "",
    showTime:    show?.showTime     ?? "",
    format:      show?.format       ?? "",
    language:    show?.language     ?? "",
    screen:      show?.screen       ?? "",
    seats:       booking.seats      ?? [],
    totalAmount: booking.totalAmount ?? 0,
    bookingId:   booking._id,
    addOns:         booking.addOns,
    couponCode:     booking.couponCode,
    couponDiscount: booking.couponDiscount,
    checkedInAt:    booking.checkedInAt,
  };

  const policy   = { ...PLATFORM_POLICY, ...(theatre?.cancellationPolicy ?? {}) };
  const upcoming = booking.status === "SUCCESSFUL" && !!show?.showTime && isFuture(show.showTime);
  const place    = [theatre?.name, theatre?.address, theatre?.city].filter(Boolean).join(", ");
  const when     = show?.showTime ? new Date(show.showTime).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
  const event: CalendarEvent | null = show?.showTime ? {
    title:    `🎬 ${ticketData.movieName} (${ticketData.format})`,
    start:    new Date(show.showTime),
    minutes:  (movie?.duration || 150) + 15,
    location: place,
    details:  `Seats ${ticketData.seats.join(", ")} · ${ticketData.screen}\nTicket ${ticketData.ticketCode}\n${window.location.origin}/ticket/${booking._id}`,
    uid:      booking._id,
  } : null;

  const share = async () => {
    const text = `🎬 ${ticketData.movieName} — ${when}\n📍 ${place}\n💺 Seats ${ticketData.seats.join(", ")}\nSee you there!`;
    if (navigator.share) {
      try { await navigator.share({ title: ticketData.movieName, text }); return; } catch { /* dismissed — fall through to WhatsApp */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      {splitting && (
        <SplitBill total={ticketData.totalAmount} seats={ticketData.seats} movie={ticketData.movieName}
          when={when} place={place} onClose={() => setSplitting(false)} />
      )}

      <div className="tp-container container">
        <TicketCard ticket={ticketData} />

        {show?.showTime && booking.status === "SUCCESSFUL" && (
          <p className="tp-policy">
            Free cancellation until <b>{cancelBy(show.showTime, policy.fullRefundHours)}</b> · {policy.partialRefundPct}% refund until <b>{cancelBy(show.showTime, policy.cancelCutoffHours)}</b> · from My Bookings
          </p>
        )}

        <div className="tp-actions">
          <button className="btn btn-primary" onClick={() => navigate("/my-bookings")}>
            🎟 My Bookings
          </button>
          <button className="btn btn-ghost" onClick={() => { showToast("Choose “Save as PDF” as the printer to download", "info"); window.print(); }}>
            ⬇ PDF / Print
          </button>
          {upcoming && event && (
            <>
              <a className="btn btn-ghost" href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                📅 Google Calendar
              </a>
              <button className="btn btn-ghost" onClick={() => downloadIcs(event)}>
                🗓 Apple / Outlook
              </button>
              <button className="btn btn-ghost tp-share" onClick={share}>
                💬 Share
              </button>
              {ticketData.seats.length > 1 && (
                <button className="btn btn-ghost" onClick={() => setSplitting(true)}>
                  👥 Split bill
                </button>
              )}
            </>
          )}
          <button className="btn btn-ghost" onClick={() => navigate("/movies")}>
            🎬 Book Another
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(`/help?booking=${booking._id}`)}>
            🆘 Report an issue
          </button>
        </div>
      </div>
    </div>
  );
}