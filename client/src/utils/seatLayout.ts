import type { LineItem, SeatCategory, SeatLayout, Show } from "../types/movie.types.ts";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Shows created before screens existed: the original 8×10 grid at one price
export function legacyLayout(price: number): SeatLayout {
  return {
    rows: LETTERS.slice(0, 8).split(""),
    cols: 10,
    aisles: [],
    categories: [{ key: "STANDARD", label: "Standard", price, rows: LETTERS.slice(0, 8).split("") }],
  };
}

export const layoutFor = (show: Pick<Show, "seatLayout" | "price">): SeatLayout =>
  show.seatLayout && show.seatLayout.categories?.length ? show.seatLayout : legacyLayout(show.price);

export const categoryOf = (layout: SeatLayout, seat: string): SeatCategory | undefined =>
  layout.categories.find(c => c.rows.includes(seat.charAt(0)));

/** Mirrors the server's priceSeats — preview only; the server computes the real charge */
export function priceSelection(show: Pick<Show, "seatLayout" | "price">, seats: string[]) {
  const layout = layoutFor(show);
  const groups = new Map<string, LineItem>();
  for (const seat of seats) {
    const cat = categoryOf(layout, seat);
    if (!cat) continue;
    const line = groups.get(cat.key) ?? { category: cat.key, label: cat.label, price: cat.price, seats: [] };
    line.seats.push(seat);
    groups.set(cat.key, line);
  }
  // Keep categories in layout order (front → back)
  const lineItems = layout.categories.map(c => groups.get(c.key)).filter((l): l is LineItem => Boolean(l));
  return { lineItems, subtotal: lineItems.reduce((a, l) => a + l.price * l.seats.length, 0) };
}

/** "₹220" for single-price shows, "₹220 – ₹450" when a screen has tiers */
export function priceLabel(show: Pick<Show, "seatLayout" | "price">, compact = false): string {
  const prices = layoutFor(show).categories.map(c => c.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  if (min === max) return `₹${min}`;
  return compact ? `from ₹${min}` : `₹${min} – ₹${max}`;
}

export const seatTotal = (layout: SeatLayout) => layout.rows.length * layout.cols;

// ── Screen builder ────────────────────────────────────────

export interface TierDraft { key: string; label: string; rows: number; price: number }

export const DEFAULT_TIERS: TierDraft[] = [
  { key: "REGULAR",  label: "Regular",  rows: 6, price: 200 },
  { key: "PREMIUM",  label: "Premium",  rows: 3, price: 320 },
  { key: "RECLINER", label: "Recliner", rows: 2, price: 550 },
];

export const SCREEN_PRESETS = [
  { key: "compact",  label: "Compact · ~80 seats",   cols: 10, tiers: [5, 2, 1] },
  { key: "standard", label: "Standard · ~170 seats", cols: 14, tiers: [7, 3, 2] },
  { key: "large",    label: "Large · ~290 seats",    cols: 18, tiers: [9, 4, 3] },
];

/** Aisles that split a row into sensible blocks */
export const autoAisles = (cols: number): number[] =>
  cols >= 14 ? [Math.round(cols * 0.25), Math.round(cols * 0.75)] : cols >= 8 ? [Math.round(cols / 2)] : [];

/** Build a layout front → back: cheaper tiers sit nearest the screen, recliners at the back */
export function buildLayout(cols: number, tiers: TierDraft[]): SeatLayout {
  const active = tiers.filter(t => t.rows > 0);
  const rows: string[] = [];
  const categories: SeatCategory[] = active.map(t => {
    const own = LETTERS.slice(rows.length, rows.length + t.rows).split("");
    rows.push(...own);
    return { key: t.key, label: t.label, price: t.price, rows: own };
  });
  return { rows, cols, aisles: autoAisles(cols), categories };
}

/** Reverse of buildLayout — used to edit an existing screen */
export function tiersFromLayout(layout: SeatLayout): TierDraft[] {
  return DEFAULT_TIERS.map(d => {
    const c = layout.categories.find(x => x.key === d.key);
    return c ? { ...d, label: c.label, rows: c.rows.length, price: c.price } : { ...d, rows: 0 };
  });
}

/**
 * "Best available": the n adjacent free seats closest to the sweet spot — about
 * 60% of the way back, centred — without straddling an aisle. Wheelchair spaces are
 * left for guests who need them. Returns [] when no row has n seats together.
 */
export function bestAvailable(layout: SeatLayout, n: number, taken: Set<string>): string[] {
  if (n < 1) return [];
  const access = new Set(layout.accessible ?? []);
  const ideal  = Math.floor((layout.rows.length - 1) * 0.6);
  const centre = (layout.cols + 1) / 2;
  // Blocks of columns between aisles: aisles = [4, 10] → [1..4], [5..10], [11..cols]
  const cuts = [0, ...[...layout.aisles].sort((a, b) => a - b).filter(a => a < layout.cols), layout.cols];
  let best: { seats: string[]; score: number } | null = null;

  layout.rows.forEach((row, ri) => {
    for (let b = 0; b < cuts.length - 1; b++) {
      for (let start = cuts[b] + 1; start + n - 1 <= cuts[b + 1]; start++) {
        const seats = Array.from({ length: n }, (_, k) => `${row}${start + k}`);
        if (seats.some(s => taken.has(s) || access.has(s))) continue;
        const mid   = start + (n - 1) / 2;
        const score = Math.abs(ri - ideal) * 1.6 + Math.abs(mid - centre);
        if (!best || score < best.score) best = { seats, score };
      }
    }
  });
  return best ? (best as { seats: string[] }).seats : [];
}
