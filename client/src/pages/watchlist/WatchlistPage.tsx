import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../../components/common/Navbar/Navbar.tsx";
import { PageSpinner } from "../../components/common/SharedUI/SharedUI.tsx";
import MovieCard from "../../components/movies/MovieCard/MovieCard.tsx";
import { meApi } from "../../api/index.api.ts";
import { useWatchlist } from "../../hooks/useWatchlist.ts";
import type { Movie } from "../../types/movie.types.ts";
import "./WatchlistPage.css";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { ids, toggle, notifying, toggleNotify } = useWatchlist();
  const [movies,  setMovies]  = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    meApi.watchlistMovies()
      .then(r => { if (!cancelled) setMovies(r.movies); })
      .catch(() => { if (!cancelled) setMovies([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Hearts removed elsewhere on the page disappear here too
  const visible = movies.filter(m => ids.includes(m._id));
  const soon    = visible.filter(m => m.releaseStatus === "COMING_SOON");
  const now     = visible.filter(m => m.releaseStatus !== "COMING_SOON");

  const section = (title: string, list: Movie[]) => list.length > 0 && (
    <section className="wl-section">
      <h2 className="wl-section-title">{title} <span>{list.length}</span></h2>
      <div className="wl-grid">
        {list.map((m, i) => (
          <div key={m._id} className="wl-item">
            <MovieCard movie={m} index={i} onClick={() => navigate(`/movies/${m._id}`)} />
            <div className="wl-item-actions">
              {m.releaseStatus === "COMING_SOON" && (
                <button className={`wl-chip ${notifying(m._id) ? "is-on" : ""}`} onClick={() => toggleNotify(m._id)}>
                  🔔 {notifying(m._id) ? "Notifying" : "Notify me"}
                </button>
              )}
              <button className="wl-chip wl-remove" onClick={() => toggle(m._id)} aria-label={`Remove ${m.name} from watchlist`}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />
      <div className="container wl-page">
        <p className="wl-eyebrow">Saved for later</p>
        <h1 className="wl-title">MY WATCHLIST</h1>
        <p className="wl-sub">Synced to your account. We'll notify you when bookings open for anything you've saved.</p>

        {loading ? <PageSpinner /> : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">♡</div>
            <p className="empty-state-title">Nothing saved yet</p>
            <p className="empty-state-sub">Tap the heart on any movie to keep track of it here.</p>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate("/movies")}>Browse movies</button>
          </div>
        ) : (
          <>
            {section("Now showing", now)}
            {section("Coming soon", soon)}
          </>
        )}
      </div>
    </div>
  );
}
