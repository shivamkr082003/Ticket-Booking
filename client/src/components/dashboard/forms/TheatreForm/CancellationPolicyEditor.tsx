import type { CancellationPolicy } from "../../../../types/movie.types.ts";
import { PLATFORM_POLICY } from "../../../../constants/policy.ts";
import { hrs } from "../../../../utils/plural.ts";

interface Props { value: CancellationPolicy | null; onChange: (v: CancellationPolicy | null) => void }

export default function CancellationPolicyEditor({ value, onChange }: Props) {
  const p = value ?? PLATFORM_POLICY;
  const set = (k: keyof CancellationPolicy, n: number) => onChange({ ...p, [k]: n });
  return (
    <div className="cp-edit">
      <label className="me-check">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked ? { ...PLATFORM_POLICY } : null)} />
        Use a custom policy for this cinema
      </label>
      {value ? (
        <div className="form-row cp-edit-row">
          <div className="form-group">
            <label className="form-label">Full refund until (hrs before)</label>
            <input className="form-input" type="number" min={0} max={168} value={p.fullRefundHours} onChange={e => set("fullRefundHours", Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Partial refund %</label>
            <input className="form-input" type="number" min={0} max={100} value={p.partialRefundPct} onChange={e => set("partialRefundPct", Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">No cancellations within (hrs)</label>
            <input className="form-input" type="number" min={0} max={72} value={p.cancelCutoffHours} onChange={e => set("cancelCutoffHours", Number(e.target.value))} />
          </div>
        </div>
      ) : null}
      <p className="tf-hint">
        {p.cancelCutoffHours > p.fullRefundHours
          ? "⚠ The cut-off must be shorter than the full-refund window."
          : `Guests get 100% back up to ${hrs(p.fullRefundHours)} before the show, ${p.partialRefundPct}% until ${hrs(p.cancelCutoffHours)} before, then no cancellations. Prime members always get 100% inside the window; the booking fee is never refunded.`}
      </p>
    </div>
  );
}
