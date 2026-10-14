import type { Booking, Movie, Show, ShowFormat, Theatre } from "../../types/movie.types.ts";

const DAY_MS = 86_400_000;

export const showOf    = (b: Booking): Show | null => (typeof b.showId === "object" && b.showId ? b.showId : null);
export const movieOf   = (s: Show | null): Movie | null => (s && typeof s.movieId === "object" && s.movieId ? s.movieId : null);
export const theatreOf = (s: Show | null): Theatre | null => (s && typeof s.theatreId === "object" && s.theatreId ? s.theatreId : null);

export const isPaid = (b: Booking) => b.status === "SUCCESSFUL";

// What the customer was actually charged (Prime discounts included).
// Older bookings without totalAmount fall back to seats × price.
export function bookingAmount(b: Booking): number {
  if (typeof b.totalAmount === "number") return b.totalAmount;
  return (b.seats?.length ?? 0) * (showOf(b)?.price ?? 0);
}

/** Kept after a partial refund (e.g. 50% cancellations) — still revenue for the theatre */
export const retainedAmount = (b: Booking) =>
  b.status === "CANCELLED" && b.refundStatus && b.refundStatus !== "NONE"
    ? Math.max(0, bookingAmount(b) - (b.refundAmount ?? 0))
    : 0;

/** Net revenue: paid bookings plus whatever was kept from refunded cancellations */
export const revenueOf = (list: Booking[]) =>
  list.reduce((a, b) => a + (isPaid(b) ? bookingAmount(b) : retainedAmount(b)), 0);

export const refundsOf = (list: Booking[]) =>
  list.reduce((a, b) => a + (b.status === "CANCELLED" ? b.refundAmount ?? 0 : 0), 0);
export const ticketsOf = (list: Booking[]) => list.filter(isPaid).reduce((a, b) => a + (b.seats?.length ?? 0), 0);

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export function inWindow(list: Booking[], days: number, offsetDays = 0) {
  const end   = startOfDay(new Date()).getTime() + DAY_MS - offsetDays * DAY_MS;
  const start = end - days * DAY_MS;
  return list.filter(b => {
    const t = new Date(b.createdAt ?? 0).getTime();
    return t >= start && t < end;
  });
}

export interface DayPoint { date: Date; label: string; revenue: number; tickets: number; bookings: number }

export function daySeries(list: Booking[], days: number): DayPoint[] {
  const today = startOfDay(new Date());
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getTime() - (days - 1 - i) * DAY_MS);
    return { date, label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: 0, tickets: 0, bookings: 0 };
  });
  const first = buckets[0].date.getTime();
  for (const b of list) {
    const idx = Math.floor((startOfDay(new Date(b.createdAt ?? 0)).getTime() - first) / DAY_MS);
    const slot = buckets[idx];
    if (!slot) continue;
    slot.bookings += 1;
    if (isPaid(b)) { slot.revenue += bookingAmount(b); slot.tickets += b.seats?.length ?? 0; }
    else slot.revenue += retainedAmount(b);
  }
  return buckets;
}

/** % change vs the previous window; null when there's no baseline */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export interface RankRow { id: string; name: string; sub?: string; image?: string; tickets: number; revenue: number }

export function topMovies(list: Booking[], n = 5): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const b of list.filter(isPaid)) {
    const mv = movieOf(showOf(b));
    if (!mv) continue;
    const row = map.get(mv._id) ?? { id: mv._id, name: mv.name, image: mv.posterUrl, tickets: 0, revenue: 0 };
    row.tickets += b.seats?.length ?? 0;
    row.revenue += bookingAmount(b);
    map.set(mv._id, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, n);
}

export function topTheatres(list: Booking[], n = 5): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const b of list.filter(isPaid)) {
    const th = theatreOf(showOf(b));
    if (!th) continue;
    const row = map.get(th._id) ?? { id: th._id, name: th.name, sub: th.city, tickets: 0, revenue: 0 };
    row.tickets += b.seats?.length ?? 0;
    row.revenue += bookingAmount(b);
    map.set(th._id, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, n);
}

export const FORMAT_ORDER: ShowFormat[] = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];

/** Tickets sold per screen format, in fixed format order (colour follows the format, never its rank) */
export function formatMix(list: Booking[]) {
  const counts = new Map<ShowFormat, number>();
  for (const b of list.filter(isPaid)) {
    const f = showOf(b)?.format;
    if (f) counts.set(f, (counts.get(f) ?? 0) + (b.seats?.length ?? 0));
  }
  return FORMAT_ORDER.map(f => ({ key: f, label: f, value: counts.get(f) ?? 0 }));
}

export function statusMix(list: Booking[]) {
  const c = { SUCCESSFUL: 0, IN_PROCESS: 0, CANCELLED: 0, EXPIRED: 0 };
  for (const b of list) c[b.status] = (c[b.status] ?? 0) + 1;
  return c;
}

/** Tickets by show-time slot — when audiences actually go */
export function slotMix(list: Booking[]) {
  const slots = [
    { key: "morning",   label: "Morning",   range: "before 12 PM", value: 0 },
    { key: "afternoon", label: "Afternoon", range: "12–5 PM",      value: 0 },
    { key: "evening",   label: "Evening",   range: "5–9 PM",       value: 0 },
    { key: "night",     label: "Night",     range: "after 9 PM",   value: 0 },
  ];
  for (const b of list.filter(isPaid)) {
    const t = showOf(b)?.showTime;
    if (!t) continue;
    const h = new Date(t).getHours();
    const i = h < 12 ? 0 : h < 17 ? 1 : h < 21 ? 2 : 3;
    slots[i].value += b.seats?.length ?? 0;
  }
  return slots;
}

export function occupancyOf(shows: Show[]) {
  const seats  = shows.reduce((a, s) => a + (s.noOfSeats ?? 0), 0);
  const booked = shows.reduce((a, s) => a + (s.bookedSeats?.length ?? 0), 0);
  return seats ? Math.round((booked / seats) * 100) : 0;
}

export function primeStats(list: Booking[]) {
  const paid  = list.filter(isPaid);
  const prime = paid.filter(b => b.primeApplied);
  return {
    bookings: prime.length,
    share:    paid.length ? Math.round((prime.length / paid.length) * 100) : 0,
    savings:  prime.reduce((a, b) => a + (b.discount ?? 0), 0),
  };
}

// ── Formatting ────────────────────────────────────────────
export function inr(n: number, compact = false): string {
  if (compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export const num = (n: number) =>
  n >= 1e5 ? `${(n / 1e5).toFixed(1).replace(/\.0$/, "")}L` : n >= 1e4 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K` : n.toLocaleString("en-IN");
