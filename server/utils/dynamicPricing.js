// Theatre pricing rules → % adjustments for one show. Evaluated in India time,
// so "morning" and "weekend" match what the audience sees on the ticket.
const TZ = "Asia/Kolkata";

const istParts = (date) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ, weekday: "short", hour: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(date)).map((x) => [x.type, x.value]));
    return { weekday: p.weekday, hour: Number(p.hour), day: `${p.year}-${p.month}-${p.day}` };
};

/** [{ label, pct }] that apply to a show at `showTime` */
export function priceAdjustmentsFor(showTime, rules, releaseDate) {
    if (!rules) return [];
    const { weekday, hour, day } = istParts(showTime);
    const out = [];
    if (rules.weekendPct && (weekday === "Sat" || weekday === "Sun")) out.push({ label: "Weekend", pct: rules.weekendPct });
    if (rules.morningPct && hour < 12) out.push({ label: "Morning show", pct: rules.morningPct });
    if (rules.primeTimePct && hour >= 18 && hour < 22) out.push({ label: "Prime time", pct: rules.primeTimePct });
    if (rules.openingDayPct && releaseDate && istParts(releaseDate).day === day) out.push({ label: "Opening day", pct: rules.openingDayPct });
    return out;
}

export const totalPct = (adjustments) =>
    Math.max(-50, Math.min(100, adjustments.reduce((a, x) => a + x.pct, 0)));

export const applyPct = (price, pct) => (pct ? Math.max(1, Math.round(price * (1 + pct / 100))) : price);
