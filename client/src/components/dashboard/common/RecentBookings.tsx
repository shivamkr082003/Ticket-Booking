import UserAvatar  from "./UserAvatar/UserAvatar.tsx";
import StatusBadge from "./StatusBadge/StatusBadge.tsx";
import { bookingAmount, inr, movieOf, showOf, theatreOf } from "../analytics.ts";
import type { Booking, User } from "../../../types/movie.types.ts";

const fmtDT = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

interface RecentBookingsProps {
  bookings:  Booking[];
  showUser?: boolean;
  limit?:    number;
}

export default function RecentBookings({ bookings, showUser = true, limit = 8 }: RecentBookingsProps) {
  const rows = bookings.slice(0, limit);
  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            {showUser && <th>Customer</th>}
            <th>Movie</th><th>Show</th><th>Seats</th><th className="num">Amount</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={showUser ? 6 : 5} className="dash-table-empty">No bookings yet</td></tr>
          )}
          {rows.map(b => {
            const show = showOf(b);
            const mv   = movieOf(show);
            const th   = theatreOf(show);
            const usr  = typeof b.userId === "object" ? b.userId as User : null;
            return (
              <tr key={b._id}>
                {showUser && (
                  <td>
                    <div className="cell-user">
                      <UserAvatar name={usr?.name ?? "?"} size="sm" />
                      <div>
                        <strong>{usr?.name ?? "—"}</strong>
                        {usr?.email && <small>{usr.email}</small>}
                      </div>
                    </div>
                  </td>
                )}
                <td>
                  <div className="cell-movie">
                    {mv?.posterUrl && <img src={mv.posterUrl} alt="" loading="lazy" />}
                    <div>
                      <strong>{mv?.name ?? "—"}</strong>
                      {th && <small>{th.name}</small>}
                    </div>
                  </div>
                </td>
                <td className="cell-muted">{show?.showTime ? fmtDT(show.showTime) : "—"}{show?.format && <small>{show.format}</small>}</td>
                <td><span className="cell-seats">{b.seats?.join(", ") ?? "—"}</span></td>
                <td className="num">
                  <strong>{inr(bookingAmount(b))}</strong>
                  {b.primeApplied && <small className="cell-prime">✦ Prime</small>}
                  {(b.refundAmount ?? 0) > 0 && <small className="cell-refund">↩ ₹{b.refundAmount} {b.refundStatus === "REFUNDED" ? "refunded" : b.refundStatus === "FAILED" ? "refund failed" : "refund pending"}</small>}
                </td>
                <td><StatusBadge status={b.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
