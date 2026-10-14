import type { SeatLayout } from "../../../types/movie.types.ts";
import "./SeatGrid.css";

export type SeatStatus = "available" | "selected" | "booked" | "temp-blocked";

interface SeatGridProps {
  layout:        SeatLayout;
  selectedSeats: string[];
  bookedSeats:   string[];
  tempBlocked:   string[];
  onSeatClick:   (seat: string) => void;
}

export default function SeatGrid({
  layout, selectedSeats, bookedSeats, tempBlocked, onSeatClick,
}: SeatGridProps) {

  const getStatus = (seat: string): SeatStatus => {
    if (bookedSeats.includes(seat))   return "booked";
    if (tempBlocked.includes(seat))   return "temp-blocked";
    if (selectedSeats.includes(seat)) return "selected";
    return "available";
  };

  const cols = Array.from({ length: layout.cols }, (_, i) => i + 1);
  const access = new Set(layout.accessible ?? []);
  const tiered = layout.categories.length > 1;

  return (
    <div className="sg-wrap">
      {/* Screen */}
      <div className="sg-screen-wrap">
        <div className="sg-screen" />
        <p className="sg-screen-label">All eyes this way · Screen</p>
      </div>

      {/* Seat map — sections run front (nearest the screen) to back */}
      <div className="sg-scroll">
        <div className="sg-grid">
          {layout.categories.map(cat => (
            <div key={cat.key} className={`sg-section sg-section--${cat.key.toLowerCase()}`}>
              {tiered && (
                <div className="sg-section-head">
                  <span className="sg-section-name">{cat.label}</span>
                  <span className="sg-section-price">₹{cat.price}</span>
                </div>
              )}
              {cat.rows.map(row => (
                <div key={row} className="sg-row">
                  <span className="sg-row-label">{row}</span>
                  <div className="sg-seats">
                    {cols.map(col => {
                      const seat     = `${row}${col}`;
                      const status   = getStatus(seat);
                      const disabled = status === "booked" || status === "temp-blocked";
                      const wheel    = access.has(seat);
                      return (
                        <button
                          key={seat}
                          className={`sg-seat sg-seat--${status} ${cat.key === "RECLINER" ? "sg-seat--wide" : ""} ${layout.aisles.includes(col) ? "sg-aisle" : ""} ${wheel ? "sg-seat--access" : ""}`}
                          onClick={() => !disabled && onSeatClick(seat)}
                          disabled={disabled}
                          aria-pressed={status === "selected"}
                          aria-label={`${seat}, ${cat.label} ₹${cat.price}${wheel ? ", wheelchair space" : ""}, ${status === "temp-blocked" ? "being selected by someone else" : status}`}
                          title={
                            status === "booked"       ? `${seat} — Booked` :
                            status === "temp-blocked" ? `${seat} — Someone is selecting this` :
                            `${seat} · ${cat.label} · ₹${cat.price}${wheel ? " · ♿ Wheelchair space" : ""}`
                          }
                        >
                          <span className="sg-seat-num">{wheel && status === "available" ? "♿" : col}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="sg-row-label">{row}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="sg-legend">
        {(["available","selected","temp-blocked","booked"] as SeatStatus[]).map(s => (
          <div key={s} className="sg-legend-item">
            <div className={`sg-seat sg-seat--${s} sg-legend-dot`} />
            <span className="sg-legend-label">
              {s === "temp-blocked" ? "Being selected" : s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
        {access.size > 0 && (
          <div className="sg-legend-item">
            <div className="sg-seat sg-seat--available sg-seat--access sg-legend-dot" />
            <span className="sg-legend-label">♿ Wheelchair space</span>
          </div>
        )}
      </div>
    </div>
  );
}
