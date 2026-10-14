import type { Show, Movie, Theatre } from "../../../../../types/movie.types.ts";

const fmtDT = (d: string) => new Date(d).toLocaleString("en-IN", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});

interface ShowsTabProps {
  shows:       Show[];
  movies:      Movie[];
  theatres:    Theatre[];
  onAddShow:   () => void;
  onEditShow:  (show: Show) => void;
  onDeleteShow:(id: string, label: string) => void;
}

export default function ShowsTab({
  shows, movies, theatres, onAddShow, onEditShow, onDeleteShow,
}: ShowsTabProps) {
  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div>
          <h1 className="dash-page-title">All shows</h1>
          <p className="dash-page-sub">{shows.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={onAddShow}>+ Create Show</button>
      </div>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr><th>Movie</th><th>Theatre</th><th>Screen</th><th>Date & Time</th><th>Format</th><th>Language</th><th>Price</th><th>Seats</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {shows.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No shows yet</td></tr>
            )}
            {shows.map(s => {
              const mv    = typeof s.movieId   === "object" ? s.movieId   as Movie   : movies.find(m => m._id === s.movieId);
              const th    = typeof s.theatreId === "object" ? s.theatreId as Theatre : theatres.find(t => t._id === s.theatreId);
              const avail = (s.noOfSeats ?? 0) - (s.bookedSeats?.length ?? 0);
              return (
                <tr key={s._id}>
                  <td><strong style={{ color: "var(--text-primary)" }}>{mv?.name ?? "—"}</strong></td>
                  <td style={{ fontSize: 12 }}>{th?.name ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{s.screen ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{fmtDT(s.showTime)}</td>
                  <td>
                    <span className={`badge badge-${s.format === "IMAX" ? "blue" : s.format === "4DX" ? "purple" : "orange"}`}>
                      {s.format}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{s.language ?? "—"}</td>
                  <td>₹{s.price}</td>
                  <td style={{ color: avail === 0 ? "var(--red)" : avail < 10 ? "var(--yellow)" : "var(--green)" }}>
                    {avail}/{s.noOfSeats}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => onEditShow(s)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDeleteShow(s._id, `${mv?.name ?? "Show"}`)}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}