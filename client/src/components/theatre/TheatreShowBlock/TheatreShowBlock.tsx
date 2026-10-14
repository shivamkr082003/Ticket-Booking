import type { Movie, Show } from "../../../types/movie.types.ts";
import { priceLabel } from "../../../utils/seatLayout.ts";
import "./TheatreShowBlock.css";

interface TheatreShowBlockProps {
  movie:   Movie;
  shows:   Show[];
  onBook:  (showId: string) => void;
  onMovie: (movieId: string) => void;
}

export default function TheatreShowBlock({
  movie, shows, onBook, onMovie,
}: TheatreShowBlockProps) {
  const availableSeats = (s: Show) =>
    (s.noOfSeats ?? 0) - (s.bookedSeats?.length ?? 0);

  return (
    <div className="tsb-block">
      {/* Movie header */}
      <div className="tsb-header" onClick={() => onMovie(movie._id)}>
        {movie.posterUrl && (
          <img
            className="tsb-poster"
            src={movie.posterUrl}
            alt={movie.name}
            onError={e => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
        <div>
          <p className="tsb-name">{movie.name}</p>
          <p className="tsb-meta">
            {movie.genre?.join(", ")} · {movie.duration}m
            {movie.certificate ? ` · ${movie.certificate}` : ""}
          </p>
        </div>
        <span className="tsb-link">View Details →</span>
      </div>

      {/* Show slots */}
      <div className="tsb-slots">
        {shows.map(s => {
          const avail = availableSeats(s);
          const pct   = s.noOfSeats
            ? Math.round((s.bookedSeats?.length ?? 0) / s.noOfSeats * 100)
            : 0;
          const availCls = avail === 0 ? "full" : avail < 20 ? "low" : "avail";

          return (
            <button
              key={s._id}
              className="tsb-slot"
              disabled={avail === 0}
              onClick={() => onBook(s._id)}
            >
              <p className="tsb-time">
                {new Date(s.showTime).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <p className="tsb-format">{s.format} · {s.language}</p>
              <p className={`tsb-avail tsb-avail--${availCls}`}>
                {avail === 0 ? "Housefull" : `${avail} seats · ${priceLabel(s, true)}`}
              </p>
              {avail > 0 && (
                <div className="tsb-bar">
                  <div
                    className="tsb-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: pct > 75 ? "var(--red)" : "var(--text-accent)",
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}