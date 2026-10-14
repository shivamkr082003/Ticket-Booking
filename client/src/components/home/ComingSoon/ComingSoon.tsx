import { motion }      from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Movie }  from "../../../types/movie.types.ts";
import { SectionHeader } from "../../common";
import { useWatchlist } from "../../../hooks/useWatchlist.ts";
import { showToast } from "../../common/Toast/toast.ts";
import "./ComingSoon.css";

interface Props {
  movies:  Movie[];
  loading?: boolean;
}

function releaseCountdown(dateStr?: string): string | null {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (days <= 0)  return "Releasing now";
  if (days === 1) return "Tomorrow";
  if (days < 60)  return `In ${days} days`;
  return null;
}

export default function ComingSoon({ movies, loading }: Props) {
  const navigate = useNavigate();
  const { notifying, toggleNotify } = useWatchlist();

  const bell = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const was = notifying(id);
    if (!toggleNotify(id)) { showToast("Sign in to get notified when bookings open", "info"); navigate("/login"); return; }
    showToast(was ? "Notification turned off" : "We'll notify you when bookings open");
  };

  if (loading) return (
    <section className="home-section" id="coming-soon">
      <SectionHeader eyebrow="On The Horizon" title="COMING SOON" cta="All Movies" ctaHref="/movies" />
      <div className="upcoming-row">
        {[1,2,3,4].map(i => (
          <div key={i} className="upcoming-card skeleton" style={{ height: 360 }} />
        ))}
      </div>
    </section>
  );

  if (!movies.length) return null;

  return (
    <section className="home-section" id="coming-soon">
      <SectionHeader eyebrow="On The Horizon" title="COMING SOON" cta="All Movies" ctaHref="/movies?sort=date" />
      <div className="upcoming-row">
        {movies.map((u, i) => {
          const countdown = releaseCountdown(u.releaseDate);
          return (
            <motion.div key={u._id} className="upcoming-card"
              role="link" tabIndex={0}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              onClick={() => navigate(`/movies/${u._id}`)}
              onKeyDown={e => { if (e.key === "Enter") navigate(`/movies/${u._id}`); }}>

              <div className="upcoming-img-wrap">
                <img src={u.posterUrl} alt={u.name} loading="lazy" />
                <div className="upcoming-overlay">
                  <span className="upcoming-badge">Coming Soon</span>
                  {countdown && <span className="upcoming-countdown">{countdown}</span>}
                </div>
                <button className={`upcoming-bell ${notifying(u._id) ? "is-on" : ""}`} onClick={e => bell(e, u._id)}
                  aria-pressed={notifying(u._id)} aria-label={notifying(u._id) ? `Stop notifications for ${u.name}` : `Notify me when ${u.name} bookings open`}
                  title={notifying(u._id) ? "You'll be notified" : "Notify me when bookings open"}>
                  🔔
                </button>
              </div>

              <div className="upcoming-info">
                <h4 className="upcoming-title">{u.name}</h4>
                <p className="upcoming-meta">
                  {u.genre?.slice(0, 2).join(" · ")}
                </p>
                {u.releaseDate && (
                  <p className="upcoming-date">
                    <span aria-hidden="true">📅</span>
                    {new Date(u.releaseDate).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
