import { SOUND_OPTIONS, PROJECTION_OPTIONS } from "../../../../constants/amenities.ts";
import { SCREEN_PRESETS, buildLayout, seatTotal, type TierDraft } from "../../../../utils/seatLayout.ts";
import { newScreenDraft, parseSeatList, seatsInLayout, type ScreenDraft } from "./screenDraft.ts";
import PhotoSlot from "../../../common/PhotoSlot/PhotoSlot.tsx";
import { stockScreenPhoto } from "../../../../utils/theatreImages.ts";

const TIER_CLASS: Record<string, string> = { REGULAR: "t-regular", PREMIUM: "t-premium", RECLINER: "t-recliner" };

interface ScreenEditorProps {
  screens:   ScreenDraft[];
  onChange:  (screens: ScreenDraft[]) => void;
  theatreId?: string;   // seeds the stock-photo preview
}

export default function ScreenEditor({ screens, onChange, theatreId = "new" }: ScreenEditorProps) {
  const update = (i: number, patch: Partial<ScreenDraft>) =>
    onChange(screens.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const updateTier = (i: number, key: string, patch: Partial<TierDraft>) =>
    update(i, { tiers: screens[i].tiers.map(t => (t.key === key ? { ...t, ...patch } : t)) });
  const applyPreset = (i: number, presetKey: string) => {
    const preset = SCREEN_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    update(i, { cols: preset.cols, tiers: screens[i].tiers.map((t, k) => ({ ...t, rows: preset.tiers[k] ?? 0 })) });
  };

  return (
    <div className="se-list">
      {screens.map((s, i) => {
        const layout = buildLayout(s.cols, s.tiers);
        const valid = seatsInLayout(s.accessible, layout.rows, layout.cols);
        const invalid = s.accessible.filter(x => !valid.includes(x));
        const toggleSpace = (id: string) =>
          update(i, { accessible: s.accessible.includes(id) ? s.accessible.filter(x => x !== id) : [...s.accessible, id] });
        return (
          <div key={i} className="se-card">
            <div className="se-head">
              <input className="form-input se-name" value={s.name} maxLength={40}
                onChange={e => update(i, { name: e.target.value })} placeholder="Screen name" aria-label="Screen name" />
              <span className="se-total">{seatTotal(layout)} seats</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(screens.filter((_, j) => j !== i))}>Remove</button>
            </div>

            <div className="se-photo">
              <PhotoSlot
                label="Auditorium photo"
                value={s.photo}
                onChange={photo => update(i, { photo })}
                folder="cineverse/theatres/screens"
                fallback={stockScreenPhoto(theatreId, s)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sound</label>
                <select className="form-input" value={s.sound} onChange={e => update(i, { sound: e.target.value })}>
                  <option value="">—</option>
                  {SOUND_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Projection</label>
                <select className="form-input" value={s.projection} onChange={e => update(i, { projection: e.target.value })}>
                  <option value="">—</option>
                  {PROJECTION_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Size preset</label>
                <select className="form-input" defaultValue="" onChange={e => applyPreset(i, e.target.value)}>
                  <option value="" disabled>Apply a preset…</option>
                  {SCREEN_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Seats per row</label>
                <input className="form-input" type="number" min={1} max={40} value={s.cols}
                  onChange={e => update(i, { cols: Math.max(1, Math.min(40, Number(e.target.value) || 1)) })} />
              </div>
            </div>

            <div className="se-tiers">
              <div className="se-tier se-tier--head"><span>Tier</span><span>Rows</span><span>Price (₹)</span></div>
              {s.tiers.map(t => (
                <div key={t.key} className="se-tier">
                  <span className="se-tier-name"><i className={`se-dot ${TIER_CLASS[t.key] ?? ""}`} />{t.label}</span>
                  <input className="form-input" type="number" min={0} max={26} value={t.rows} aria-label={`${t.label} rows`}
                    onChange={e => updateTier(i, t.key, { rows: Math.max(0, Number(e.target.value) || 0) })} />
                  <input className="form-input" type="number" min={1} value={t.price} aria-label={`${t.label} price`}
                    onChange={e => updateTier(i, t.key, { price: Number(e.target.value) || 0 })} />
                </div>
              ))}
            </div>

            <div className="form-group se-access">
              <label className="form-label">♿ Wheelchair spaces <span className="se-access-hint">— click seats in the preview, or type seat ids</span></label>
              <input className="form-input" value={s.accessible.join(", ")} placeholder="e.g. A1, A14"
                onChange={e => update(i, { accessible: parseSeatList(e.target.value) })} />
              {invalid.length > 0 && <p className="se-access-err">Not on this screen: {invalid.join(", ")}</p>}
            </div>

            {/* Live preview — screen at the top, recliners at the back; click a seat to mark a wheelchair space */}
            <div className="se-preview">
              <div className="se-preview-screen" aria-hidden="true" />
              {layout.categories.map(c => c.rows.map(r => (
                <div key={r} className="se-preview-row">
                  {Array.from({ length: layout.cols }, (_, k) => {
                    const id = `${r}${k + 1}`;
                    const on = valid.includes(id);
                    return (
                      <button type="button" key={k} title={id} aria-label={`${id}${on ? ", wheelchair space" : ""}`} aria-pressed={on}
                        onClick={() => toggleSpace(id)}
                        className={`${TIER_CLASS[c.key] ?? ""} ${layout.aisles.includes(k + 1) ? "gap" : ""} ${on ? "is-access" : ""}`} />
                    );
                  })}
                </div>
              )))}
            </div>
          </div>
        );
      })}

      <button type="button" className="se-add" onClick={() => onChange([...screens, newScreenDraft(screens.length)])}>
        + Add screen
      </button>
    </div>
  );
}
