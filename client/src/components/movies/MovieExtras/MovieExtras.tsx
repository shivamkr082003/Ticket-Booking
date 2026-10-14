import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { moviesApi, reviewsApi } from "../../../api/index.api.ts";
import type { Movie } from "../../../types/movie.types.ts";
import "./MovieExtras.css";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
// Stable hue per person so avatars don't change colour between visits
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

interface Audience { avg: number; liked: number; count: number }

export default function MovieExtras({ movie }: { movie: Movie }) {
  const navigate = useNavigate();
  const [similar,  setSimilar]  = useState<Movie[]>([]);
  const [audience, setAudience] = useState<Audience | null>(null);

  useEffect(() => {
    let cancelled = false;
    moviesApi.similar(movie._id).then(s => { if (!cancelled) setSimilar(s); }).catch(() => {});
    reviewsApi.getByMovie(movie._id).then(r => {
      if (cancelled) return;
      const dist = r.ratingDistribution ?? [];
      const count = dist.reduce((a, d) => a + d.count, 0);
      if (!count) return;
      const avg = dist.reduce((a, d) => a + d._id * d.count, 0) / count;
      const liked = dist.filter(d => d._id >= 7).reduce((a, d) => a + d.count, 0) / count;
      setAudience({ avg, liked: Math.round(liked * 100), count });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [movie._id]);

  const crew = [
    ...(movie.director ? [{ name: movie.director, role: "Director" }] : []),
    ...(movie.casts ?? []).map(name => ({ name, role: "Cast" })),
  ];

  return (
    <section className="mx container">
      {(crew.length > 0 || audience) && (
        <div className="mx-top">
          {crew.length > 0 && (
            <div className="mx-block">
              <p className="sec-eyebrow">Cast &amp; Crew</p>
              <div className="mx-people">
                {crew.map(p => (
                  <Link key={`${p.role}-${p.name}`} to={`/movies?q=${encodeURIComponent(p.name)}`} className="mx-person" title={`More with ${p.name}`}>
                    <span className="mx-avatar" style={{ background: `linear-gradient(135deg, hsl(${hue(p.name)} 70% 55%), hsl(${(hue(p.name) + 40) % 360} 70% 40%))` }}>
                      {initials(p.name)}
                    </span>
                    <span className="mx-name">{p.name}</span>
                    <span className="mx-role">{p.role}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {audience && (
            <div className="mx-score">
              <p className="sec-eyebrow">Audience score</p>
              <div className="mx-score-row">
                <div className="mx-ring" style={{ ["--p" as string]: audience.liked }} aria-label={`${audience.liked}% liked it`}>
                  <span>{audience.liked}%</span>
                </div>
                <div>
                  <p className="mx-score-big">{audience.avg.toFixed(1)}<small>/10</small></p>
                  <p className="mx-score-sub">{audience.liked}% rated it 7+ · {audience.count.toLocaleString("en-IN")} {audience.count === 1 ? "rating" : "ratings"}</p>
                  <a href="#reviews" className="mx-link" onClick={e => { e.preventDefault(); document.querySelector(".rs-section")?.scrollIntoView({ behavior: "smooth" }); }}>Read reviews →</a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {similar.length > 0 && (
        <div className="mx-block">
          <p className="sec-eyebrow">You might also like</p>
          <div className="mx-similar">
            {similar.map(m => (
              <button key={m._id} className="mx-sim" onClick={() => { navigate(`/movies/${m._id}`); window.scrollTo({ top: 0 }); }}>
                <span className="mx-sim-poster"><img src={m.posterUrl} alt="" loading="lazy" />
                  {m.releaseStatus === "COMING_SOON" && <span className="mx-sim-soon">Soon</span>}
                </span>
                <span className="mx-sim-name">{m.name}</span>
                <span className="mx-sim-meta">{m.genre?.slice(0, 2).join(" · ")}{m.rating ? ` · ★ ${m.rating.toFixed(1)}` : ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
