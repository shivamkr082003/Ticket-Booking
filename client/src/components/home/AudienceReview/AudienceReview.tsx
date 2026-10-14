import { motion }      from "framer-motion";
import type { Review } from "../../../types/movie.types.ts";
import { SectionHeader } from "../../common/";
import "./AudienceReview.css";

interface Props {
  reviews:  Review[];
  loading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hrs   = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AudienceReviews({ reviews, loading }: Props) {
  if (loading) return (
    <section className="home-section">
      <SectionHeader eyebrow="What Audiences Say" title="AUDIENCE REVIEWS" cta="Browse Movies" ctaHref="/movies" />
      <div className="reviews-grid">
        {[1, 2, 3].map(i => (
          <div key={i} className="review-card skeleton" style={{ height: 180 }} />
        ))}
      </div>
    </section>
  );

  if (!reviews.length) return null;

  return (
    <section className="home-section">
      <SectionHeader eyebrow="What Audiences Say" title="AUDIENCE REVIEWS" cta="Browse Movies" ctaHref="/movies" />
      <div className="reviews-grid">
        {reviews.map((r, i) => {
          const user     = typeof r.userId === "object" ? r.userId as { _id: string; name: string } : null;
          const movie    = typeof r.movieId === "object" ? r.movieId as { _id: string; name: string } : null;
          const name     = user?.name ?? "Anonymous";
          const initials = getInitials(name);

          return (
            <motion.div key={r._id} className="review-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -5 }}>

              <div className="review-head">
                <div className="review-avatar">{initials}</div>
                <div>
                  <p className="review-name">{name}</p>
                  <p className="review-sub">
                    {movie?.name ? `on ${movie.name}` : "Cineverse"} · {timeAgo(r.createdAt)}
                  </p>
                </div>
              </div>

              <span className="review-stars">
                {"★".repeat(Math.round(r.rating / 2))}
                <span className="stars-dim">
                  {"★".repeat(5 - Math.round(r.rating / 2))}
                </span>
                <span className="review-score">{r.rating}/10</span>
              </span>

              <p className="review-text">"{r.comment}"</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}