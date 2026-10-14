import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { primeApi } from "../../../api/index.api.ts";
import { useAuth } from "../../../context/AuthContext.tsx";
import { isPrimeMember } from "../../../utils/prime.ts";
import type { PrimePlan } from "../../../types/movie.types.ts";
import "./PrimePass.css";

// Shown until /prime/plan responds — mirrors the server defaults
const FALLBACK_PLAN: PrimePlan = {
  name: "Cineverse Prime Pass", price: 799, listPrice: 1299, periodDays: 30, trialDays: 30, ticketDiscountPct: 15,
  perks: [],
};

export default function PrimePass() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const member   = isPrimeMember(user);
  const [plan, setPlan] = useState<PrimePlan>(FALLBACK_PLAN);

  useEffect(() => {
    let cancelled = false;
    primeApi.getPlan().then(p => { if (!cancelled) setPlan(p); }).catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, []);

  const features = [
    `${plan.ticketDiscountPct}% off every ticket`,
    `First ${plan.trialDays} days free`,
    "Savings tracker",
    "No auto-renewal",
  ];

  return (
    <motion.section className="prime-section theme-dark"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}>

      <div className="prime-glow-r" />
      <div className="prime-glow-l" />
      <div className="prime-line" />

      <div className="prime-inner">
        <div>
          <p className="prime-eyebrow">✦ Exclusive Membership</p>
          <h3 className="prime-title">
            CINEVERSE<br />
            <span className="prime-accent">PRIME</span> PASS
          </h3>
          <p className="prime-desc">
            {member
              ? "You're a Prime member — your discount is applied automatically on every booking."
              : `Save ${plan.ticketDiscountPct}% on every ticket you book, with the discount applied automatically at checkout. Your first month is on us.`}
          </p>
          <div className="prime-features">
            {features.map(f => (
              <span key={f} className="prime-feature"><span className="prime-check">✓</span>{f}</span>
            ))}
          </div>
        </div>

        <div className="prime-price-box">
          {member ? (
            <>
              <div className="prime-member-badge">✦ Active Member</div>
              {user?.primeExpiresAt && (
                <div className="prime-period">
                  Valid till {new Date(user.primeExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
              <motion.button className="btn-prime"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/prime")}>
                Manage Prime Pass →
              </motion.button>
            </>
          ) : (
            <>
              <div className="prime-was">₹{plan.listPrice.toLocaleString("en-IN")} / month</div>
              <div className="prime-price">₹<span className="prime-accent">{plan.price}</span></div>
              <div className="prime-period">per {plan.periodDays} days · no auto-renewal</div>
              <motion.button className="btn-prime"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/prime")}>
                Get Prime Pass →
              </motion.button>
              <p className="prime-note">First {plan.trialDays} days free for new members</p>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
