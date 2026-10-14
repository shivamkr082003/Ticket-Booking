// "Add to calendar" for a ticket — Google Calendar link + a standard .ics file (Apple / Outlook)
export interface CalendarEvent {
  title:    string;
  start:    Date;
  minutes:  number;
  location: string;
  details:  string;
  uid:      string;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const end   = (e: CalendarEvent) => new Date(e.start.getTime() + e.minutes * 60_000);

export function googleCalendarUrl(e: CalendarEvent) {
  const p = new URLSearchParams({
    action:   "TEMPLATE",
    text:     e.title,
    dates:    `${stamp(e.start)}/${stamp(end(e))}`,
    location: e.location,
    details:  e.details,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

// RFC 5545: escape commas/semicolons/newlines in text values
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

export function downloadIcs(e: CalendarEvent) {
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cineverse//Tickets//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@cineverse`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end(e))}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.details)}`,
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `cineverse-${e.uid}.ics` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
