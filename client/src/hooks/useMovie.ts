import { useState, useEffect } from "react";
import { moviesApi } from "../api/index.api";
import type { Movie } from "../types/movie.types";

interface UseMovieResult {
  movie:   Movie | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useMovie(id: string | undefined): UseMovieResult {
  const [movie,   setMovie]   = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setTimeout(() => {
        if (!cancelled) {
          setError("No movie ID provided");
          setLoading(false);
        }
      }, 0);
      return;
    }

    setTimeout(() => {
    if (!cancelled) {
      setLoading(true);
      setError(null);
    }
  }, 0);

    moviesApi.getById(id)
      .then(data => {
        if (!cancelled) { setMovie(data); setLoading(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err?.message ?? "Unknown error"); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [id, tick]);

  return { movie, loading, error, refetch: () => setTick(t => t + 1) };
}