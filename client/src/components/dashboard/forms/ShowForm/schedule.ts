// Expand a repeat schedule into concrete show times (viewer's local time zone)
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MAX_BULK = 120;

export function buildShowTimes(from: string, to: string, weekdays: number[], times: string[]): Date[] {
  if (!from || !to || !weekdays.length || !times.length) return [];
  const out: Date[] = [];
  const day = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  for (let guard = 0; day <= last && guard < 120; guard++) {
    if (weekdays.includes(day.getDay())) {
      for (const t of [...times].sort()) {
        const [h, m] = t.split(":").map(Number);
        out.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m));
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return out;
}

export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const plusDaysInput = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
