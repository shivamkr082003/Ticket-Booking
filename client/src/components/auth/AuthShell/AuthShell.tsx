import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { statsApi } from "../../../api/index.api.ts";
import type { PlatformStats } from "../../../types/movie.types.ts";
import ThemeToggle from "../../common/ThemeToggle/ThemeToggle.tsx";
import "./AuthShell.css";

type Variant = "login" | "signup" | "verify" | "reset";

const COPY: Record<Variant, { kicker: string; title: ReactNode; sub: string }> = {
  login:  { kicker: "Welcome back", title: <>Your seat is<br />waiting.</>, sub: "Tickets, watchlist and wallet — right where you left them." },
  signup: { kicker: "Join Cineverse", title: <>Movies, made<br />effortless.</>, sub: "Real seat maps, snacks before you arrive and refunds that don't make you wait." },
  verify: { kicker: "Almost there", title: <>One last<br />step.</>, sub: "Confirm your email and the best seats in the house are yours to pick." },
  reset:  { kicker: "Account security", title: <>Keep it<br />locked tight.</>, sub: "A strong password keeps your tickets, wallet and gift cards safe." },
};

const PERKS = [
  { icon: "💺", title: "Pick the exact seat",  text: "Live seat maps with Recliner, Premium & IMAX screens" },
  { icon: "🍿", title: "Skip the snack queue", text: "Pre-book food and collect it with your ticket" },
  { icon: "↩",  title: "Refunds in seconds",  text: "Cancel and get money back to your wallet instantly" },
  { icon: "✦",  title: "Prime Pass",          text: "15% off every ticket and zero booking fee" },
];

// Photos rotate behind the showcase copy
const PHOTOS = ["auditorium-3", "recliners", "imax", "lounge", "auditorium-6"].map(n => `/images/cinema/${n}.jpg`);

const compact = (n: number) =>
  n >= 1e5 ? `${(n / 1e5).toFixed(1).replace(/\.0$/, "")}L+` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K+` : String(n);

/** Two-panel frame for the auth screens: cinematic showcase on the left, the form on the right */
export default function AuthShell({ variant, children }: { variant: Variant; children: ReactNode }) {
  const copy = COPY[variant];
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    let cancelled = false;
    statsApi.get().then(s => { if (!cancelled) setStats(s); }).catch(() => {});
    const t = window.setInterval(() => setPhoto(p => (p + 1) % PHOTOS.length), 6000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, []);

  const statItems = stats ? [
    stats.ticketsSold > 0 && { v: compact(stats.ticketsSold), l: "Tickets booked" },
    stats.theatres > 0    && { v: String(stats.theatres),      l: stats.theatres === 1 ? "Cinema" : "Cinemas" },
    stats.screens > 0     && { v: String(stats.screens),       l: "Screens" },
    stats.avgRating > 0   && { v: `★ ${(stats.avgRating / 2).toFixed(1)}`, l: "Audience rating" },
  ].filter(Boolean).slice(0, 3) as { v: string; l: string }[] : [];

  return (
    <div className={`as as--${variant}`}>
      <aside className="as-showcase theme-dark" aria-hidden={false}>
        {PHOTOS.map((src, i) => (
          <div key={src} className={`as-photo ${i === photo ? "is-on" : ""}`} style={{ backgroundImage: `url(${src})` }} />
        ))}
        <div className="as-shade" />

        <div className="as-showcase-inner">
          <Link to="/" className="as-logo">
            <span className="as-logo-icon">🎬</span>
            <span className="as-logo-text">CINEVERSE</span>
          </Link>

          <div className="as-hero">
            <p className="as-kicker">{copy.kicker}</p>
            <h2 className="as-title">{copy.title}</h2>
            <p className="as-sub">{copy.sub}</p>
          </div>

          <ul className="as-perks">
            {PERKS.map(p => (
              <li key={p.title}>
                <span className="as-perk-icon" aria-hidden="true">{p.icon}</span>
                <span><b>{p.title}</b><small>{p.text}</small></span>
              </li>
            ))}
          </ul>

          {statItems.length > 0 && (
            <div className="as-stats">
              {statItems.map(s => <div key={s.l}><strong>{s.v}</strong><span>{s.l}</span></div>)}
            </div>
          )}
        </div>
      </aside>

      <main className="as-main">
        <div className="as-main-top">
          <Link to="/" className="as-back">← Back to movies</Link>
          <ThemeToggle />
        </div>
        <div className="as-form-wrap">{children}</div>
        <p className="as-legal">
          By continuing you agree to our <Link to="/legal/terms">Terms</Link> and <Link to="/legal/privacy">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
