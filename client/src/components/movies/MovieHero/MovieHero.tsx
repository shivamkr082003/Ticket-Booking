import { useState, type ReactNode } from "react";
import type { Movie } from "../../../types/movie.types.ts";
import "./MovieHero.css";

interface MovieHeroProps {
  movie:          Movie;
  onBookTickets:  () => void;
  onWatchTrailer: () => void;
  onBack:         () => void;
  /** Extra buttons in the CTA row (watchlist, notify me) */
  actions?:       ReactNode;
  /** No upcoming shows — hide "Book Tickets" */
  bookable?:      boolean;
}

export default function MovieHero({
  movie, onBookTickets, onWatchTrailer, onBack, actions, bookable = true,
}: MovieHeroProps) {
  const [imgErr, setImgErr] = useState(false);

  const genreStr = Array.isArray(movie.genre)     ? movie.genre.join(", ")     : (movie.genre ?? "");
  const langStr  = Array.isArray(movie.languages) ? movie.languages.join(", ") : "";
  const castStr  = Array.isArray(movie.casts)     ? movie.casts.join(", ")     : "";

  return (
    <div className="mh-hero theme-dark">
      {/* Blurred background */}
      <div className="mh-bg" style={{ backgroundImage: `url(${movie.posterUrl})` }} />
      <div className="mh-blur" />
      <div className="mh-grad" />

      <div className="container mh-inner">
        {/* Poster */}
        <div className="mh-poster-wrap">
          {!imgErr && movie.posterUrl ? (
            <img
              className="mh-poster"
              src={movie.posterUrl}
              alt={movie.name}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="mh-poster-fallback">🎬</div>
          )}
        </div>

        {/* Info */}
        <div className="mh-info">
          {/* Badges */}
          <div className="mh-badges">
            {genreStr && <span className="badge badge-orange">{genreStr}</span>}
            {movie.certificate && <span className="badge badge-yellow">{movie.certificate}</span>}
            {movie.releaseStatus && (
              <span className={`badge badge-${
                movie.releaseStatus === "RELEASED" ? "green" :
                movie.releaseStatus === "BANNED"   ? "red"   : "blue"
              }`}>
                {movie.releaseStatus.replace("_", " ")}
              </span>
            )}
          </div>

          <h1 className="mh-title">{movie.name}</h1>

          {/* Meta */}
          <div className="mh-meta-row">
            <div className="mh-rating">
              <span className="rating-star">★</span>
              <span className="rating-value">{movie.rating && movie.rating > 0 ? movie.rating.toFixed(1) : "—"}</span>
              <span className="rating-max">/10</span>
            </div>
            {movie.duration && (
              <><span className="mh-sep" /><span className="mh-meta">⏱ {movie.duration}m</span></>
            )}
            {movie.director && (
              <><span className="mh-sep" /><span className="mh-meta">🎥 {movie.director}</span></>
            )}
          </div>

          {langStr && (
            <p className="mh-langs">🌐 {langStr}</p>
          )}

          {movie.description && (
            <p className="mh-desc">{movie.description}</p>
          )}

          {castStr && (
            <p className="mh-cast">
              🎭 <strong>Cast:</strong> {castStr}
            </p>
          )}

          {/* CTAs */}
          <div className="mh-cta-row">
            {bookable && (
              <button className="btn btn-primary btn-lg" onClick={onBookTickets}>
                🎟 Book Tickets
              </button>
            )}
            {movie.trailerUrl && (
              <button className="btn btn-ghost btn-lg" onClick={onWatchTrailer}>
                ▶ Watch Trailer
              </button>
            )}
            {actions}
            <button className="btn btn-ghost btn-lg" onClick={onBack}>
              ← All Movies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}