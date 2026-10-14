import type { PricingRules } from "../../../../types/movie.types.ts";

const RULES: { key: keyof PricingRules; label: string; hint: string }[] = [
  { key: "weekendPct",    label: "Weekend",      hint: "Sat & Sun" },
  { key: "morningPct",    label: "Morning",      hint: "Starts before 12 pm" },
  { key: "primeTimePct",  label: "Prime time",   hint: "Starts 6–10 pm" },
  { key: "openingDayPct", label: "Opening day",  hint: "Movie's release day" },
];

interface Props { value: PricingRules; onChange: (v: PricingRules) => void }

/** % added to (or taken off) every seat tier when a show is scheduled */
export default function PricingRulesEditor({ value, onChange }: Props) {
  const example = 250;
  return (
    <div className="pr">
      {RULES.map(r => {
        const pct = value[r.key] ?? 0;
        return (
          <div key={r.key} className="pr-rule">
            <div>
              <p className="pr-label">{r.label}</p>
              <p className="pr-hint">{r.hint}</p>
            </div>
            <div className="pr-input">
              <input className="form-input" type="number" min={-50} max={100} step={5} value={pct}
                aria-label={`${r.label} price change in percent`}
                onChange={e => onChange({ ...value, [r.key]: Math.max(-50, Math.min(100, Math.round(Number(e.target.value) || 0))) })} />
              <span>%</span>
            </div>
            <p className={`pr-example ${pct > 0 ? "is-up" : pct < 0 ? "is-down" : ""}`}>
              ₹{example} → ₹{Math.max(1, Math.round(example * (1 + pct / 100)))}
            </p>
          </div>
        );
      })}
    </div>
  );
}
