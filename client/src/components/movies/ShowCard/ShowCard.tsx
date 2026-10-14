import type { Show } from "../../../types/movie.types.ts";
import { priceLabel } from "../../../utils/seatLayout.ts";
import { TAG_ICON, TAG_SHORT } from "../../../constants/showTags.ts";
import "./ShowCard.css";

interface ShowCardProps {
  show:     Show;
  onBook:   (showId: string) => void;
}

export default function ShowCard({ show, onBook }: ShowCardProps) {
  const avail = (show.noOfSeats ?? 0) - (show.bookedSeats?.length ?? 0);
  const pct   = show.noOfSeats
    ? Math.round((show.bookedSeats?.length ?? 0) / show.noOfSeats * 100)
    : 0;
  const date  = new Date(show.showTime);

  const availColor = avail === 0
    ? "var(--red)"
    : avail < 20
    ? "var(--yellow)"
    : "var(--green)";

  return (
    <div className="sc">
      {/* Time */}
      <div className="sc-time">
        <span className="sc-hm">
          {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="sc-date">
          {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Mid — format + seats */}
      <div className="sc-mid">
        <span className={`badge badge-${show.format === "IMAX" ? "blue" : show.format === "4DX" ? "purple" : "orange"}`}>
          {show.format}
        </span>
        {show.language && (
          <span className="sc-lang">{show.language}</span>
        )}
        {show.tags?.map(t => (
          <span key={t} className="sc-tag" title={t}><span aria-hidden="true">{TAG_ICON[t]}</span> {TAG_SHORT[t]}</span>
        ))}
        <div className="sc-seats">
          <div className="sc-bar">
            <div className="sc-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="sc-avail" style={{ color: availColor }}>
            {avail === 0 ? "Housefull" : `${avail} left`}
          </span>
        </div>
      </div>

      {/* Right — price + book */}
      <div className="sc-right">
        <span className="sc-price">{priceLabel(show, true)}</span>
        <button
          className="btn btn-primary btn-sm"
          disabled={avail === 0}
          onClick={() => onBook(show._id)}
        >
          {avail === 0 ? "Housefull" : "Book Seats"}
        </button>
      </div>
    </div>
  );
}