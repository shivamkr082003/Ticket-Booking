import { motion } from "framer-motion";
import "./AppDownload.css";

// No native app has shipped yet — the store buttons say so instead of doing nothing
const STORES = [
  { label: "App Store",   sub: "iOS",     icon: "📱" },
  { label: "Google Play", sub: "Android", icon: "▶" },
];

export default function AppDownload() {
  return (
    <motion.section className="app-section"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}>

      <div className="app-glow" />

      <div>
        <p className="app-eyebrow">Take It With You</p>
        <h3 className="app-title">CINEVERSE ON MOBILE</h3>
        <p className="app-desc">
          Cineverse already works beautifully in your phone's browser — real-time seats, Stripe checkout and QR tickets included.
          Native iOS and Android apps are on the way.
        </p>
      </div>

      <div className="app-btns">
        {STORES.map(btn => (
          <div key={btn.label} className="btn-store" aria-disabled="true">
            <span className="btn-store-icon" aria-hidden="true">{btn.icon}</span>
            <span>
              <span className="btn-store-sub">{btn.sub} · Coming soon</span>
              <span className="btn-store-name">{btn.label}</span>
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
