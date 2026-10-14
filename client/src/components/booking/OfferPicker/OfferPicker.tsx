import { useEffect, useState } from "react";
import { offersApi } from "../../../api/index.api.ts";
import type { Offer } from "../../../types/movie.types.ts";
import { offerHeadline } from "../../../constants/checkout.ts";
import "./OfferPicker.css";

interface OfferPickerProps {
  applied:   string | null;
  discount:  number;
  error:     string;
  onApply:   (code: string) => void;
  onRemove:  () => void;
}

export default function OfferPicker({ applied, discount, error, onApply, onRemove }: OfferPickerProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [code,   setCode]   = useState("");
  const [open,   setOpen]   = useState(false);

  useEffect(() => {
    offersApi.list().then(setOffers).catch(() => setOffers([]));
  }, []);

  if (applied) return (
    <div className="op-applied">
      <span className="op-tag">🏷 {applied}</span>
      <span className="op-saved">− ₹{discount} saved</span>
      <button className="op-link" onClick={onRemove}>Remove</button>
    </div>
  );

  return (
    <div className="op">
      <form className="op-row" onSubmit={e => { e.preventDefault(); if (code.trim()) onApply(code.trim().toUpperCase()); }}>
        <input className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code" maxLength={20} aria-label="Coupon code" />
        <button className="btn btn-ghost btn-sm" type="submit" disabled={!code.trim()}>Apply</button>
      </form>
      {error && <p className="op-error">{error}</p>}

      {offers.length > 0 && (
        <>
          <button className="op-link" onClick={() => setOpen(o => !o)}>
            {open ? "Hide offers" : `View ${offers.length} available offer${offers.length > 1 ? "s" : ""}`}
          </button>
          {open && (
            <ul className="op-list">
              {offers.map(o => (
                <li key={o.code}>
                  <div>
                    <p className="op-code">{o.code} · <b>{offerHeadline(o)}</b></p>
                    <p className="op-desc">
                      {o.description || "Applies to your whole order"}
                      {o.minAmount > 0 && ` · Min order ₹${o.minAmount}`}
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { onApply(o.code); setOpen(false); }}>Apply</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
