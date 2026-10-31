import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Movie }  from "../../../types/movie.types.ts";
import { useWatchlist } from "../../../hooks/useWatchlist.ts";
import "./HeroSection.css";

interface Props {
  movies:   Movie[];
  loading?: boolean;
}

const ACCENTS = ["#9b5cff", "#ec4899", "#22c55e", "#f5b83d", "#3b82f6", "#06b6d4"];

function toEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url + "?autoplay=1";
  const short = url.match(/youtu\.be\/([^?&]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}?autoplay=1`;
  const watch = url.match(/[?&]v=([^&]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}?autoplay=1`;
  return url;
}

// Always show 5 posters centered on active
function getWindowIndices(active: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i);
  return [-2, -1, 0, 1, 2].map(o => (active + o + total) % total);
}

export default function HeroSection({ movies, loading }: Props) {
  const [active,      setActive]      = useState(0);
  const [paused,      setPaused]      = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const watchlist = useWatchlist();
  const heroRef  = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll({ target: heroRef });
  const bgY      = useTransform(scrollYProgress, [0, 1],   ["0%", "20%"]);
  const heroFade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    if (paused || trailerOpen || !movies.length) return;
    const t = setInterval(() => setActive(p => (p + 1) % movies.length), 3000);
    return () => clearInterval(t);
  }, [paused, trailerOpen, movies.length]);

  useEffect(() => { setActive(0); }, [movies]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setTrailerOpen(false); setPaused(false); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const pickMovie = (i: number) => {
    setActive(i); setPaused(true);
    setTimeout(() => setPaused(false), 8000);
  };

  const openTrailer  = () => { setPaused(true);  setTrailerOpen(true);  };
  const closeTrailer = () => { setTrailerOpen(false); setPaused(false); };

  if (loading || !movies.length) return (
    <div className="hero theme-dark">
      <div className="hero-bg hero-bg--empty" />
      <div className="hero-overlay">
        <div className="hero-overlay-l" /><div className="hero-overlay-b" />
      </div>
      <div className="hero-content">
        <div className="hero-text">
          {loading ? (
            <>
              <div className="skeleton" style={{ width: 220, height: 18, marginBottom: 24 }} />
              <div className="skeleton" style={{ width: "min(520px, 80vw)", height: 84, marginBottom: 20 }} />
              <div className="skeleton" style={{ width: "min(420px, 70vw)", height: 16, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: "min(360px, 60vw)", height: 16 }} />
            </>
          ) : (
            <>
              <p className="hero-genre" style={{ marginBottom: 18 }}>Welcome to Cineverse</p>
              <h1 className="hero-title">THE BIG SCREEN<br />STARTS HERE</h1>
              <p className="hero-desc">New releases are being scheduled — check back soon or explore every theatre near you.</p>
              <div className="hero-btns">
                <button className="btn btn-primary btn-lg" onClick={() => navigate("/theatres")}>Explore Theatres</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const m           = movies[active];
  const accentColor = ACCENTS[active % ACCENTS.length];
  const bgImage     = m.bannerUrl || m.posterUrl;
  const dur         = `${Math.floor(m.duration / 60)}h ${m.duration % 60}m`;
  const year        = new Date(m.releaseDate).getFullYear();
  const embedUrl    = m.trailerUrl ? toEmbedUrl(m.trailerUrl) : "";
  const windowIdx   = getWindowIndices(active, movies.length);

  return (
    <>
      <div ref={heroRef} className="hero theme-dark">

        {/* BG */}
        <AnimatePresence mode="wait">
          <motion.div key={`bg-${active}`} className="hero-bg"
            style={{ backgroundImage: `url(${bgImage})`, y: bgY }}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1,  scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
        </AnimatePresence>

        <motion.div className="hero-overlay" style={{ opacity: heroFade }}>
          <div className="hero-overlay-l" /><div className="hero-overlay-b" />
        </motion.div>
        <div className="hero-grid" />

        {/* Content */}
        <div className="hero-content">
          <div className="hero-text">

            <AnimatePresence mode="wait">
              <motion.div key={`badge-${active}`} className="hero-badge-row"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <span className="hero-badge" style={{ background: accentColor }}>NOW SHOWING</span>
                <span className="hero-genre">{m.genre?.slice(0, 2).join(" · ")} · {year}</span>
                <span className="hero-live">
                  <span className="hero-live-dot anim-pdot" />
                  <span className="hero-live-text">LIVE BOOKING</span>
                </span>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.h1 key={`title-${active}`} className="hero-title"
                style={{ textShadow: `0 0 120px ${accentColor}22` }}
                initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
                {m.name}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div key={`meta-${active}`}
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
                <div className="hero-meta">
                  {m.rating && m.rating > 0 && <>
                    <span className="stars-amber">{"★".repeat(Math.round(m.rating / 2))}</span>
                    <strong style={{ color: "#fbbf24", fontSize: 15 }}>{m.rating}/10</strong>
                  </>}
                  {[`⏱ ${dur}`, `🎫 ${m.certificate ?? "UA"}`].map((t, i) => (
                    <span key={i} className="hero-meta-item-wrap">
                      <span className="hero-sep" /><span className="hero-meta-item">{t}</span>
                    </span>
                  ))}
                </div>
                <p className="hero-desc">"{m.description?.slice(0, 120)}…"</p>
                <div className="hero-cast">
                  {m.casts?.slice(0, 3).map(c => (
                    <span key={c} className="hero-cast-tag">{c}</span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <motion.div className="hero-btns"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}>
              <motion.button className="btn btn-primary btn-lg"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 12px 40px ${accentColor}66`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "")}
                onClick={() => navigate(`/movies/${m._id}`)}>
                🎟 Book Tickets
              </motion.button>
              {embedUrl && (
                <motion.button className="btn btn-ghost btn-lg hero-glass-btn"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={openTrailer}>
                  ▶ Trailer
                </motion.button>
              )}
              <motion.button
                className={`btn-icon hero-wish ${watchlist.has(m._id) ? "wish-active" : "wish-inactive"}`}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                aria-label={watchlist.has(m._id) ? "Remove from watchlist" : "Add to watchlist"}
                aria-pressed={watchlist.has(m._id)}
                onClick={() => watchlist.toggle(m._id)}>
                {watchlist.has(m._id) ? "♥" : "♡"}
              </motion.button>
            </motion.div>
          </div>
        </div>

        {/* ── Poster strip — no AnimatePresence, just animate in-place ── */}
        <div className="poster-strip">
          {windowIdx.map((movieIdx, slotIdx) => {
            const mv       = movies[movieIdx];
            const isActive = movieIdx === active;
            // slot 0,1 = top items; slot 2 = active center; slot 3,4 = bottom
            const distFromCenter = Math.abs(slotIdx - 2); // 0,1,2
            return (
              <motion.div
                key={movieIdx}            // stable key = movieIdx, no remount on active change
                className="poster-thumb"
                onClick={() => pickMovie(movieIdx)}
                animate={{
                  opacity:  isActive ? 1 : Math.max(0.3, 1 - distFromCenter * 0.3),
                  width:    isActive ? 82 : 62,
                  height:   isActive ? 118 : 88,
                  x:        isActive ? -10 : 0,
                  scale:    1,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                whileHover={{ scale: 1.06, x: isActive ? -14 : -6 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  border:    `2px solid ${isActive
                    ? ACCENTS[movieIdx % ACCENTS.length]
                    : "rgba(255,255,255,0.07)"}`,
                  boxShadow: isActive
                    ? `0 0 28px ${ACCENTS[movieIdx % ACCENTS.length]}55, 0 12px 36px rgba(0,0,0,0.7)`
                    : "0 4px 20px rgba(0,0,0,0.6)",
                }}>
                <img src={mv.posterUrl} alt={mv.name} />
              </motion.div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="progress-dots">
          {movies.map((_, i) => (
            <motion.div key={i} className="progress-dot"
              onClick={() => pickMovie(i)}
              animate={{
                width:           i === active ? 34 : 8,
                backgroundColor: i === active
                  ? ACCENTS[i % ACCENTS.length]
                  : "rgba(255,255,255,0.18)",
              }}
              transition={{ duration: 0.3 }}>
              {i === active && !paused && !trailerOpen && (
                <motion.div className="progress-fill" key={`fill-${active}`}
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={{ duration: 3, ease: "linear" }} />
              )}
            </motion.div>
          ))}
        </div>

        <motion.div className="scroll-hint"
          animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 2.2 }}>
          <span>Scroll</span>
          <div className="scroll-hint-line" />
        </motion.div>
      </div>

      {/* Trailer Modal */}
      <AnimatePresence>
        {trailerOpen && embedUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeTrailer}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,.9)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px",
            }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: "min(900px, 90vw)", aspectRatio: "16/9", position: "relative" }}>
              <button onClick={closeTrailer} aria-label="Close trailer" style={{
                position: "absolute", top: -44, right: 0,
                background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 8, color: "#fff", fontSize: 20,
                width: 36, height: 36, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
              <iframe src={embedUrl} title={`${m.name} Trailer`}
                style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}