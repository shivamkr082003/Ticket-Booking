import { useState } from "react";
import type { Theatre } from "../../../types/movie.types.ts";
import { directionsUrl, distanceKm, formatKm, getMyLocation, hasPin, mapEmbedUrl } from "../../../utils/geo.ts";
import { PLATFORM_POLICY } from "../../../constants/policy.ts";
import { hrs } from "../../../utils/plural.ts";
import "./TheatreVisit.css";

export default function TheatreVisit({ theatre }: { theatre: Theatre }) {
  const [km,  setKm]  = useState<number | null>(null);
  const [err, setErr] = useState("");
  const policy = { ...PLATFORM_POLICY, ...(theatre.cancellationPolicy ?? {}) };
  const custom = !!theatre.cancellationPolicy;

  const measure = () => {
    if (!hasPin(theatre)) return;
    setErr("");
    getMyLocation().then(me => setKm(distanceKm(me, theatre.location))).catch((e: Error) => setErr(e.message));
  };

  return (
    <section className="tv container">
      <div className="tv-map-card">
        <iframe className="tv-map" title={`Map of ${theatre.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapEmbedUrl(theatre)} />
        <div className="tv-map-foot">
          <div>
            <p className="tv-addr">{theatre.address}, {theatre.city}{theatre.pincode ? ` ${theatre.pincode}` : ""}</p>
            {km !== null ? <p className="tv-dist">📍 {formatKm(km)} from you</p>
              : hasPin(theatre) ? <button className="tv-link" onClick={measure}>How far is it from me?</button> : null}
            {err && <p className="tv-err">{err}</p>}
          </div>
          <a className="btn btn-primary btn-sm" href={directionsUrl(theatre)} target="_blank" rel="noopener noreferrer">Get directions</a>
        </div>
      </div>

      <div className="tv-policy">
        <p className="tv-label">{custom ? "This cinema's" : "Standard"} cancellation policy</p>
        <ol className="tv-steps">
          <li><b>100%</b><span>refund up to {hrs(policy.fullRefundHours)} before</span></li>
          <li><b>{policy.partialRefundPct}%</b><span>until {hrs(policy.cancelCutoffHours)} before</span></li>
          <li><b>—</b><span>no cancellations after that</span></li>
        </ol>
        <p className="tv-note">✦ Prime members get a full refund until the cut-off. The booking fee isn't refundable.</p>
      </div>
    </section>
  );
}
