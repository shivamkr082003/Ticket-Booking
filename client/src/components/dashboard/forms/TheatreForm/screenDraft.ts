import type { Screen } from "../../../../types/movie.types.ts";
import { DEFAULT_TIERS, buildLayout, tiersFromLayout, type TierDraft } from "../../../../utils/seatLayout.ts";

// Editable form state for one screen; converted to a real layout on save
export interface ScreenDraft {
  name:       string;
  sound:      string;
  projection: string;
  cols:       number;
  tiers:      TierDraft[];
  photo:      string;
  accessible: string[];   // wheelchair spaces
}

const SEAT_ID = /^([A-Z])(\d{1,2})$/;

/** Parse "a1, A2  b14" → ["A1", "A2", "B14"] (dedup, uppercase) */
export const parseSeatList = (text: string) =>
  [...new Set(text.toUpperCase().split(/[\s,;]+/).filter(Boolean))];

/** Seats from `ids` that exist in a layout of `cols` seats per row over `rows` */
export const seatsInLayout = (ids: string[], rows: string[], cols: number) =>
  ids.filter(id => { const m = SEAT_ID.exec(id); return !!m && rows.includes(m[1]) && Number(m[2]) >= 1 && Number(m[2]) <= cols; });

export const draftFromScreen = (s: Screen): ScreenDraft => ({
  name: s.name, sound: s.sound ?? "", projection: s.projection ?? "",
  cols: s.layout.cols, tiers: tiersFromLayout(s.layout), photo: s.photo ?? "",
  accessible: [...(s.layout.accessible ?? [])],
});

export const screenFromDraft = (d: ScreenDraft): Screen => {
  const layout = buildLayout(d.cols, d.tiers);
  return {
    name: d.name.trim(), sound: d.sound, projection: d.projection, photo: d.photo,
    layout: { ...layout, accessible: seatsInLayout(d.accessible, layout.rows, layout.cols) },
  };
};

export const newScreenDraft = (index: number): ScreenDraft => ({
  name: `Audi ${index + 1}`, sound: "Dolby 7.1", projection: "4K Digital",
  cols: 14, tiers: DEFAULT_TIERS.map((t, i) => ({ ...t, rows: [7, 3, 2][i] })), photo: "", accessible: [],
});

export function draftError(d: ScreenDraft): string | null {
  if (!d.name.trim()) return "Every screen needs a name";
  if (d.cols < 1 || d.cols > 40) return `${d.name}: seats per row must be 1–40`;
  const rows = d.tiers.reduce((a, t) => a + Math.max(0, t.rows), 0);
  if (rows < 1 || rows > 26) return `${d.name}: total rows must be 1–26`;
  if (d.tiers.some(t => t.rows > 0 && !(t.price > 0))) return `${d.name}: every tier with rows needs a price`;
  return null;
}
