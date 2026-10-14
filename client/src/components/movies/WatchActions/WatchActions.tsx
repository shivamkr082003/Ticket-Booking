import { useNavigate } from "react-router-dom";
import { useWatchlist } from "../../../hooks/useWatchlist.ts";
import { showToast } from "../../common/Toast/toast.ts";
import "./WatchActions.css";

interface WatchActionsProps {
  movieId:   string;
  /** No upcoming shows yet → offer "Notify me" */
  canNotify: boolean;
  size?:     "lg" | "sm";
}

export default function WatchActions({ movieId, canNotify, size = "lg" }: WatchActionsProps) {
  const navigate = useNavigate();
  const { has, toggle, notifying, toggleNotify } = useWatchlist();
  const saved = has(movieId);
  const bell  = notifying(movieId);

  const onNotify = () => {
    if (!toggleNotify(movieId)) {
      showToast("Sign in to get notified when bookings open", "info");
      navigate("/login");
      return;
    }
    showToast(bell ? "Notification turned off" : "We'll notify you when bookings open");
  };

  return (
    <>
      <button className={`btn btn-ghost btn-${size} wa-btn ${saved ? "is-on" : ""}`} aria-pressed={saved}
        onClick={() => { toggle(movieId); showToast(saved ? "Removed from watchlist" : "Added to watchlist"); }}>
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span> {saved ? "In Watchlist" : "Watchlist"}
      </button>
      {canNotify && (
        <button className={`btn btn-ghost btn-${size} wa-btn wa-bell ${bell ? "is-on" : ""}`} aria-pressed={bell} onClick={onNotify}>
          <span aria-hidden="true">🔔</span> {bell ? "Notifying you" : "Notify me"}
        </button>
      )}
    </>
  );
}
