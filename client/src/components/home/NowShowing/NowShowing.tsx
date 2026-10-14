import { useRef } from "react";
import { motion }   from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Movie } from "../../../types/movie.types.ts";
import { SectionHeader } from "../../common";
import { useWatchlist } from "../../../hooks/useWatchlist.ts";
import "./NowShowing.css";

interface Props {
  movies:   Movie[];
  loading?: boolean;
}

export default function NowShowing({ movies, loading }: Props) {
  const watchlist = useWatchlist();
  const navigate  = useNavigate();
  const rowRef    = useRef<HTMLDivElement>(null);

  const toggleWish = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    watchlist.toggle(id);
  };

  const scrollBy = (dir: 1 | -1) =>
    rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.8, behavior: "smooth" });

  if (loading) return (
    <section className="home-section">
      <SectionHeader eyebrow="In Theatres Now" title="NOW SHOWING" cta="View All" ctaHref="/movies" />
      <div className="movies-grid">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="movie-card skeleton" />
        ))}
      </div>
    </section>
  );

  if (!movies.length) return null;

  return (
    <section className="home-section">
      <SectionHeader eyebrow="In Theatres Now" title="NOW SHOWING" cta="View All" ctaHref="/movies" />

      <div className="movies-row-wrap">
        <button className="row-arrow row-arrow--left" onClick={() => scrollBy(-1)} aria-label="Scroll left">‹</button>
        <div className="movies-grid" ref={rowRef}>
          {movies.map((mv, i) => (
            <motion.div key={mv._id} className="movie-card theme-dark"
              role="link" tabIndex={0}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              onClick={() => navigate(`/movies/${mv._id}`)}
              onKeyDown={e => { if (e.key === "Enter") navigate(`/movies/${mv._id}`); }}>

              <div className="movie-poster">
                <img src={mv.posterUrl} alt={mv.name} loading="lazy" />
                <div className="movie-poster-grad" />
                {mv.certificate && <span className="movie-badge">{mv.certificate}</span>}
                <button
                  className={`movie-wish-btn ${watchlist.has(mv._id) ? "active" : ""}`}
                  aria-label={watchlist.has(mv._id) ? "Remove from watchlist" : "Add to watchlist"}
                  aria-pressed={watchlist.has(mv._id)}
                  onClick={e => toggleWish(mv._id, e)}>
                  {watchlist.has(mv._id) ? "♥" : "♡"}
                </button>
                <div className="movie-play-overlay">
                  <div className="movie-play-btn">▶</div>
                </div>
              </div>

              <div className="movie-info">
                <h3 className="movie-title">{mv.name}</h3>
                <p className="movie-genre">
                  {mv.genre?.slice(0, 2).join(" · ")} · {mv.duration}m
                </p>
                <div className="movie-row">
                  {mv.rating && mv.rating > 0
                    ? <span className="movie-rating">★ {mv.rating.toFixed(1)}<small>/10</small></span>
                    : <span className="movie-rating movie-rating--new">New</span>}
                  <span className="movie-lang">{mv.languages?.[0]}</span>
                </div>
                <button className="btn-book-sm"
                  onClick={e => { e.stopPropagation(); navigate(`/movies/${mv._id}`); }}>
                  Book Tickets
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        <button className="row-arrow row-arrow--right" onClick={() => scrollBy(1)} aria-label="Scroll right">›</button>
      </div>
    </section>
  );
}
