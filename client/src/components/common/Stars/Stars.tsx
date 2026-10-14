import "./Stars.css";

interface StarsProps {
  value:     number;              // 0–5, fractional ok for display
  onChange?: (v: number) => void; // makes it an input
  size?:     number;
  label?:    string;
}

export default function Stars({ value, onChange, size = 16, label = "Rating" }: StarsProps) {
  if (!onChange) {
    return (
      <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${label}: ${value.toFixed(1)} out of 5`}>
        <span className="stars-bg">★★★★★</span>
        <span className="stars-fg" style={{ width: `${Math.max(0, Math.min(5, value)) * 20}%` }}>★★★★★</span>
      </span>
    );
  }
  return (
    <span className="stars-input" role="radiogroup" aria-label={label} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={n <= value ? "on" : ""} onClick={() => onChange(n)}>★</button>
      ))}
    </span>
  );
}
