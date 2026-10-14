import { useState } from "react";
import Modal        from "../../../common/Modal/Modal.tsx";
import { showsApi } from "../../../../api/index.api.ts";
import { showToast } from "../../../common/Toast/toast.ts";
import type { Show, Movie, Theatre, ShowFormat, CreateShowPayload, MovieRef, ShowTag } from "../../../../types/movie.types.ts";
import { SHOW_TAGS, TAG_ICON } from "../../../../constants/showTags.ts";
import { seatTotal } from "../../../../utils/seatLayout.ts";
import { buildShowTimes, MAX_BULK, plusDaysInput, todayInput, WEEKDAYS } from "./schedule.ts";
import "./ShowForm.css";

interface ShowFormProps {
  data:     Show | null;
  movies:   Movie[];
  theatres: Theatre[];
  onClose:  () => void;
  onSave:   () => void;
}

const FORMATS:   ShowFormat[] = ["2D","3D","IMAX","4DX","Dolby Atmos"];
const LANGUAGES                = ["Hindi","English","Tamil","Telugu","Malayalam","Kannada","Bengali","Punjabi","Marathi"];

export default function ShowForm({ data, movies, theatres, onClose, onSave }: ShowFormProps) {
  const isEdit = !!data;

  const initMovieId   = data?.movieId   && typeof data.movieId   === "object" ? (data.movieId   as Movie  )._id : (data?.movieId   as string ?? "");
  const initTheatreId = data?.theatreId && typeof data.theatreId === "object" ? (data.theatreId as Theatre)._id : (data?.theatreId as string ?? "");

  const [form, setForm] = useState<CreateShowPayload>({
    movieId:           initMovieId,
    theatreId:         initTheatreId,
    screen:            data?.screen    ?? "Screen 1",
    showTime:          data?.showTime  ? new Date(data.showTime).toISOString().slice(0, 16) : "",
    noOfSeats:         data?.noOfSeats ?? 100,
    price:             data?.price     ?? 250,
    format:            data?.format    ?? "2D",
    language:          data?.language  ?? "Hindi",
    seatConfiguration: data?.seatConfiguration ?? "",
    tags:              data?.tags ?? [],
    ignorePricingRules: false,
  });

  const [saving, setSaving] = useState(false);
  // Repeat schedule (new shows only): every chosen weekday between two dates, at each time
  const [mode,     setMode]     = useState<"single" | "repeat">("single");
  const [fromDate, setFromDate] = useState(todayInput);
  const [toDate,   setToDate]   = useState(() => plusDaysInput(13));
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [times,    setTimes]    = useState<string[]>(["10:00", "13:30", "18:00", "21:30"]);
  const [newTime,  setNewTime]  = useState("");
  const repeat     = !isEdit && mode === "repeat";
  const showTimes  = repeat ? buildShowTimes(fromDate, toDate, weekdays, times) : [];
  // Per-tier prices for configured screens; starts from the show's own snapshot when editing
  const [tierPrices, setTierPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries((data?.seatLayout?.categories ?? []).map(c => [c.key, c.price])));

  const set = <K extends keyof CreateShowPayload>(k: K, v: CreateShowPayload[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  // Filter movies by selected theatre
  const selectedTheatre = theatres.find(t => t._id === form.theatreId);
  const availableMovies = selectedTheatre
    ? movies.filter(m =>
        selectedTheatre.movies.some((mv: MovieRef) => (typeof mv === "string" ? mv : mv._id) === m._id)
      )
    : movies;

  const theatreScreens = selectedTheatre?.screens ?? [];
  const rules = selectedTheatre?.pricingRules;
  const ruleSummary = rules
    ? ([["weekendPct", "weekends"], ["morningPct", "mornings"], ["primeTimePct", "6–10 pm"], ["openingDayPct", "opening day"]] as const)
        .filter(([k]) => rules[k]).map(([k, l]) => `${rules[k]! > 0 ? "+" : ""}${rules[k]}% ${l}`).join(" · ")
    : "";
  const toggleTag = (t: ShowTag) =>
    set("tags", (form.tags ?? []).includes(t) ? (form.tags ?? []).filter(x => x !== t) : [...(form.tags ?? []), t]);
  const screenConfig   = theatreScreens.find(sc => sc.name.toLowerCase() === form.screen.trim().toLowerCase()) ?? null;
  const priceFor = (key: string, fallback: number) => tierPrices[key] ?? fallback;

  const pickScreen = (name: string) => {
    set("screen", name);
    const sc = theatreScreens.find(x => x.name === name);
    if (sc) setTierPrices(Object.fromEntries(sc.layout.categories.map(c => [c.key, c.price])));
  };

  const validate = (): string | null => {
    if (!form.theatreId)      return "Select a theatre";
    if (!form.movieId)        return "Select a movie";
    if (!form.screen.trim())  return "Screen name is required";
    if (!repeat && !form.showTime) return "Show time is required";
    if (repeat && !showTimes.length) return "Pick dates, days and at least one show time";
    if (repeat && showTimes.length > MAX_BULK) return `That's ${showTimes.length} shows — schedule at most ${MAX_BULK} at once`;
    if (!screenConfig && form.noOfSeats < 1) return "Seats must be at least 1";
    if (!screenConfig && form.price < 1)     return "Price must be at least ₹1";
    if (screenConfig && screenConfig.layout.categories.some(c => !(priceFor(c.key, c.price) > 0)))
      return "Every seat tier needs a price";
    if (!form.language)       return "Select a language";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { showToast(err, "error"); return; }
    setSaving(true);
    try {
      const payload: CreateShowPayload = { ...form, showTime: repeat ? "" : new Date(form.showTime).toISOString() };
      if (screenConfig) {
        const prices = Object.fromEntries(screenConfig.layout.categories.map(c => [c.key, priceFor(c.key, c.price)]));
        Object.assign(payload, {
          categoryPrices: prices,
          noOfSeats: seatTotal(screenConfig.layout),
          price: Math.min(...Object.values(prices)),
        });
      }
      if (repeat) {
        const { showTime: _omit, seatConfiguration: _sc, ...rest } = payload;
        void _omit; void _sc;
        const r = await showsApi.bulkCreate({ ...rest, showTimes: showTimes.map(d => d.toISOString()) });
        showToast(`${r.created.length} show${r.created.length === 1 ? "" : "s"} scheduled${r.skipped.length ? ` · ${r.skipped.length} skipped` : ""}`);
        if (r.skipped.length) {
          const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
          showToast(`Skipped: ${r.skipped.slice(0, 3).map(s => `${fmt(s.showTime)} (${s.reason.toLowerCase()})`).join("; ")}${r.skipped.length > 3 ? "…" : ""}`, "info");
        }
        onSave();
        return;
      }
      if (isEdit) await showsApi.update(data!._id, payload);
      else        await showsApi.create(payload);
      showToast(`Show ${isEdit ? "updated" : "created"} successfully`);
      onSave();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally { setSaving(false); }
  };

  return (
    <Modal
      title={isEdit ? "EDIT SHOW" : "CREATE SHOW"}
      onClose={onClose}
      maxWidth={540}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : repeat ? `Schedule ${showTimes.length} Show${showTimes.length === 1 ? "" : "s"}` : "Create Show"}
          </button>
        </>
      }
    >
      {!isEdit && (
        <div className="sf-mode" role="tablist" aria-label="Schedule type">
          <button role="tab" aria-selected={mode === "single"} className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>Single show</button>
          <button role="tab" aria-selected={mode === "repeat"} className={mode === "repeat" ? "active" : ""} onClick={() => setMode("repeat")}>Repeat schedule</button>
        </div>
      )}

      {/* Theatre */}
      <div className="form-group">
        <label className="form-label">Theatre *</label>
        <select className="form-input" value={form.theatreId}
          onChange={e => { set("theatreId", e.target.value); set("movieId", ""); }}>
          <option value="">Select Theatre</option>
          {theatres.map(t => (
            <option key={t._id} value={t._id}>{t.name} — {t.city}</option>
          ))}
        </select>
      </div>

      {/* Movie */}
      <div className="form-group">
        <label className="form-label">
          Movie *
          {selectedTheatre && availableMovies.length === 0 && (
            <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 8 }}>
              No movies in this theatre — add movies first
            </span>
          )}
        </label>
        <select className="form-input" value={form.movieId}
          onChange={e => set("movieId", e.target.value)}>
          <option value="">Select Movie</option>
          {availableMovies.map(m => (
            <option key={m._id} value={m._id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Screen & Time */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Screen *</label>
          {theatreScreens.length > 0 ? (
            <select className="form-input" value={screenConfig?.name ?? ""}
              onChange={e => pickScreen(e.target.value)}>
              <option value="" disabled>Select screen</option>
              {theatreScreens.map(sc => (
                <option key={sc.name} value={sc.name}>
                  {sc.name} · {seatTotal(sc.layout)} seats{sc.sound ? ` · ${sc.sound}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input className="form-input" value={form.screen}
              onChange={e => set("screen", e.target.value)}
              placeholder="e.g. Screen 1 / Audi 2" />
          )}
        </div>
        {!repeat && (
          <div className="form-group">
            <label className="form-label">Show Time *</label>
            <input className="form-input" type="datetime-local" value={form.showTime}
              onChange={e => set("showTime", e.target.value)} />
          </div>
        )}
      </div>

      {repeat && (
        <div className="sf-repeat">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From *</label>
              <input className="form-input" type="date" value={fromDate} min={todayInput()} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Until *</label>
              <input className="form-input" type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
          <label className="form-label">Days</label>
          <div className="sf-chips">
            {WEEKDAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={weekdays.includes(i)} className={`sf-chip ${weekdays.includes(i) ? "active" : ""}`}
                onClick={() => setWeekdays(w => (w.includes(i) ? w.filter(x => x !== i) : [...w, i]))}>{d}</button>
            ))}
          </div>
          <label className="form-label">Show times</label>
          <div className="sf-chips">
            {[...times].sort().map(t => (
              <span key={t} className="sf-chip active sf-time">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTimes(ts => ts.filter(x => x !== t))}>×</button>
              </span>
            ))}
            <span className="sf-add-time">
              <input type="time" className="form-input" value={newTime} onChange={e => setNewTime(e.target.value)} aria-label="New show time" />
              <button type="button" className="btn btn-ghost btn-sm" disabled={!newTime || times.includes(newTime)}
                onClick={() => { setTimes(ts => [...ts, newTime]); setNewTime(""); }}>+ Add</button>
            </span>
          </div>
          <p className={`sf-summary ${showTimes.length > MAX_BULK ? "is-over" : ""}`}>
            {showTimes.length
              ? <><b>{showTimes.length}</b> shows · {weekdays.length === 7 ? "every day" : [...weekdays].sort((a, b) => a - b).map(i => WEEKDAYS[i]).join(", ")} · {times.length} a day. Times that clash with an existing show on this screen are skipped.</>
              : "Pick at least one day and one time."}
          </p>
        </div>
      )}

      {/* Format & Language */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Format *</label>
          <select className="form-input" value={form.format}
            onChange={e => set("format", e.target.value as ShowFormat)}>
            {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Language *</label>
          <select className="form-input" value={form.language}
            onChange={e => set("language", e.target.value)}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Tiered pricing for configured screens */}
      {screenConfig && (
        <>
          <p className="form-section-label">TICKET PRICES · {seatTotal(screenConfig.layout)} SEATS</p>
          <div className="form-row" style={{ gridTemplateColumns: `repeat(${screenConfig.layout.categories.length}, 1fr)` }}>
            {screenConfig.layout.categories.map(c => (
              <div key={c.key} className="form-group">
                <label className="form-label">{c.label} · {c.rows.length * screenConfig.layout.cols} seats</label>
                <input className="form-input" type="number" min={1} value={priceFor(c.key, c.price)}
                  onChange={e => setTierPrices(p => ({ ...p, [c.key]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>
        </>
      )}

      {!isEdit && ruleSummary && (
        <label className="sf-rules">
          <input type="checkbox" checked={!form.ignorePricingRules} onChange={e => set("ignorePricingRules", !e.target.checked)} />
          <span>Apply this cinema's dynamic pricing <small>{ruleSummary}</small></span>
        </label>
      )}

      <p className="form-section-label">ACCESSIBILITY &amp; AUDIENCE</p>
      <div className="sf-chips">
        {SHOW_TAGS.map(t => (
          <button key={t} type="button" aria-pressed={(form.tags ?? []).includes(t)}
            className={`sf-chip ${(form.tags ?? []).includes(t) ? "active" : ""}`} onClick={() => toggleTag(t)}>
            <span aria-hidden="true">{TAG_ICON[t]}</span> {t}
          </button>
        ))}
      </div>

      {/* Seats & Price (screens without a seat map) */}
      {!screenConfig && <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Total Seats *</label>
          <input className="form-input" type="number" min={1} value={form.noOfSeats}
            onChange={e => set("noOfSeats", Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label">Price (₹) *</label>
          <input className="form-input" type="number" min={1} value={form.price}
            onChange={e => set("price", Number(e.target.value))} />
        </div>
      </div>

      {/* Seat Config */}
      <div className="form-group">
        <label className="form-label">
          Seat Configuration
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11, marginLeft: 4, textTransform: "none", letterSpacing: 0 }}>
            (optional, e.g. 10x10)
          </span>
        </label>
        <input className="form-input" value={form.seatConfiguration ?? ""}
          onChange={e => set("seatConfiguration", e.target.value)}
          placeholder="rows x seatsPerRow" />
      </div>
      </>}
    </Modal>
  );
}