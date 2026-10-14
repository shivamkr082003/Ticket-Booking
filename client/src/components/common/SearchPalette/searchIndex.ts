import { moviesApi, theatresApi } from "../../../api/index.api.ts";
import type { Movie, Theatre } from "../../../types/movie.types.ts";

export interface SearchIndex { movies: Movie[]; theatres: Theatre[] }

// Fetched once per page load, on first open — the catalogue is small enough to search client-side
let pending: Promise<SearchIndex> | null = null;

export function loadSearchIndex(): Promise<SearchIndex> {
  pending ??= Promise.all([
    moviesApi.getAll({ isActive: "true", limit: "100" }).catch(() => [] as Movie[]),
    theatresApi.getAll({ isActive: "true", limit: "100" }).catch(() => [] as Theatre[]),
  ]).then(([movies, theatres]) => ({ movies, theatres }));
  pending.then(idx => { if (!idx.movies.length && !idx.theatres.length) pending = null; });
  return pending;
}

const norm = (s?: string) => (s ?? "").toLowerCase();

// Prefix matches on the title rank above matches buried in cast or address
function score(q: string, primary: string, secondary: string[]): number {
  const p = norm(primary);
  if (p.startsWith(q)) return 3;
  if (p.split(/\s+/).some(w => w.startsWith(q))) return 2;
  if (p.includes(q)) return 1.5;
  return secondary.some(s => norm(s).includes(q)) ? 1 : 0;
}

export function searchMovies(movies: Movie[], query: string, limit = 6) {
  const q = norm(query.trim());
  return movies
    .map(m => ({ m, s: score(q, m.name, [m.director, ...(m.casts ?? []), ...(m.genre ?? []), ...(m.languages ?? [])]) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.m);
}

export function searchTheatres(theatres: Theatre[], query: string, limit = 5) {
  const q = norm(query.trim());
  return theatres
    .map(t => ({ t, s: score(q, t.name, [t.city, t.address, t.state ?? ""]) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.t);
}
