import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppNavbar          from "../../../components/common/Navbar/Navbar.tsx";
import { PageSpinner }    from "../../../components/common/SharedUI/SharedUI.tsx";
import TheatreHero        from "../../../components/theatre/TheatreHero/TheatreHero.tsx";
import TheatreGallery     from "../../../components/theatre/TheatreGallery/TheatreGallery.tsx";
import TheatreDetails     from "../../../components/theatre/TheatreDetails/TheatreDetails.tsx";
import TheatreVisit       from "../../../components/theatre/TheatreVisit/TheatreVisit.tsx";
import TheatreReviews     from "../../../components/theatre/TheatreReviews/TheatreReviews.tsx";
import { hasOwnPhotos, theatreGallery } from "../../../utils/theatreImages.ts";
import TheatreMovieGrid   from "../../../components/theatre/TheatreMovieGrid/TheatreMovieGrid.tsx";
import TheatreShowBlock   from "../../../components/theatre/TheatreShowBlock/TheatreShowBlock.tsx";
import DatePicker         from "../../../components/common/DataPicker/DataPicker.tsx";
import { theatresApi, showsApi, moviesApi } from "../../../api/index.api.ts";
import type { Theatre, Show, Movie } from "../../../types/movie.types.ts";
import "./Theatredetailpage.css";

const generateDates = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });

export default function TheatreDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [theatre,  setTheatre]  = useState<Theatre | null>(null);
  const [shows,    setShows]    = useState<Show[]>([]);
  const [movies,   setMovies]   = useState<Movie[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selDate,  setSelDate]  = useState(0);

  const dates = generateDates();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [t, s, m] = await Promise.allSettled([
          theatresApi.getById(id),
          showsApi.getByTheatre(id),
          moviesApi.getAll(),
        ]);
        if (cancelled) return;
        if (t.status === "fulfilled") setTheatre(t.value);
        if (s.status === "fulfilled") setShows(s.value);
        if (m.status === "fulfilled") setMovies(m.value);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="page-wrapper"><AppNavbar /><PageSpinner /></div>;

  if (!theatre) return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-state-icon">🏛</div>
        <p className="empty-state-title">Theatre Not Found</p>
        <button className="btn btn-ghost" style={{ marginTop: 16 }}
          onClick={() => navigate("/theatres")}>← Back to Theatres</button>
      </div>
    </div>
  );

  // Movies available in this theatre
  const theatreMovieIds = (theatre.movies ?? []).map(m =>
    typeof m === "object" ? (m as Movie)._id : String(m)
  );
  const availableMovies = movies.filter(m =>
    theatreMovieIds.includes(String(m._id))
  );

  // Shows for selected date grouped by movie
  const selDay = dates[selDate];
  const todayShows = shows.filter(s =>
    new Date(s.showTime).toDateString() === selDay.toDateString()
  );
  const showsByMovie = availableMovies
    .map(m => ({
      movie: m,
      shows: todayShows.filter(s => {
        const mId = typeof s.movieId === "object" ? (s.movieId as Movie)._id : s.movieId;
        return String(mId) === String(m._id);
      }),
    }))
    .filter(g => g.shows.length > 0);

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      <TheatreHero
        theatre={theatre}
        moviesCount={availableMovies.length}
        onBack={() => navigate("/theatres")}
      />

      <TheatreGallery
        images={theatreGallery(theatre)}
        theatreName={theatre.name}
        representative={!hasOwnPhotos(theatre)}
      />

      <TheatreDetails theatre={theatre} shows={shows} />

      <TheatreVisit theatre={theatre} />

      <TheatreMovieGrid
        movies={availableMovies}
        onClick={movieId => navigate(`/movies/${movieId}`)}
      />

      {/* Shows section */}
      <section className="tdp-shows">
        <div className="container">
          <p className="tdp-label">Book Tickets</p>
          <h2 className="tdp-title">SELECT A SHOW</h2>

          <DatePicker dates={dates} selected={selDate} onChange={setSelDate} />

          {showsByMovie.length === 0 ? (
            <div className="empty-state" style={{ padding: "48px 0" }}>
              <div className="empty-state-icon">🎬</div>
              <p className="empty-state-title">No Shows Today</p>
              <p className="empty-state-sub">Try selecting a different date</p>
            </div>
          ) : (
            showsByMovie.map(({ movie, shows: mShows }) => (
              <TheatreShowBlock
                key={movie._id}
                movie={movie}
                shows={mShows}
                onBook={showId => navigate(`/shows/${showId}/seats`)}
                onMovie={movieId => navigate(`/movies/${movieId}`)}
              />
            ))
          )}
        </div>
      </section>

      <TheatreReviews theatreId={theatre._id}
        onRated={() => theatresApi.getById(theatre._id).then(setTheatre).catch(() => {})} />
    </div>
  );
}