import { useState, useMemo } from "react";
import { bookingAmount } from "../../../analytics.ts";
import StatusBadge from "../../../common/StatusBadge/StatusBadge.tsx";
import type { Booking, Show, Movie, Theatre } from "../../../../../types/movie.types.ts";

const fmtDT = (d: string) => new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});

interface ClientBookingsTabProps {
  myBookings: Booking[];
}

export default function ClientBookingsTab({ myBookings }: ClientBookingsTabProps) {
  const [filter, setFilter] = useState({ movie: "", theatre: "", date: "" });

  const revenue = myBookings
    .filter(b => b.status === "SUCCESSFUL")
    .reduce((a, b) => a + bookingAmount(b), 0);

  const filtered = useMemo(() => myBookings.filter(b => {
    const show = b.showId as Show;
    const mv   = typeof show?.movieId   === "object" ? (show.movieId   as Movie).name   : "";
    const th   = typeof show?.theatreId === "object" ? (show.theatreId as Theatre).name : "";
    if (filter.movie   && !mv.toLowerCase().includes(filter.movie.toLowerCase()))   return false;
    if (filter.theatre && !th.toLowerCase().includes(filter.theatre.toLowerCase())) return false;
    if (filter.date && new Date(b.createdAt ?? "").toDateString() !== new Date(filter.date).toDateString()) return false;
    return true;
  }), [myBookings, filter]);

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div>
          <h1 className="dash-page-title">Bookings</h1>
          <p className="dash-page-sub">{myBookings.length} total · ₹{revenue.toLocaleString()} revenue</p>
        </div>
      </div>

      <div className="dash-filters">
        <input className="dash-filter-input" placeholder="🎬 Movie…"
          value={filter.movie} onChange={e => setFilter(p => ({ ...p, movie: e.target.value }))} />
        <input className="dash-filter-input" placeholder="🏛 Theatre…"
          value={filter.theatre} onChange={e => setFilter(p => ({ ...p, theatre: e.target.value }))} />
        <input className="dash-filter-input" type="date" 
          value={filter.date} onChange={e => setFilter(p => ({ ...p, date: e.target.value }))} />
        {(filter.movie || filter.theatre || filter.date) && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => setFilter({ movie: "", theatre: "", date: "" })}>Clear ✕</button>
        )}
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr><th>Movie</th><th>Show Time</th><th>Seats</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No bookings match</td></tr>
            )}
            {filtered.map(b => {
              const show = b.showId as Show;
              const mv   = typeof show?.movieId === "object" ? show.movieId as Movie : null;
              return (
                <tr key={b._id}>
                  <td><strong style={{ color: "var(--text-primary)" }}>{mv?.name ?? "—"}</strong></td>
                  <td style={{ fontSize: 12 }}>{show?.showTime ? fmtDT(show.showTime) : "—"}</td>
                  <td style={{ fontSize: 12 }}>{b.seats?.join(", ") ?? "—"}</td>
                  <td>₹{bookingAmount(b).toLocaleString("en-IN")}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}