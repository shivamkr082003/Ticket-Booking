import MovieCard from "../MovieCard/MovieCard.tsx";
import type { Movie } from "../../../types/movie.types.ts";
import "./MovieGrid.css";

interface MovieGridProps {
  movies:    Movie[];
  onMovieClick: (id: string) => void;
}

export function MovieGridSkeleton() {
  return (
    <div className="mg-grid">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="mg-skeleton">
          <div className="skeleton" style={{ paddingTop: "148%", width: "100%" }} />
          <div className="mg-skeleton-body">
            <div className="skeleton" style={{ height: 15, width: "75%", borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 11, width: "45%", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MovieGrid({ movies, onMovieClick }: MovieGridProps) {
  return (
    <div className="mg-grid">
      {movies.map((m, i) => (
        <MovieCard
          key={m._id}
          movie={m}
          index={i}
          onClick={() => onMovieClick(m._id)}
        />
      ))}
    </div>
  );
}