import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

/* ── STARS ── */
interface StarsProps {
  /** Value out of 10 (from your model) */
  ratingOutOf10: number;
  size?: number;
}
export function Stars({ ratingOutOf10, size = 13 }: StarsProps) {
  const filled = Math.round(ratingOutOf10 / 2);
  return (
    <span style={{ fontSize: size }}>
      <span className="stars-amber">{"★".repeat(filled)}</span>
      <span className="stars-dim">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

/* ── STARS (string rating, e.g. "9.1") ── */
export function StarsFive({ n }: { n: number }) {
  return (
    <span>
      <span className="stars-amber">{"★".repeat(n)}</span>
      <span className="stars-dim">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/* ── SECTION HEADER ── */
interface SectionHeaderProps {
  eyebrow: string;
  title:   string;
  cta?:    string;
  ctaHref?: string;
}
export function SectionHeader({ eyebrow, title, cta, ctaHref = "#" }: SectionHeaderProps) {
  return (
    <motion.div
      className="sec-head"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <p className="sec-eyebrow">{eyebrow}</p>
        <h2 className="sec-title">{title}</h2>
      </div>
      {cta && <Link to={ctaHref} className="sec-cta">{cta} →</Link>}
    </motion.div>
  );
}

/* ── TICKER BAR ── */
interface TickerBarProps { items: string[]; }
export function TickerBar({ items }: TickerBarProps) {
  return (
    <div className="ticker-bar" aria-hidden="true">
      <div className="anim-ticker" style={{ display: "flex", whiteSpace: "nowrap" }}>
        {[0, 1].map(ri => (
          <div key={ri} style={{ display: "flex" }}>
            {items.map((t, i) => (
              <span key={i} className="ticker-text">{t}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── TOAST ── */
interface ToastProps { message: string; onDone: () => void; }
export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="toast"
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <span className="toast-icon">✓</span>
      <span className="toast-text">{message}</span>
    </motion.div>
  );
}
