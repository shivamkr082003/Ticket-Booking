import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Movie, Show, ShowFormat, Theatre } from "../../../types/movie.types.ts";
import { showsApi } from "../../../api/index.api.ts";
import { useAuth } from "../../../context/AuthContext.tsx";
import { isPrimeMember, primeDiscountFor } from "../../../utils/prime.ts";
import { useCity } from "../../../context/CityContext.tsx";
import { sameCity } from "../../../utils/city.ts";
import { SectionHeader } from "../../common";
import { SHOW_FORMATS, PREMIUM_FORMATS } from "../../../constants/movies.data.ts";
import { TAG_ICON } from "../../../constants/showTags.ts";
import "./ShowTimePicker.css";

const DAYS_AHEAD = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type PopulatedShow = Show & { movieId: Movie; theatreId: Theatre };

const isPopulated = (s: Show): s is PopulatedShow =>
  typeof s.movieId === "object" && s.movieId !== null &&
  typeof s.theatreId === "object" && s.theatreId !== null;

// Local calendar day — shows are grouped the way the viewer reads dates
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function dayLabel(d: Date) {
  const today = new Date();
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(new Date(today.getTime() + DAY_MS))) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

function occupancy(s: Show) {
  const taken = s.bookedSeats?.length ?? 0;
  const pct   = s.noOfSeats > 0 ? Math.round((taken / s.noOfSeats) * 100) : 100;
  const left  = Math.max(0, s.noOfSeats - taken);
  const level = left === 0 ? "full" : pct >= 75 ? "hot" : pct >= 50 ? "mid" : "open";
  const label = left === 0 ? "Sold out" : pct >= 75 ? `Filling fast · ${left} left` : pct >= 50 ? "Selling well" : "Available";
  return { pct, left, level, label };
}

export default function ShowtimePicker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prime    = isPrimeMember(user);
  const { city, setCity } = useCity();

  const [allShows,  setShows]     = useState<PopulatedShow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [failed,    setFailed]    = useState(false);
  const [movieId,   setMovieId]   = useState<string | null>(null);
  const [day,       setDay]       = useState<string | null>(null);
  const [format,    setFormat]    = useState<ShowFormat | "ALL">("ALL");
  const [selShowId, setSelShowId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const horizon = Date.now() + DAYS_AHEAD * DAY_MS;

    showsApi.getAll({ upcoming: "true" })
      .then(list => {
        if (cancelled) return;
        setShows(list.filter(isPopulated).filter(s =>
          new Date(s.showTime).getTime() < horizon &&
          s.movieId.isActive !== false &&
          s.theatreId.isActive !== false
        ));
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const shows = useMemo(
    () => (city ? allShows.filter(s => sameCity(s.theatreId.city, city)) : allShows),
    [allShows, city],
  );
  const cityHasNone = !!city && allShows.length > 0 && shows.length === 0;

  // Only movies that actually have upcoming shows — busiest first
  const movies = useMemo(() => {
    const byMovie = new Map<string, { movie: Movie; count: number }>();
    for (const s of shows) {
      const entry = byMovie.get(s.movieId._id);
      if (entry) entry.count += 1;
      else byMovie.set(s.movieId._id, { movie: s.movieId, count: 1 });
    }
    return [...byMovie.values()].sort((a, b) => b.count - a.count).map(e => e.movie).slice(0, 10);
  }, [shows]);

  const activeMovie = movies.find(m => m._id === movieId) ?? movies[0] ?? null;

  const movieShows = useMemo(
    () => (activeMovie ? shows.filter(s => s.movieId._id === activeMovie._id) : []),
    [shows, activeMovie],
  );

  const days = useMemo(() => {
    const byDay = new Map<string, Date>();
    for (const s of movieShows) {
      const d = new Date(s.showTime);
      if (!byDay.has(dayKey(d))) byDay.set(dayKey(d), d);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([key, date]) => ({ key, date }));
  }, [movieShows]);

  const activeDay = days.find(d => d.key === day) ?? days[0] ?? null;

  const dayShows = useMemo(
    () => (activeDay ? movieShows.filter(s => dayKey(new Date(s.showTime)) === activeDay.key) : []),
    [movieShows, activeDay],
  );

  const formatCounts = useMemo(() => {
    const counts = new Map<ShowFormat, number>();
    for (const s of dayShows) counts.set(s.format, (counts.get(s.format) ?? 0) + 1);
    return counts;
  }, [dayShows]);

  const activeFormat = format !== "ALL" && formatCounts.has(format) ? format : "ALL";
  const slots    = activeFormat === "ALL" ? dayShows : dayShows.filter(s => s.format === activeFormat);
  const selected = slots.find(s => s._id === selShowId) ?? null;

  const pickMovie  = (id: string)                => { setMovieId(id); setDay(null); setFormat("ALL"); setSelShowId(null); };
  const pickDay    = (key: string)               => { setDay(key); setSelShowId(null); };
  const pickFormat = (f: ShowFormat | "ALL")     => { setFormat(f); setSelShowId(null); };

  const eyebrow = `${city ? `${city} · ` : ""}Today · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`;

  return (
    <section className="home-section" id="showtimes">
      <SectionHeader
        eyebrow={eyebrow}
        title="PICK YOUR SHOWTIME"
        cta={activeMovie ? "All Showtimes" : undefined}
        ctaHref={activeMovie ? `/movies/${activeMovie._id}` : undefined}
      />

      {loading ? (
        <div className="stp-panel">
          <div className="stp-movies">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ width: 180, height: 56, borderRadius: 14 }} />)}
          </div>
          <div className="slots-row">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 150, borderRadius: 16 }} />)}
          </div>
        </div>
      ) : failed || movies.length === 0 ? (
        <div className="stp-panel stp-empty">
          <div className="empty-state-icon">🎞</div>
          <p className="empty-state-title">{failed ? "Showtimes Unavailable" : cityHasNone ? `No Shows in ${city} This Week` : "No Shows Scheduled Yet"}</p>
          <p className="empty-state-sub">
            {failed ? "We couldn't load showtimes right now. Please try again shortly."
              : cityHasNone ? "Cinemas in other cities have showtimes — switch to see them."
              : "New showtimes appear here as soon as theatres publish them."}
          </p>
          {cityHasNone ? (
            <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => setCity(null)}>Show all cities</button>
          ) : (
            <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => navigate("/theatres")}>
              Browse Theatres
            </button>
          )}
        </div>
      ) : (
        <div className="stp-panel">
          {/* Movie picker */}
          <div className="stp-movies" role="tablist" aria-label="Movie">
            {movies.map(m => (
              <button key={m._id} role="tab" aria-selected={activeMovie?._id === m._id}
                className={`stp-movie ${activeMovie?._id === m._id ? "active" : ""}`}
                onClick={() => pickMovie(m._id)}>
                <img src={m.posterUrl} alt="" loading="lazy" />
                <span className="stp-movie-text">
                  <span className="stp-movie-name">{m.name}</span>
                  <span className="stp-movie-meta">{m.certificate ?? "UA"} · {m.duration}m</span>
                </span>
              </button>
            ))}
          </div>

          {/* Format + date */}
          <div className="stp-toolbar">
            <div className="format-row" role="tablist" aria-label="Format">
              <button role="tab" aria-selected={activeFormat === "ALL"}
                className={`format-btn ${activeFormat === "ALL" ? "active" : ""}`}
                onClick={() => pickFormat("ALL")}>
                All <span className="format-count">{dayShows.length}</span>
              </button>
              {SHOW_FORMATS.map(f => {
                const n = formatCounts.get(f) ?? 0;
                return (
                  <button key={f} role="tab" aria-selected={activeFormat === f} disabled={n === 0}
                    className={`format-btn ${activeFormat === f ? "active" : ""} ${PREMIUM_FORMATS.has(f) ? "is-premium" : ""}`}
                    title={n === 0 ? `No ${f} shows on this day` : `${n} ${f} show${n > 1 ? "s" : ""}`}
                    onClick={() => pickFormat(f)}>
                    {f}{n > 0 && <span className="format-count">{n}</span>}
                  </button>
                );
              })}
            </div>

            <div className="date-row" role="tablist" aria-label="Date">
              {days.map(d => (
                <button key={d.key} role="tab" aria-selected={activeDay?.key === d.key}
                  className={`date-btn ${activeDay?.key === d.key ? "active" : ""}`}
                  onClick={() => pickDay(d.key)}>
                  <span className="date-btn-day">{dayLabel(d.date)}</span>
                  <span className="date-btn-num">{d.date.getDate()}</span>
                  <span className="date-btn-mon">{d.date.toLocaleDateString("en-IN", { month: "short" })}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="slots-row">
            {slots.map((s, i) => {
              const occ    = occupancy(s);
              const active = selected?._id === s._id;
              return (
                <motion.button key={s._id}
                  className={`slot ${active ? "active" : ""}`}
                  disabled={occ.left === 0}
                  aria-pressed={active}
                  onClick={() => setSelShowId(s._id)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35 }}>
                  <div className="slot-top">
                    <span className="slot-time">{timeLabel(s.showTime)}</span>
                    <span className={`format-chip ${PREMIUM_FORMATS.has(s.format) ? "format-chip--premium" : ""}`}>{s.format}</span>
                  </div>
                  <p className="slot-theatre">{s.theatreId.name}</p>
                  <p className="slot-sub">
                    {s.screen} · {s.language} · {s.theatreId.city}
                    {s.tags?.length ? <span className="slot-tags" title={s.tags.join(", ")}> {s.tags.map(t => TAG_ICON[t]).join(" ")}</span> : null}
                  </p>
                  <div className="slot-bar">
                    <div className={`slot-fill slot-fill--${occ.level}`} style={{ width: `${Math.max(occ.pct, 3)}%` }} />
                  </div>
                  <div className="slot-foot">
                    <span className={`slot-status slot-status--${occ.level}`}>{occ.label}</span>
                    <span className="slot-price">
                      {(s.seatLayout?.categories?.length ?? 0) > 1 && <small>from</small>}
                      {prime && <s>₹{s.price}</s>}
                      ₹{prime ? s.price - primeDiscountFor(s.price) : s.price}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Confirm banner */}
          <AnimatePresence>
            {selected && (
              <motion.div className="confirm-bar"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                <div className="confirm-info">
                  <img src={selected.movieId.posterUrl} alt="" className="confirm-poster" />
                  <div>
                    <p className="confirm-title">{selected.movieId.name}</p>
                    <p className="confirm-sub">
                      {selected.theatreId.name} · {dayLabel(new Date(selected.showTime))}, {timeLabel(selected.showTime)} · {selected.format}
                      {prime && <span className="confirm-prime"> · ✦ Prime price applied</span>}
                    </p>
                  </div>
                </div>
                <motion.button className="btn btn-primary"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/shows/${selected._id}/seats`)}>
                  Choose Seats →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
