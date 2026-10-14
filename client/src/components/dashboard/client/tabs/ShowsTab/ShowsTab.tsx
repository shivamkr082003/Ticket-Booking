import type { Show, Movie, Theatre } from "../../../../../types/movie.types.ts";

const fmtDT = (d: string) => new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});

interface ClientShowsTabProps {
  myShows:     Show[];
  movies:      Movie[];
  myTheatres:  Theatre[];
  onAddShow:   () => void;
  onEditShow:  (s: Show) => void;
  onDeleteShow:(id: string, label: string) => void;
}

export default function ClientShowsTab({
  myShows, movies, myTheatres, onAddShow, onEditShow, onDeleteShow,
}: ClientShowsTabProps) {
  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div>
          <h1 className="dash-page-title">My shows</h1>
          <p className="dash-page-sub">{myShows.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={onAddShow}>+ Create Show</button>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr><th>Movie</th><th>Theatre</th><th>Date & Time</th><th>Format</th><th>Price</th><th>Seats</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {myShows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No shows yet</td></tr>
            )}
            {myShows.map(s => {
              const mv    = typeof s.movieId   === "object" ? s.movieId   as Movie   : movies.find(m => m._id === s.movieId);
              const th    = typeof s.theatreId === "object" ? s.theatreId as Theatre : myTheatres.find(t => t._id === s.theatreId);
              const avail = (s.noOfSeats ?? 0) - (s.bookedSeats?.length ?? 0);
              const pct   = s.noOfSeats ? Math.round(((s.bookedSeats?.length ?? 0) / s.noOfSeats) * 100) : 0;
              return (
                <tr key={s._id}>
                  <td><strong style={{ color: "var(--text-primary)" }}>{mv?.name ?? "—"}</strong></td>
                  <td style={{ fontSize: 12 }}>{th?.name ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{fmtDT(s.showTime)}</td>
                  <td><span className={`badge badge-${s.format === "IMAX" ? "blue" : s.format === "4DX" ? "purple" : "orange"}`}>{s.format}</span></td>
                  <td>₹{s.price}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: "var(--border-dim)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct > 75 ? "var(--red)" : "var(--text-accent)" }} />
                      </div>
                      <span style={{ fontSize: 11, color: avail === 0 ? "var(--red)" : "var(--green)" }}>
                        {avail}/{s.noOfSeats}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => onEditShow(s)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDeleteShow(s._id, mv?.name ?? "Show")}>🗑</button>
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