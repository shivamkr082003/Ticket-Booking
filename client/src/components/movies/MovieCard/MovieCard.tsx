import { useState } from "react";
import type { Movie } from "../../../types/movie.types.ts";
import "./MovieCard.css";

interface MovieCardProps {
  movie:   Movie;
  index:   number;
  onClick: () => void;
}

export default function MovieCard({ movie, index, onClick }: MovieCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const genre1 = Array.isArray(movie.genre) ? movie.genre[0] : (movie.genre ?? "");

  return (
    <div
      className="mc"
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={onClick}
    >
      <div className="mc-poster">
        {!imgErr && movie.posterUrl
          ? <img
              src={movie.posterUrl}
              alt={movie.name}
              className="mc-img"
              onError={() => setImgErr(true)}
            />
          : <div className="mc-fallback">🎬</div>
        }
        <div className="mc-grad" />

        {movie.certificate && (
          <span className="mc-cert">{movie.certificate}</span>
        )}

        <div className="mc-rating">
          <span className="mc-star">★</span>
          <span className="mc-rval">
            {movie.rating && movie.rating > 0 ? movie.rating.toFixed(1) : "—"}
          </span>
        </div>
      </div>

      <div className="mc-info">
        <h3 className="mc-title">{movie.name}</h3>
        <div className="mc-meta">
          {genre1   && <span className="mc-genre">{genre1}</span>}
          {movie.duration && <span className="mc-dur">{movie.duration}m</span>}
        </div>
      </div>
    </div>
  );
}