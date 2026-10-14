import type { Theatre, Movie, MovieRef } from "../../../../../types/movie.types.ts";

interface ClientTheatresTabProps {
  theatres:        Theatre[];
  movies:          Movie[];
  onAddTheatre:    () => void;
  onEditTheatre:   (t: Theatre) => void;
  onDeleteTheatre: (id: string, name: string) => void;
  onAddMovie:      (theatreId: string, theatreName: string) => void;
}

export default function ClientTheatresTab({
  theatres, movies, onAddTheatre, onEditTheatre, onDeleteTheatre, onAddMovie,
}: ClientTheatresTabProps) {
  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div>
          <h1 className="dash-page-title">My theatres</h1>
          <p className="dash-page-sub">{theatres.length} theatre{theatres.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={onAddTheatre}>+ Add Theatre</button>
      </div>

      {theatres.length === 0 ? (
        <div className="empty-state" style={{ padding: "48px 0" }}>
          <div className="empty-state-icon">🏛</div>
          <p className="empty-state-title">No Theatres Yet</p>
          <p className="empty-state-sub">Add your first theatre to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onAddTheatre}>+ Add Theatre</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {theatres.map(t => {
            const theatreMovies = movies.filter(m =>
              t.movies?.some((mv: MovieRef) => (typeof mv === "string" ? mv : mv._id) === m._id)
            );
            return (
              <div key={t._id} className="card" style={{ padding: 22 }}>
                <div style={{ display: "flex", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, marginBottom: 4 }}>{t.name}</h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>📍 {t.address}, {t.city} — {t.pincode}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <span className="badge badge-blue">{theatreMovies.length} movies</span>
                      <span className="badge badge-purple">{t.totalScreens ?? 1} screens</span>
                      <span className={`badge badge-${t.isActive !== false ? "green" : "red"}`}>
                        {t.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onAddMovie(t._id, t.name)}>+ Add Movie</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEditTheatre(t)}>✏ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDeleteTheatre(t._id, t.name)}>🗑</button>
                  </div>
                </div>
                {theatreMovies.length > 0 && (
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    {theatreMovies.map(m => (
                      <div key={m._id} style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(var(--fg-rgb),.04)", borderRadius: 8, padding: "6px 10px" }}>
                        {m.posterUrl && <img src={m.posterUrl} style={{ width: 26, height: 38, objectFit: "cover", borderRadius: 4 }} onError={e => ((e.target as HTMLImageElement).style.display = "none")} />}
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{m.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}