// import { useState, useEffect } from "react";
// import { moviesApi } from "../api/index.api";
// import type { Movie } from "../types/movie.types";

// interface UseMoviesResult {
//   movies:  Movie[];
//   loading: boolean;
//   error:   string | null;
// }

// export function useMovies(params: GetMoviesParams = {}): UseMoviesResult {
//   const [movies,  setMovies]  = useState<Movie[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error,   setError]   = useState<string | null>(null);

//   // Stringify params so effect re-runs only when they actually change
//   const key = JSON.stringify(params);

//   useEffect(() => {
//     let cancelled = false;
//     setLoading(true);
//     setError(null);

//     moviesApi.getAll(params)
//       .then(data => {
//         if (!cancelled) { setMovies(data); setLoading(false); }
//       })
//       .catch(err => {
//         if (!cancelled) { setError(err?.message ?? "Unknown error"); setLoading(false); }
//       });

//     return () => { cancelled = true; };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [key]);

//   return { movies, loading, error };
// }

import { useState, useEffect } from "react";
import { moviesApi } from "../api/index.api.ts";
import type { Movie } from "../types/movie.types.ts";

// Matches moviesApi.getAll params
interface GetMoviesParams {
  name?:          string;
  genre?:         string;
  languages?:     string;
  releaseStatus?: string;
  certificate?:   string;
  isActive?:      string;
  page?:          number;
  limit?:         number;
  sortBy?:        string;
  order?:         string;
}

interface UseMoviesResult {
  movies:  Movie[];
  loading: boolean;
  error:   string | null;
}

export function useMovies(params: GetMoviesParams = {}): UseMoviesResult {
  const [movies,  setMovies]  = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Stringify params so effect re-runs only when they actually change
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    moviesApi.getAll(params)
      .then(data => {
        if (!cancelled) {
          setMovies(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { movies, loading, error };
}