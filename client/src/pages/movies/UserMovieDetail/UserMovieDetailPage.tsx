import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate }       from "react-router-dom";
import AppNavbar        from "../../../components/common/Navbar/Navbar.tsx";
import { PageSpinner }  from "../../../components/common/SharedUI/SharedUI.tsx";
import MovieHero        from "../../../components/movies/MovieHero/MovieHero.tsx";
import TheatreShowBlock from "../../../components/movies/TheatreShowBlock/TheatreShowBlock.tsx";
import TrailerModal     from "../../../components/movies/TrailerModal/TrailerModal.tsx";
import WatchActions     from "../../../components/movies/WatchActions/WatchActions.tsx";
import MovieExtras      from "../../../components/movies/MovieExtras/MovieExtras.tsx";
import DatePicker       from "../../../components/common/DataPicker/DataPicker.tsx";
import ShowFilters      from "../../../components/movies/ShowFilters/ShowFilters.tsx";
import ReviewSection    from "../../../components/movies/ReviewSection/ReviewSection.tsx";
import type { ShowFilterState } from "../../../components/movies/ShowFilters/ShowFilters.tsx";
import { moviesApi, showsApi, theatresApi } from "../../../api/index.api.ts";
import type { Movie, Show, Theatre }  from "../../../types/movie.types.ts";
import { useCity }  from "../../../context/CityContext.tsx";
import { sameCity } from "../../../utils/city.ts";
import "./UserMovieDetailPage.css";

const generateDates = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });

export default function UserMovieDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [movie,       setMovie]       = useState<Movie | null>(null);
  const [shows,       setShows]       = useState<Show[]>([]);
  const [theatres,    setTheatres]    = useState<Theatre[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selDate,     setSelDate]     = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [rawFilters,  setRawFilters]  = useState<ShowFilterState>({
    format: "", language: "", city: "",
  });
  const [cityTouched, setCityTouched] = useState(false);
  const { city: homeCity } = useCity();
  const setFilters = (next: ShowFilterState) => {
    if (next.city !== filters.city) setCityTouched(true);
    setRawFilters(next);
  };

  const dates   = generateDates();
  const selDay  = dates[selDate];

  // Derive filter options from available shows
  const availableFormats   = useMemo(() => [...new Set(shows.map(s => s.format).filter(Boolean))], [shows]);
  const availableLanguages = useMemo(() => [...new Set(shows.map(s => s.language).filter(Boolean))], [shows]);
  const availableCities    = useMemo(() => [...new Set(
    theatres
      .filter(t => shows.some(s => {
        const tId = typeof s.theatreId === "object" ? (s.theatreId as Theatre)._id : s.theatreId;
        return tId === t._id;
      }))
      .map(t => t.city)
      .filter(Boolean)
  )], [theatres, shows]);

  const hasUpcoming = shows.some(s => new Date(s.showTime).getTime() > Date.now());

  // Until the viewer picks a city here, default to their home city if this movie plays there
  const presetCity = !cityTouched && homeCity ? availableCities.find(c => sameCity(c, homeCity)) ?? "" : "";
  const filters = useMemo<ShowFilterState>(
    () => (cityTouched ? rawFilters : { ...rawFilters, city: presetCity }),
    [cityTouched, rawFilters, presetCity],
  );

  // Group shows by theatre for selected date + apply filters
  const showsByTheatre = useMemo(() => {
    return theatres
      .filter(t => !filters.city || t.city === filters.city)
      .map(t => ({
        theatre: t,
        shows: shows.filter(s => {
          const tId      = typeof s.theatreId === "object" ? (s.theatreId as Theatre)._id : s.theatreId;
          const showDate = new Date(s.showTime);
          if (tId !== t._id) return false;
          if (showDate.toDateString() !== selDay.toDateString()) return false;
          if (filters.format   && s.format   !== filters.format)   return false;
          if (filters.language && s.language !== filters.language)  return false;
          return true;
        }),
      }))
      .filter(g => g.shows.length > 0);
  }, [theatres, shows, selDay, filters]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [m, s, t] = await Promise.allSettled([
          moviesApi.getById(id),
          showsApi.getByMovie(id),
          theatresApi.getAll(),
        ]);
        if (cancelled) return;

        if (m.status === "fulfilled") {
          setMovie(m.value);
        } else {
          const all = await moviesApi.getAll();
          if (!cancelled) setMovie(all.find(mv => mv._id === id) ?? null);
        }
        if (s.status === "fulfilled") setShows(s.value);
        if (t.status === "fulfilled") setTheatres(t.value);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  // Update movie rating from ReviewSection
  const refreshMovieRating = (avgRating: number | null) => {
    setMovie(prev => prev ? { ...prev, rating: avgRating ?? prev.rating } : prev);
  };

  if (loading) return (
    <div className="page-wrapper"><AppNavbar /><PageSpinner /></div>
  );

  if (!movie) return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-state-icon">🎬</div>
        <p className="empty-state-title">Movie Not Found</p>
        <button className="btn btn-ghost" style={{ marginTop: 16 }}
          onClick={() => navigate("/movies")}>← Back to Movies</button>
      </div>
    </div>
  );

  // Shows for selected date


  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      {/* Hero */}
      <MovieHero
        movie={movie}
        onBookTickets={() =>
          document.getElementById("shows-section")?.scrollIntoView({ behavior: "smooth" })
        }
        onWatchTrailer={() => setShowTrailer(true)}
        onBack={() => navigate("/movies")}
        bookable={hasUpcoming}
        actions={<WatchActions movieId={movie._id} canNotify={!hasUpcoming} />}
      />

      {/* Shows section */}
      <div className="container umdp-shows" id="shows-section">
        <div className="sec-head">
          <div>
            <p className="sec-eyebrow">Select Your Show</p>
            <h2 className="sec-title">BOOK YOUR SEATS</h2>
          </div>
        </div>

        {!hasUpcoming ? (
          <div className="empty-state umdp-not-open">
            <div className="empty-state-icon">🔔</div>
            <p className="empty-state-title">Bookings haven't opened yet</p>
            <p className="empty-state-sub">
              {movie.releaseDate && new Date(movie.releaseDate).getTime() > Date.now()
                ? `Releasing ${new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}. `
                : ""}
              We'll tell you the moment the first show is scheduled.
            </p>
            <div className="umdp-not-open-actions"><WatchActions movieId={movie._id} canNotify size="sm" /></div>
          </div>
        ) : <>
        <DatePicker dates={dates} selected={selDate} onChange={setSelDate} />

        {/* Filters — only show if options exist */}
        {(availableFormats.length > 1 || availableLanguages.length > 1 || availableCities.length > 1) && (
          <ShowFilters
            filters={filters}
            onChange={setFilters}
            formats={availableFormats}
            languages={availableLanguages}
            cities={availableCities}
          />
        )}

        {showsByTheatre.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <div className="empty-state-icon">🏛</div>
            <p className="empty-state-title">No Shows Available</p>
            <p className="empty-state-sub">
              {filters.format || filters.language || filters.city
                ? "Try changing filters or selecting a different date"
                : "Try selecting a different date"
              }
            </p>
            {(filters.format || filters.language || filters.city) && (
              <button className="btn btn-ghost" style={{ marginTop: 16 }}
                onClick={() => setFilters({ format: "", language: "", city: "" })}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="umdp-theatre-list">
            {showsByTheatre.map(({ theatre, shows: tShows }) => (
              <TheatreShowBlock
                key={theatre._id}
                theatre={theatre}
                shows={tShows}
                onBook={showId => navigate(`/shows/${showId}/seats`)}
              />
            ))}
          </div>
        )}
        </>}
      </div>

      {/* Cast, audience score, similar movies */}
      <MovieExtras movie={movie} />

      {/* Reviews */}
      <div className="container">
        <ReviewSection movieId={id!} onRatingUpdate={refreshMovieRating} />
      </div>

      {/* Trailer Modal */}
      {showTrailer && movie.trailerUrl && (
        <TrailerModal
          trailerUrl={movie.trailerUrl}
          movieName={movie.name}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
}