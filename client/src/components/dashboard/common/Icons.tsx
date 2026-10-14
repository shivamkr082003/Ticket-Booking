// Minimal 24px line icons for the dashboard — stroke follows currentColor
const PATHS: Record<string, string> = {
  overview:  "M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-3H4z",
  users:     "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 3.65a3.5 3.5 0 0 1 0 6.7",
  movies:    "M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 7l2.5-3.5h13L17 7M9.5 3.5 7 7M15 3.5 12.5 7",
  theatres:  "M3 20h18M5 20V9l7-5 7 5v11M9 20v-5h6v5M9 11h.01M15 11h.01",
  shows:     "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4M8 14h3M8 17h6",
  bookings:  "M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V4H4zM14 4v2M14 10v2M14 16v-1",
  analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  profile:   "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  revenue:   "M7 5h10M7 9h10M7 5c4 0 6 1.5 6 4s-2 4-6 4l7 6",
  tickets:   "M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V4H4zM14 4v2M14 10v2M14 16v-1",
  seat:      "M6 11V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5M4 11h16v4H4zM6 15v5M18 15v5",
  crown:     "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z",
  plus:      "M12 5v14M5 12h14",
  clock:     "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  pin:       "M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  star:      "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9 6.75 19.6l1-5.8L3.5 9.7l5.9-.9z",
  alert:     "M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0",
  offers:    "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8M7.5 7.5h.01",
  support:   "M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12M8.5 12h.01M12 12h.01M15.5 12h.01",
  activity:  "M3 12h4l3-8 4 16 3-8h4",
  scan:      "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10",
};

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
