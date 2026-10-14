import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { statsApi } from "../../../api/index.api.ts";
import type { PlatformStats } from "../../../types/movie.types.ts";
import "./StatsStrip.css";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  : n >= 10_000  ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  : n.toLocaleString("en-IN");

function CountUp({ value, format, active }: { value: number; format: (n: number) => string; active: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    const controls = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [value, active]);
  return <>{format(shown)}</>;
}

export default function StatsStrip() {
  const [stats,  setStats]  = useState<PlatformStats | null>(null);
  const [failed, setFailed] = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    let cancelled = false;
    statsApi.get()
      .then(s => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setFailed(true); }); // strip is decorative — hide on failure
    return () => { cancelled = true; };
  }, []);

  if (failed) return null;

  const items = stats ? [
    { value: stats.ticketsSold, label: "Tickets Booked",    format: (n: number) => compact(Math.round(n)) },
    { value: stats.screens,     label: "Screens Live",      format: (n: number) => compact(Math.round(n)) },
    { value: stats.cities,      label: stats.cities === 1 ? "City" : "Cities", format: (n: number) => String(Math.round(n)) },
    { value: stats.avgRating,   label: stats.reviews ? `Audience Rating · ${compact(stats.reviews)} reviews` : "Audience Rating",
      format: (n: number) => (stats.reviews ? `${n.toFixed(1)}★` : "—") },
  ] : [];

  // One stable element carries the ref so useInView keeps observing it after data arrives
  return (
    <div ref={ref} className={`stats-strip ${stats ? "" : "stats-strip--placeholder"}`}>
      {items.map((s, i) => (
        <motion.div key={s.label} className="stat-item"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}>
          <div className="stat-value"><CountUp value={s.value} format={s.format} active={inView} /></div>
          <div className="stat-label">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
