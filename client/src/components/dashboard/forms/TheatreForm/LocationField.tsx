import { useState } from "react";
import type { GeoPoint } from "../../../../types/movie.types.ts";

interface LocationFieldProps {
  value:    GeoPoint | null;
  onChange: (v: GeoPoint | null) => void;
  /** Address text, used for the map preview when no pin is set */
  query:    string;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// Map pin for "near me" sorting and the embedded map on the theatre page
export default function LocationField({ value, onChange, query }: LocationFieldProps) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const useHere = () => {
    if (!navigator.geolocation) { setErr("Location isn't available in this browser"); return; }
    setBusy(true); setErr("");
    navigator.geolocation.getCurrentPosition(
      p => { onChange({ lat: round(p.coords.latitude), lng: round(p.coords.longitude) }); setBusy(false); },
      () => { setErr("Couldn't read your location — allow access or paste the coordinates"); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const setPart = (k: keyof GeoPoint, raw: string) => {
    const n = Number(raw);
    if (raw === "") { onChange(null); return; }
    if (Number.isFinite(n)) onChange({ lat: value?.lat ?? 0, lng: value?.lng ?? 0, [k]: n });
  };

  const mapQ = value ? `${value.lat},${value.lng}` : query.trim();

  return (
    <div className="lf">
      <div className="lf-fields">
        <div className="form-group">
          <label className="form-label">Latitude</label>
          <input className="form-input" type="number" step="any" min={-90} max={90} value={value?.lat ?? ""}
            onChange={e => setPart("lat", e.target.value)} placeholder="19.0760" />
        </div>
        <div className="form-group">
          <label className="form-label">Longitude</label>
          <input className="form-input" type="number" step="any" min={-180} max={180} value={value?.lng ?? ""}
            onChange={e => setPart("lng", e.target.value)} placeholder="72.8777" />
        </div>
        <div className="lf-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={useHere} disabled={busy}>
            📍 {busy ? "Locating…" : "Use my current location"}
          </button>
          {value && <button type="button" className="ps-link ps-link--danger" onClick={() => onChange(null)}>Clear pin</button>}
        </div>
      </div>
      {err && <p className="lf-err">{err}</p>}
      <p className="tf-hint">
        Standing at the cinema? Use your current location. Otherwise right-click the spot in Google Maps and copy the numbers.
      </p>
      {mapQ && (
        <iframe className="lf-map" title="Map preview" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQ)}&z=${value ? 16 : 13}&output=embed`} />
      )}
    </div>
  );
}
