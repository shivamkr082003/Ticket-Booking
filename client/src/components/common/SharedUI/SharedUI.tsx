import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.tsx";
import type { Movie, Theatre, Show, Booking, BookingStatus, UserRole } from "../../../types/movie.types.ts";
import "./SharedUI.css";
import { setToastHandler, type ToastItem } from "../Toast/toast.ts";

/* ── MOVIE CARD ────────────────────────────────────── */
interface MovieCardProps {
  movie:    Movie;
  onClick?: () => void;
  onViewShows?: () => void;
}
export function MovieCard({ movie, onClick, onViewShows }: MovieCardProps) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="movie-card card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="movie-card-poster">
        {!imgErr ? (
          <img src={movie.posterUrl} alt={movie.name} onError={() => setImgErr(true)} />
        ) : (
          <div className="movie-card-poster-fallback">🎬</div>
        )}
        <div className="movie-card-poster-grad" />
        <span className={`badge badge-${movie.releaseStatus === "RELEASED" ? "green" : movie.releaseStatus === "COMING_SOON" ? "orange" : "red"} movie-card-status`}>
          {movie.releaseStatus === "RELEASED" ? "Now Showing" : movie.releaseStatus === "COMING_SOON" ? "Coming Soon" : "Unavailable"}
        </span>
        <div className="movie-card-rating">
          <span className="rating-star">★</span>
          <span className="rating-value">{(movie?.rating ?? 0).toFixed(1)}</span>
        </div>
      </div>
      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.name}</h3>
        <div className="movie-card-meta">
          <span className="movie-card-genre">{movie.genre.slice(0,2).join(" · ")}</span>
          <span className="movie-card-dur">⏱ {Math.floor(movie.duration/60)}h {movie.duration%60}m</span>
        </div>
        <div className="movie-card-langs">
          {movie.languages.slice(0,3).map(l => <span key={l} className="movie-card-lang">{l}</span>)}
        </div>
        <button
          className="btn btn-primary btn-sm movie-card-btn"
          onClick={e => { e.stopPropagation(); onViewShows?.(); }}>
          View Shows
        </button>
      </div>
    </div>
  );
}

/* ── THEATRE CARD ──────────────────────────────────── */
interface TheatreCardProps {
  theatre:   Theatre;
  showAdmin?: boolean;
  onEdit?:   () => void;
  onDelete?: () => void;
  onClick?:  () => void;
}
export function TheatreCard({ theatre, showAdmin, onEdit, onDelete, onClick }: TheatreCardProps) {
  return (
    <div className="theatre-card card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="theatre-card-body">
        <div className="theatre-card-icon">🏛</div>
        <div className="theatre-card-info">
          <h3 className="theatre-card-name">{theatre.name}</h3>
          <p className="theatre-card-city"><span>📍</span> {theatre.city}</p>
          <p className="theatre-card-address">{theatre.address}</p>
          <div className="theatre-card-movies">
            <span className="theatre-card-movies-label">Running:</span>
            <span className="theatre-card-movies-count">{theatre.movies?.length ?? 0} movies</span>
          </div>
        </div>
      </div>
      {showAdmin && (
        <div className="theatre-card-actions">
          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit?.(); }}>✏ Edit</button>
          <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete?.(); }}>🗑 Delete</button>
        </div>
      )}
    </div>
  );
}

/* ── SHOW CARD ─────────────────────────────────────── */
interface ShowCardProps {
  show:         Show;
  onBook?:      () => void;
  onEdit?:      () => void;
  onDelete?:    () => void;
  showAdmin?:   boolean;
}
export function ShowCard({ show, onBook, onEdit, onDelete, showAdmin }: ShowCardProps) {
  const date  = new Date(show.showTime);
  const avail = show.noOfSeats - (show.bookedSeats?.length ?? 0);
  const pct   = Math.round(((show.bookedSeats?.length ?? 0) / show.noOfSeats) * 100);
  return (
    <div className="show-card">
      <div className="show-card-time">
        <span className="show-card-hm">{date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
        <span className="show-card-date">{date.toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</span>
      </div>
      <div className="show-card-mid">
        <span className={`badge badge-${show.format === "IMAX" ? "blue" : show.format === "4DX" ? "purple" : "orange"}`}>{show.format}</span>
        <div className="show-card-seats">
          <div className="show-card-bar"><div className="show-card-bar-fill" style={{ width: `${pct}%` }} /></div>
          <span className="show-card-avail">{avail} seats left</span>
        </div>
      </div>
      <div className="show-card-right">
        <span className="show-card-price">₹{show.price}</span>
        {onBook && (
          <button className="btn btn-primary btn-sm" onClick={onBook} disabled={avail === 0}>
            {avail === 0 ? "Housefull" : "Book Seats"}
          </button>
        )}
        {showAdmin && (
          <div style={{ display:"flex", gap:6, marginTop:4 }}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏</button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── BOOKING CARD ──────────────────────────────────── */
interface BookingCardProps {
  booking:  Booking;
  onCancel?: () => void;
}
export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const show = typeof booking.showId === "object" ? booking.showId : null;
  const movie   = show && typeof show?.movieId   === "object" ? show.movieId   : null;
  const theatre = show && typeof show?.theatreId === "object" ? show.theatreId : null;
  const date    = show?.showTime ? new Date(show.showTime) : null;

  const statusClass: Record<BookingStatus, string> = {
    IN_PROCESS:  "badge-yellow",
    SUCCESSFUL:  "badge-green",
    CANCELLED:   "badge-red",
    EXPIRED:     "badge-gray",
  };

  return (
    <div className="booking-card card">
      <div className="booking-card-left">
        {movie?.posterUrl && (
          <img className="booking-card-poster" src={movie.posterUrl} alt={movie.name} />
        )}
        <div className="booking-card-info">
          <h3 className="booking-card-movie">{movie?.name ?? "Unknown Movie"}</h3>
          <p className="booking-card-theatre">🏛 {theatre?.name ?? "Unknown Theatre"}</p>
          {date && (
            <p className="booking-card-time">🗓 {date.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })} · {date.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}</p>
          )}
          <p className="booking-card-seats">💺 {booking.seats.join(", ")}</p>
          <p className="booking-card-cost">₹{booking.totalAmount}</p>
        </div>
      </div>
      <div className="booking-card-right">
        <span className={`badge ${statusClass[booking.status]}`}>{booking.status}</span>
        {booking.status !== "CANCELLED" && onCancel && (
          <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ── SEARCH BAR ────────────────────────────────────── */
interface SearchBarProps {
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
}
export function SearchBar({ value, onChange, placeholder = "Search movies, genres…" }: SearchBarProps) {
  return (
    <div className="search-bar">
      <span className="search-bar-icon">🔍</span>
      <input
        className="search-bar-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-bar-clear" onClick={() => onChange("")}>✕</button>
      )}
    </div>
  );
}

/* ── SPINNER ───────────────────────────────────────── */
export function PageSpinner() {
  return (
    <div className="page-spinner">
      <div className="spinner" />
    </div>
  );
}

/* ── TOAST ─────────────────────────────────────────── */
// interface ToastItem { id: number; message: string; type: "success" | "error" | "info"; }
// let _showToast: ((msg: string, type?: ToastItem["type"]) => void) | null = null;
// export function showToast(msg: string, type: ToastItem["type"] = "success") { _showToast?.(msg, type); }

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  useEffect(() => {
  setToastHandler((message, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);

    setTimeout(() => {
      setToasts(p => p.filter(t => t.id !== id));
    }, 3500);
  });

  return () => setToastHandler(() => {});
}, []);
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}</span>
          <span className="toast-text">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ── PROTECTED ROUTE ───────────────────────────────── */
interface ProtectedRouteProps {
  children:      ReactNode;
  roles?:        UserRole[];
  redirectTo?:   string;
}
export function ProtectedRoute({ children, roles, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user)   return <Navigate to={redirectTo} replace />;
  if (roles && !roles.includes(user.userRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/* ── CONFIRM MODAL ─────────────────────────────────── */
interface ConfirmModalProps {
  title:    string;
  message:  string;
  onConfirm: () => void;
  onCancel:  () => void;
  danger?:  boolean;
}
export function ConfirmModal({ title, message, onConfirm, onCancel, danger }: ConfirmModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}