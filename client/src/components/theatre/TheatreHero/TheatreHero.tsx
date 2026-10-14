import type { Theatre } from "../../../types/movie.types.ts";
import { hasOwnPhotos, theatreCover } from "../../../utils/theatreImages.ts";
import "./TheatreHero.css";

interface TheatreHeroProps {
  theatre:        Theatre;
  moviesCount:    number;
  onBack:         () => void;
}

export default function TheatreHero({ theatre, moviesCount, onBack }: TheatreHeroProps) {
  const seats = (theatre.screens ?? []).reduce((a, s) => a + s.layout.rows.length * s.layout.cols, 0);
  const screens = theatre.screens?.length || theatre.totalScreens || 1;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${theatre.name}, ${theatre.address}, ${theatre.city}`)}`;

  return (
    <section className="th-hero theme-dark">
      <div className="th-cover" style={{ backgroundImage: `url(${theatreCover(theatre)})` }} />
      <div className="th-shade" />

      <div className="container th-content">
        <button className="btn btn-ghost btn-sm th-back" onClick={onBack}>
          ← All Theatres
        </button>

        <div className="th-info">
          <div className="th-kicker">
            <span className="th-badge">Cinema</span>
            {theatre.isActive !== false && <span className="th-open">● Booking open</span>}
          </div>

          <h1 className="th-title">{theatre.name}</h1>
          <p className="th-location">
            📍 {theatre.address}, {theatre.city}
            {theatre.state ? `, ${theatre.state}` : ""} — {theatre.pincode}
          </p>

          {theatre.description && (
            <p className="th-desc">{theatre.description}</p>
          )}

          <div className="th-stats">
            {(theatre.rating?.count ?? 0) > 0 && (
              <a href="#reviews" className="th-rating"><strong>★ {theatre.rating!.avg.toFixed(1)}</strong><span>{theatre.rating!.count} reviews</span></a>
            )}
            <div><strong>{moviesCount}</strong><span>Movies</span></div>
            <div><strong>{screens}</strong><span>Screens</span></div>
            {seats > 0 && <div><strong>{seats}</strong><span>Seats</span></div>}
            {theatre.amenities?.length > 0 && <div><strong>{theatre.amenities.length}</strong><span>Amenities</span></div>}
          </div>

          <div className="th-info-chips">
            {theatre.openingHours && <span className="th-chip">🕒 {theatre.openingHours}</span>}
            {theatre.phone && <a className="th-chip" href={`tel:${theatre.phone.replace(/\s/g, "")}`}>📞 {theatre.phone}</a>}
            <a className="th-chip th-chip--accent" target="_blank" rel="noreferrer" href={directions}>
              🧭 Get directions
            </a>
          </div>
        </div>
      </div>

      {!hasOwnPhotos(theatre) && <span className="th-repr">Image for representation only</span>}
    </section>
  );
}
