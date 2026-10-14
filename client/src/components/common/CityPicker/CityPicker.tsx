import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCity } from "../../../context/CityContext.tsx";
import { normCity, sameCity } from "../../../utils/city.ts";
import "./CityPicker.css";

export default function CityPicker() {
  const { city, cities, setCity, pickerOpen, closePicker } = useCity();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePicker(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen, closePicker]);

  if (!pickerOpen) return null;

  const q = normCity(query);
  const list = q ? cities.filter(c => normCity(c.city).includes(q) || normCity(c.state).includes(q)) : cities;

  return createPortal(
    <div className="cp-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closePicker(); }}>
      <div className="cp-box" role="dialog" aria-modal="true" aria-labelledby="cp-title">
        <div className="cp-head">
          <div>
            <p className="cp-eyebrow">Your city</p>
            <h2 id="cp-title" className="cp-title">Where are you watching?</h2>
          </div>
          <button className="cp-close" onClick={closePicker} aria-label="Close">✕</button>
        </div>

        <input className="form-input cp-search" autoFocus value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search for your city" aria-label="Search cities" />

        <div className="cp-grid">
          {!q && (
            <button className={`cp-city ${city === null ? "is-active" : ""}`} onClick={() => setCity(null)}>
              <span className="cp-city-icon" aria-hidden="true">🌐</span>
              <span className="cp-city-name">All cities</span>
              <span className="cp-city-meta">{cities.reduce((n, c) => n + c.theatres, 0)} cinemas</span>
            </button>
          )}
          {list.map(c => (
            <button key={normCity(c.city)} className={`cp-city ${sameCity(city, c.city) ? "is-active" : ""}`} onClick={() => setCity(c.city)}>
              <span className="cp-city-icon" aria-hidden="true">{c.city.slice(0, 1).toUpperCase()}</span>
              <span className="cp-city-name">{c.city}</span>
              <span className="cp-city-meta">{c.state ? `${c.state} · ` : ""}{c.theatres} {c.theatres === 1 ? "cinema" : "cinemas"}</span>
            </button>
          ))}
        </div>
        {q && list.length === 0 && <p className="cp-empty">We're not in “{query}” yet — more cities coming soon.</p>}
      </div>
    </div>,
    document.body,
  );
}
