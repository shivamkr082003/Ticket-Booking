import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppNavbar    from "../../../components/common/Navbar/Navbar.tsx";
import MovieFilters from "../../../components/movies/MovieFilters/MovieFilters.tsx";
import MovieGrid, { MovieGridSkeleton } from "../../../components/movies/MovieGrid/MovieGrid.tsx";
import { moviesApi, showsApi } from "../../../api/index.api.ts";
import type { Movie, Show, ShowFormat, Theatre } from "../../../types/movie.types.ts";
import { SHOW_FORMATS } from "../../../constants/movies.data.ts";
import { useCity } from "../../../context/CityContext.tsx";
import { sameCity } from "../../../utils/city.ts";
import "./MoviePage.css";

const todayKey = () => new Date().toDateString();

export default function MoviesPage() {
  const navigate = useNavigate();
  // Deep links (footer, home) can preset the filters: /movies?genre=Action&sort=date&q=nolan
  const [params] = useSearchParams();

  const [movies,  setMovies]  = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState(params.get("q") ?? "");
  const [genre,   setGenre]   = useState(params.get("genre") ?? "All");
  const [sortBy,  setSortBy]  = useState(params.get("sort") ?? "rating");
  const [lang,    setLang]    = useState(params.get("lang") ?? "");
  const [format,  setFormat]  = useState<ShowFormat | "">((params.get("format") as ShowFormat) ?? "");
  const [today,   setToday]   = useState(params.get("today") === "1");
  const [status,  setStatus]  = useState<"" | "RELEASED" | "COMING_SOON">("");
  const [shows,   setShows]   = useState<Show[]>([]);
  const { city } = useCity();

  // Upcoming shows tell us which formats each movie is playing in, and what's on today
  useEffect(() => {
    let cancelled = false;
    showsApi.getAll({ upcoming: "true" }).then(s => { if (!cancelled) setShows(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const playing = useMemo(() => {
    const t = todayKey();
    const map = new Map<string, { formats: Set<ShowFormat>; today: boolean }>();
    for (const s of shows) {
      const th = typeof s.theatreId === "object" ? (s.theatreId as Theatre) : null;
      if (city && th && !sameCity(th.city, city)) continue;
      const id = typeof s.movieId === "object" ? (s.movieId as Movie)._id : String(s.movieId);
      const e = map.get(id) ?? { formats: new Set<ShowFormat>(), today: false };
      e.formats.add(s.format);
      if (new Date(s.showTime).toDateString() === t) e.today = true;
      map.set(id, e);
    }
    return map;
  }, [shows, city]);

  const languages = useMemo(() => [...new Set(movies.flatMap(m => m.languages ?? []))].sort(), [movies]);

  useEffect(() => {
  const fetchMovies = async () => {
    try {
      const data = await moviesApi.getAll();
      setMovies(data);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to fetch movies");
      }
    } finally {
      setLoading(false);
    }
  };

  fetchMovies();
}, []);

  const filtered = useMemo(() => {
    let list = [...movies];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.genre?.join(" ").toLowerCase().includes(q) ||
        m.director?.toLowerCase().includes(q)
      );
    }
    if (genre !== "All")
      list = list.filter(m => m.genre?.some(g => g.toLowerCase() === genre.toLowerCase()));
    if (lang)   list = list.filter(m => m.languages?.includes(lang));
    if (status) list = list.filter(m => (m.releaseStatus ?? "RELEASED") === status);
    if (format) list = list.filter(m => playing.get(m._id)?.formats.has(format));
    if (today)  list = list.filter(m => playing.get(m._id)?.today);
    if (sortBy === "rating") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sortBy === "name")   list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "date")   list.sort((a, b) => new Date(b.releaseDate ?? 0).getTime() - new Date(a.releaseDate ?? 0).getTime());
    return list;
  }, [movies, search, genre, sortBy, lang, status, format, today, playing]);

  const activeExtras = [lang, format, status, today ? "today" : ""].filter(Boolean).length;
  const clearExtras = () => { setLang(""); setFormat(""); setStatus(""); setToday(false); };

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      <MovieFilters
        search={search}      onSearch={setSearch}
        genre={genre}        onGenre={setGenre}
        sortBy={sortBy}      onSort={setSortBy}
        resultCount={filtered.length}
        loading={loading}
        error={error}
      />

      <div className="container">
        <div className="mp-filters" role="group" aria-label="More filters">
          <button className={`mp-toggle ${today ? "active" : ""}`} aria-pressed={today} onClick={() => setToday(t => !t)}>
            ⚡ Available today{city ? ` in ${city}` : ""}
          </button>
          <select className="mp-select" value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Release status">
            <option value="">Now showing &amp; upcoming</option>
            <option value="RELEASED">Now showing</option>
            <option value="COMING_SOON">Coming soon</option>
          </select>
          <select className="mp-select" value={lang} onChange={e => setLang(e.target.value)} aria-label="Language">
            <option value="">All languages</option>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="mp-select" value={format} onChange={e => setFormat(e.target.value as ShowFormat | "")} aria-label="Format">
            <option value="">All formats</option>
            {SHOW_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {activeExtras > 0 && <button className="mp-clear" onClick={clearExtras}>Clear {activeExtras} filter{activeExtras > 1 ? "s" : ""}</button>}
        </div>

        {loading && <MovieGridSkeleton />}

        {!loading && error && (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <p className="empty-state-title">Could Not Load Movies</p>
            <p className="empty-state-sub">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎬</div>
            <p className="empty-state-title">No Movies Found</p>
            <p className="empty-state-sub">{today ? "Nothing matching is playing today — try another day or clear filters" : "Try a different search or genre"}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <MovieGrid
            movies={filtered}
            onMovieClick={id => navigate(`/movies/${id}`)}
          />
        )}
      </div>
    </div>
  );
}

