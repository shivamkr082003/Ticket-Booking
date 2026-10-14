import type { Theatre } from "../../../types/movie.types.ts";
import { PREMIUM_FORMATS } from "../../../constants/movies.data.ts";
import { amenityInfo } from "../../../constants/amenities.ts";
import { theatreCover } from "../../../utils/theatreImages.ts";
import { formatKm } from "../../../utils/geo.ts";
import "./TheatreCard.css";

interface TheatreCardProps {
  theatre:   Theatre;
  /** km from the viewer, when known */
  distance?: number | null;
  isAdmin:   boolean;
  onClick:   () => void;
  onEdit?:   () => void;
  onDelete?: () => void;
}

export default function TheatreCard({
  theatre, isAdmin, onClick, onEdit, onDelete, distance,
}: TheatreCardProps) {
  return (
    <div className="tc-card card" onClick={onClick}>
      <div className="tc-cover">
        <img src={theatreCover(theatre)} alt="" loading="lazy" />
        <span className="tc-cover-city">📍 {distance != null ? `${formatKm(distance)} away` : theatre.city}</span>
        {(theatre.rating?.count ?? 0) > 0 && (
          <span className="tc-cover-rating" title={`${theatre.rating!.count} verified reviews`}>★ {theatre.rating!.avg.toFixed(1)}</span>
        )}
      </div>
      <div className="tc-body">
        <div className="tc-info">
          <h3 className="tc-name">{theatre.name}</h3>
          <p className="tc-city">📍 {theatre.city} — {theatre.pincode}</p>
          <p className="tc-address">{theatre.address}</p>
          {theatre.description && (
            <p className="tc-desc">{theatre.description}</p>
          )}
          <div className="tc-badges">
            <span className="badge badge-blue">
              {theatre.movies?.length ?? 0} movies
            </span>
            <span className={`badge badge-${theatre.isActive !== false ? "green" : "red"}`}>
              {theatre.isActive !== false ? "Active" : "Inactive"}
            </span>
            {theatre.totalScreens && (
              <span className="badge badge-purple">
                {theatre.totalScreens} screens
              </span>
            )}
          </div>
          {theatre.formats && theatre.formats.length > 0 && (
            <div className="tc-formats">
              {theatre.formats.map(f => (
                <span key={f} className={`format-chip ${PREMIUM_FORMATS.has(f) ? "format-chip--premium" : ""}`}>{f}</span>
              ))}
            </div>
          )}
          {theatre.amenities?.length > 0 && (
            <div className="tc-amenities">
              {theatre.amenities.slice(0, 3).map(a => (
                <span key={a} className="tc-amenity"><span aria-hidden="true">{amenityInfo(a).icon}</span> {a}</span>
              ))}
              {theatre.amenities.length > 3 && (
                <span className="tc-amenity">+{theatre.amenities.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {isAdmin && (onEdit || onDelete) && (
        <div className="tc-actions" onClick={e => e.stopPropagation()}>
          {onEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
          )}
          {onDelete && (
            <button className="btn btn-ghost btn-sm tc-delete-btn" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}