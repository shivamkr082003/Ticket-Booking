import { motion }       from "framer-motion";
import { useNavigate }  from "react-router-dom";
import type { Theatre } from "../../../types/movie.types.ts";
import { SectionHeader } from "../../common";
import { PREMIUM_FORMATS } from "../../../constants/movies.data.ts";
import { amenityInfo } from "../../../constants/amenities.ts";
import { theatreCover } from "../../../utils/theatreImages.ts";
import { useCity } from "../../../context/CityContext.tsx";
import "./CinemaNearby.css";

interface Props {
  cinemas:  Theatre[];
  loading?: boolean;
}

export default function CinemasNearby({ cinemas, loading }: Props) {
  const navigate = useNavigate();
  const { city, setCity } = useCity();
  const eyebrow  = city ? `In ${city}` : "Around You";
  const href     = "/theatres";

  if (loading) return (
    <section className="home-section">
      <SectionHeader eyebrow={eyebrow} title="CINEMAS NEARBY" cta="See All" ctaHref={href} />
      <div className="cinemas-grid">
        {[1,2,3].map(i => (
          <div key={i} className="cinema-card skeleton" style={{ height: 220 }} />
        ))}
      </div>
    </section>
  );

  if (!cinemas.length) return city ? (
    <section className="home-section">
      <SectionHeader eyebrow={eyebrow} title="CINEMAS NEARBY" />
      <div className="empty-state">
        <div className="empty-state-icon">📍</div>
        <p className="empty-state-title">No cinemas in {city} yet</p>
        <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => setCity(null)}>Show all cities</button>
      </div>
    </section>
  ) : null;

  return (
    <section className="home-section">
      <SectionHeader eyebrow={eyebrow} title="CINEMAS NEARBY" cta="See All" ctaHref={href} />
      <div className="cinemas-grid">
        {cinemas.map((c, i) => {
          const formats = c.formats ?? [];
          return (
            <motion.div key={c._id} className="cinema-card"
              role="link" tabIndex={0}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              onClick={() => navigate(`/theatres/${c._id}`)}
              onKeyDown={e => { if (e.key === "Enter") navigate(`/theatres/${c._id}`); }}>

              <div className="cinema-cover">
                <img src={theatreCover(c)} alt="" loading="lazy" />
              </div>

              <div className="cinema-head">
                <div className="cinema-head-text">
                  <p className="cinema-name">{c.name}</p>
                  <p className="cinema-loc">📍 {c.city}{c.state ? `, ${c.state}` : ""}</p>
                </div>
                <div className="cinema-screens-box">
                  <p className="cinema-screens-num">{c.totalScreens ?? 1}</p>
                  <p className="cinema-screens-label">{(c.totalScreens ?? 1) === 1 ? "Screen" : "Screens"}</p>
                </div>
              </div>

              {formats.length > 0 ? (
                <div className="cinema-formats">
                  {formats.map(f => (
                    <span key={f} className={`format-chip ${PREMIUM_FORMATS.has(f) ? "format-chip--premium" : ""}`}>{f}</span>
                  ))}
                </div>
              ) : (
                <p className="cinema-no-shows">No upcoming shows scheduled</p>
              )}

              {c.amenities?.length > 0 && (
                <div className="cinema-tags">
                  {c.amenities.slice(0, 4).map((a: string) => (
                    <span key={a} className="cinema-tag"><span aria-hidden="true">{amenityInfo(a).icon}</span> {a}</span>
                  ))}
                  {c.amenities.length > 4 && <span className="cinema-tag">+{c.amenities.length - 4}</span>}
                </div>
              )}

              <div className="cinema-foot">
                <span className="cinema-address">{c.address}</span>
                <button className="btn-dir" onClick={e => { e.stopPropagation(); navigate(`/theatres/${c._id}`); }}>
                  Showtimes →
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
