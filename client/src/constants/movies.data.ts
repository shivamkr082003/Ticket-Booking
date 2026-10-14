import type { ShowFormat } from "../types/movie.types.ts";

// ── TICKER ────────────────────────────────────────────────
export const TICKER_ITEMS = [
  "🎬 NOW BOOKING — Live on Cineverse",
  "⭐ REAL-TIME SEAT SELECTION",
  "🎟 INSTANT TICKET CONFIRMATION",
  "💳 SECURE STRIPE PAYMENT",
  "📧 BOOKING CONFIRMATION ON EMAIL",
  "✦ PRIME MEMBERS SAVE ON EVERY TICKET",
  "🏛 THEATRES ACROSS INDIA",
];

// ── SHOW FORMATS ──────────────────────────────────────────
export const SHOW_FORMATS: ShowFormat[] = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];
export const PREMIUM_FORMATS = new Set<ShowFormat>(["IMAX", "4DX", "Dolby Atmos"]);

// ── FOOTER ────────────────────────────────────────────────
export const FOOTER_COLS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "Now Showing",     to: "/movies" },
      { label: "Top Rated",       to: "/movies?sort=rating" },
      { label: "Latest Releases", to: "/movies?sort=date" },
      { label: "Action",          to: "/movies?genre=Action" },
      { label: "Comedy",          to: "/movies?genre=Comedy" },
    ],
  },
  {
    title: "Cinemas",
    links: [
      { label: "All Theatres",    to: "/theatres" },
      { label: "IMAX Locations",  to: "/theatres?format=IMAX" },
      { label: "4DX Screens",     to: "/theatres?format=4DX" },
      { label: "Dolby Atmos",     to: "/theatres?format=Dolby%20Atmos" },
      { label: "3D Screens",      to: "/theatres?format=3D" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My Bookings",     to: "/my-bookings" },
      { label: "Watchlist",       to: "/watchlist" },
      { label: "Wallet & Gift Cards", to: "/wallet" },
      { label: "Prime Pass",      to: "/prime" },
      { label: "My Profile",      to: "/profile" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Help & Support",  to: "/help" },
      { label: "Refund Policy",   to: "/legal/refunds" },
      { label: "Terms of Use",    to: "/legal/terms" },
      { label: "Privacy Policy",  to: "/legal/privacy" },
    ],
  },
];
