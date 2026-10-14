import { STATUS_CODES } from "./constants.js";

// A seat layout describes one auditorium:
//   rows        ordered row letters, first row = closest to the screen ("A", "B", …)
//   cols        seats per row (seat ids are `${row}${col}`, e.g. "H12")
//   aisles      column numbers followed by an aisle gap
//   categories  [{ key, label, price, rows }] — every row belongs to exactly one category
//
// Shows snapshot their screen's layout at creation, so editing a screen later never
// reprices tickets for shows that are already on sale.

export const MAX_ROWS = 26;
export const MAX_COLS = 40;

const badLayout = (err) => ({ err, code: STATUS_CODES.BAD_REQUEST });

export function assertValidLayout(layout) {
    if (!layout) return;
    const { rows, cols, categories } = layout;

    if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS)
        throw badLayout(`A screen needs between 1 and ${MAX_ROWS} rows`);
    if (new Set(rows).size !== rows.length)
        throw badLayout("Row letters must be unique");
    if (!Number.isInteger(cols) || cols < 1 || cols > MAX_COLS)
        throw badLayout(`Seats per row must be between 1 and ${MAX_COLS}`);
    if (!Array.isArray(categories) || categories.length === 0)
        throw badLayout("A screen needs at least one seat category");

    const covered = categories.flatMap((c) => c.rows ?? []);
    if (covered.length !== rows.length || !rows.every((r) => covered.includes(r)))
        throw badLayout("Every row must belong to exactly one seat category");
    if (categories.some((c) => !(c.price > 0)))
        throw badLayout("Every seat category needs a price above ₹0");
    const badSpaces = (layout.accessible ?? []).filter((s) => !isSeatInLayout(layout, s));
    if (badSpaces.length)
        throw badLayout(`Wheelchair spaces must be real seats: ${badSpaces.join(", ")}`);
}

export const seatCount = (layout) => (layout ? layout.rows.length * layout.cols : 0);

export function isSeatInLayout(layout, seat) {
    const match = /^([A-Z])(\d{1,2})$/.exec(seat);
    if (!match) return false;
    const col = Number(match[2]);
    return layout.rows.includes(match[1]) && col >= 1 && col <= layout.cols;
}

export const categoryForSeat = (layout, seat) =>
    layout.categories.find((c) => c.rows.includes(seat.charAt(0))) ?? null;

export const minCategoryPrice = (layout) => Math.min(...layout.categories.map((c) => c.price));

/**
 * Price a set of seats. Shows without a layout keep the original single-price model.
 * Returns { subtotal, lineItems: [{ category, label, price, seats }] }.
 */
export function priceSeats(show, seats) {
    const layout = show.seatLayout;
    if (!layout || !layout.categories?.length) {
        return {
            subtotal: seats.length * show.price,
            lineItems: [{ category: "STANDARD", label: "Standard", price: show.price, seats }],
        };
    }

    const invalid = seats.filter((s) => !isSeatInLayout(layout, s));
    if (invalid.length)
        throw { err: `Seats do not exist in this screen: ${invalid.join(", ")}`, code: STATUS_CODES.BAD_REQUEST };

    const groups = new Map();
    for (const seat of seats) {
        const cat = categoryForSeat(layout, seat);
        const line = groups.get(cat.key) ?? { category: cat.key, label: cat.label, price: cat.price, seats: [] };
        line.seats.push(seat);
        groups.set(cat.key, line);
    }
    const lineItems = [...groups.values()];
    return { subtotal: lineItems.reduce((a, l) => a + l.price * l.seats.length, 0), lineItems };
}

/** Copy a screen's layout for a new show, applying any per-show category prices */
export function snapshotLayout(screen, categoryPrices = {}, adjustPct = 0) {
    const layout = screen.layout;
    const adjust = (p) => (adjustPct ? Math.max(1, Math.round(p * (1 + adjustPct / 100))) : p);
    return {
        rows:   [...layout.rows],
        cols:   layout.cols,
        aisles: [...(layout.aisles ?? [])],
        accessible: [...(layout.accessible ?? [])],
        categories: layout.categories.map((c) => ({
            key:   c.key,
            label: c.label,
            rows:  [...c.rows],
            price: adjust(categoryPrices[c.key] > 0 ? Number(categoryPrices[c.key]) : c.price),
        })),
    };
}
