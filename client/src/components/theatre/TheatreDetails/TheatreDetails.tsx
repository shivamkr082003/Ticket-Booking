import type { Show, Theatre } from "../../../types/movie.types.ts";
import { groupAmenities } from "../../../constants/amenities.ts";
import { seatTotal } from "../../../utils/seatLayout.ts";
import { amenityPhoto, screenPhoto } from "../../../utils/theatreImages.ts";
import { amenityInfo } from "../../../constants/amenities.ts";
import "./TheatreDetails.css";

interface TheatreDetailsProps {
  theatre: Theatre;
  shows:   Show[];
}

const isUpcoming = (showTime: string) => new Date(showTime).getTime() > Date.now();

export default function TheatreDetails({ theatre, shows }: TheatreDetailsProps) {
  const groups  = groupAmenities(theatre.amenities ?? []);
  const screens = theatre.screens ?? [];
  // Owner photos first, then stock — at most two rows of tiles
  const photoAmenities = (theatre.amenities ?? [])
    .map(label => ({ label, photo: amenityPhoto(theatre, label) }))
    .filter((a): a is { label: string; photo: { src: string; stock: boolean } } => a.photo !== null)
    .sort((a, b) => Number(a.photo.stock) - Number(b.photo.stock))
    .slice(0, 8);
  if (!groups.length && !screens.length) return null;

  // Formats each screen is actually running (from upcoming shows)
  const formatsOn = (name: string) => [...new Set(shows
    .filter(s => s.screen.toLowerCase() === name.toLowerCase() && isUpcoming(s.showTime))
    .map(s => s.format))];

  return (
    <section className="tdt container">
      {screens.length > 0 && (
        <div className="tdt-block">
          <p className="tdt-label">Screens</p>
          <h2 className="tdt-title">{screens.length} AUDITORIUM{screens.length > 1 ? "S" : ""}</h2>
          <div className="tdt-screens">
            {screens.map(sc => {
              const formats = formatsOn(sc.name);
              return (
                <article key={sc.name} className="tdt-screen">
                  <div className="tdt-screen-photo">
                    <img src={screenPhoto(theatre._id, sc)} alt="" loading="lazy" />
                    {formats.length > 0 && <span className="tdt-screen-format">{formats.join(" · ")}</span>}
                  </div>
                  <header className="tdt-screen-head">
                    <h3>{sc.name}</h3>
                    <span>{seatTotal(sc.layout)} seats</span>
                  </header>
                  <dl className="tdt-specs">
                    {sc.sound      && <div><dt>Sound</dt><dd>🔊 {sc.sound}</dd></div>}
                    {sc.projection && <div><dt>Projection</dt><dd>📽 {sc.projection}</dd></div>}
                  </dl>
                  <div className="tdt-tiers">
                    {sc.layout.categories.map(c => (
                      <span key={c.key} className={`tdt-tier tdt-tier--${c.key.toLowerCase()}`}>
                        {c.label} <b>from ₹{c.price}</b>
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="tdt-block">
          <p className="tdt-label">Amenities</p>
          <h2 className="tdt-title">WHAT'S AT THIS CINEMA</h2>
          {photoAmenities.length > 0 && (
            <div className="tdt-feature-tiles">
              {photoAmenities.map(a => (
                <figure key={a.label} className="tdt-feature">
                  <img src={a.photo.src} alt={a.label} loading="lazy" />
                  {a.photo.stock && <span className="tdt-feature-stock">Representative</span>}
                  <figcaption><span aria-hidden="true">{amenityInfo(a.label).icon}</span>{a.label}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="tdt-amenities">
            {groups.map(g => (
              <div key={g.group} className="tdt-group">
                <p className="tdt-group-title">{g.group}</p>
                <ul>
                  {g.items.map(a => (
                    <li key={a.label}><span aria-hidden="true">{a.icon}</span>{a.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
