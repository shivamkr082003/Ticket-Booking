import type { Movie } from "../../../../../types/movie.types.ts";
import { moviesApi } from "../../../../../api/index.api.ts";
import { showToast } from "../../../../common/Toast/toast.ts";

const fmt = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

interface MoviesTabProps {
  movies:       Movie[];
  onAddMovie:   () => void;
  onEditMovie:  (movie: Movie) => void;
  onDeleteMovie:(id: string, name: string) => void;
  onRefresh:    () => void;
}

export default function MoviesTab({
  movies, onAddMovie, onEditMovie, onDeleteMovie, onRefresh,
}: MoviesTabProps) {
  const handleToggleStatus = async (movie: Movie) => {
    try {
      await moviesApi.setStatus(movie._id, movie.isActive === false);
      showToast(`Movie ${movie.isActive === false ? "activated" : "hidden"}`);
      onRefresh();
    } catch (e: unknown) {
      if (e instanceof Error) {
        showToast(e.message, "error");
      } else {
        showToast("Something went wrong", "error");
      }
    }
  };

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div>
          <h1 className="dash-page-title">Movies</h1>
          <p className="dash-page-sub">{movies.length} in catalogue</p>
        </div>
        <button className="btn btn-primary" onClick={onAddMovie}>+ Add Movie</button>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr><th>Movie</th><th>Genre</th><th>Duration</th><th>Rating</th><th>Certificate</th><th>Release</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {movies.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No movies yet</td></tr>
            )}
            {movies.map(m => (
              <tr key={m._id}>
                <td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {m.posterUrl && (
                      <img src={m.posterUrl} alt={m.name}
                        style={{ width: 34, height: 50, objectFit: "cover", borderRadius: 5 }}
                        onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                    )}
                    <div>
                      <strong style={{ color: "var(--text-primary)" }}>{m.name}</strong>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{m.director}</p>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>{m.genre?.slice(0, 2).join(", ")}</td>
                <td>{m.duration}m</td>
                <td><span style={{ color: "var(--star)" }}>★ {m.rating?.toFixed(1) ?? "—"}</span></td>
                <td><span className="badge badge-orange">{m.certificate ?? "—"}</span></td>
                <td style={{ fontSize: 12 }}>{m.releaseDate ? fmt(m.releaseDate) : "—"}</td>
                <td><span className={`badge badge-${m.isActive !== false ? "green" : "red"}`}>{m.isActive !== false ? "Active" : "Hidden"}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => onEditMovie(m)}>✏</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleToggleStatus(m)}>
                      {m.isActive !== false ? "🚫" : "✅"}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDeleteMovie(m._id, m.name)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}