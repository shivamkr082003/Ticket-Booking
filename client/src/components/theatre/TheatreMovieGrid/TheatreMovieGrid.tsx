import type { Movie } from "../../../types/movie.types.ts";
import "./TheatreMovieGrid.css";

interface TheatreMovieGridProps {
  movies:  Movie[];
  onClick: (movieId: string) => void;
}

export default function TheatreMovieGrid({ movies, onClick }: TheatreMovieGridProps) {
  if (movies.length === 0) return null;

  return (
    <section className="tmg-section">
      <div className="container">
        <p className="tmg-label">Now Showing</p>
        <h2 className="tmg-title">MOVIES AT THIS THEATRE</h2>

        <div className="tmg-grid">
          {movies.map(m => (
            <div key={m._id} className="tmg-card" onClick={() => onClick(m._id)}>
              <div className="tmg-poster">
                {m.posterUrl
                  ? <img src={m.posterUrl} alt={m.name}
                      onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                  : <div className="tmg-fallback">🎬</div>
                }
                <div className="tmg-grad" />
                {m.rating != null && (
                  <div className="tmg-rating">
                    <span className="tmg-star">★</span>
                    <span>{m.rating.toFixed(1)}</span>
                  </div>
                )}
                {m.certificate && (
                  <span className="tmg-cert">{m.certificate}</span>
                )}
              </div>
              <div className="tmg-info">
                <p className="tmg-name">{m.name}</p>
                <p className="tmg-meta">
                  {m.genre?.slice(0, 2).join(", ")} · {m.duration}m
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}