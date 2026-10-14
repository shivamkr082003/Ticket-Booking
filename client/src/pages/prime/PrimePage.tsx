import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import AppNavbar   from "../../components/common/Navbar/Navbar.tsx";
import PaymentForm from "../../components/booking/PaymentForm/PaymentForm.tsx";
import { showToast } from "../../components/common/Toast/toast.ts";
import { primeApi } from "../../api/index.api.ts";
import { useAuth }  from "../../context/AuthContext.tsx";
import { stripeAppearance } from "../../utils/stripeAppearance.ts";
import type { PrimeMembership, PrimePlan } from "../../types/movie.types.ts";
import "./PrimePage.css";

const STRIPE_KEY    = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

const daysLeft = (d: string | null) =>
  d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)) : 0;

export default function PrimePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [plan,         setPlan]         = useState<PrimePlan | null>(null);
  const [membership,   setMembership]   = useState<PrimeMembership | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [subscribing,  setSubscribing]  = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Keep the stored user (navbar badge, checkout preview) in sync with the server
  const syncUser = useCallback((m: PrimeMembership) => {
    if (!user) return;
    if (user.isPrime === m.active && user.primeExpiresAt === m.expiresAt) return;
    updateUser({ ...user, isPrime: m.active, primeExpiresAt: m.expiresAt });
  }, [user, updateUser]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      primeApi.getPlan(),
      user ? primeApi.getMine() : Promise.reject(new Error("guest")),
    ]).then(([p, m]) => {
      if (cancelled) return;
      if (p.status === "fulfilled") setPlan(p.value);
      if (m.status === "fulfilled") { setMembership(m.value); syncUser(m.value); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Load once per login — syncUser changes identity whenever the user object updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSubscribe = async () => {
    if (!user) { navigate("/login"); return; }
    setSubscribing(true);
    try {
      const res = await primeApi.subscribe();
      if (res.activated) {
        setMembership(res.membership);
        syncUser(res.membership);
        showToast(`✦ Welcome to Prime! Your free ${plan?.trialDays ?? 30} days have started.`);
      } else {
        setClientSecret(res.clientSecret);
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Could not start your Prime Pass", "error");
    } finally {
      setSubscribing(false);
    }
  };

  const handlePaid = async (paymentIntentId: string) => {
    try {
      const m = await primeApi.confirm(paymentIntentId);
      setMembership(m);
      syncUser(m);
      setClientSecret(null);
      showToast(`✦ Prime Pass active until ${fmtDate(m.expiresAt)}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Payment received but activation failed — please contact support", "error");
    }
  };

  // The plan card is a .theme-dark island, so Stripe always renders dark here
  const stripeOptions = useMemo(
    () => (clientSecret ? { clientSecret, appearance: stripeAppearance("dark") } : null),
    [clientSecret],
  );

  const active = membership?.active ?? false;
  const trial  = !user || (membership?.trialAvailable ?? true);
  const p      = plan;

  const ctaLabel = !user
    ? "Sign in to start"
    : active
      ? `Extend ${p?.periodDays ?? 30} days · ₹${p?.price ?? 799}`
      : trial
        ? `Start ${p?.trialDays ?? 30}-day free trial`
        : `Get Prime · ₹${p?.price ?? 799}`;

  return (
    <div className="page-wrapper prime-page">
      <div className="grain" />
      <AppNavbar />

      {/* Hero */}
      <section className="pr-hero theme-dark">
        <div className="pr-hero-glow" />
        <div className="container pr-hero-inner">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="pr-eyebrow">✦ Cineverse Membership</p>
            <h1 className="pr-title">PRIME <span>PASS</span></h1>
            <p className="pr-lede">
              {p ? `${p.ticketDiscountPct}% off every ticket, applied automatically at checkout.` : "Save on every ticket, automatically."}
              {" "}Start with a free month — no card needed, no auto-renewal.
            </p>
          </motion.div>

          {/* Plan card */}
          <motion.div className="pr-plan"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            {loading ? (
              <div className="pr-plan-loading"><div className="spinner" /></div>
            ) : (
              <>
                {active && <div className="pr-active-pill">✦ Active member</div>}
                <div className="pr-price-row">
                  <span className="pr-price">₹{p?.price ?? 799}</span>
                  <span className="pr-price-meta">
                    <s>₹{(p?.listPrice ?? 1299).toLocaleString("en-IN")}</s>
                    per {p?.periodDays ?? 30} days
                  </span>
                </div>

                <ul className="pr-perks">
                  {(p?.perks ?? []).map(perk => (
                    <li key={perk}><span className="pr-check">✓</span>{perk}</li>
                  ))}
                </ul>

                <AnimatePresence mode="wait">
                  {stripeOptions && stripePromise ? (
                    <motion.div key="pay" className="pr-pay"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <Elements stripe={stripePromise} options={stripeOptions}>
                        <PaymentForm
                          totalAmount={p?.price ?? 799}
                          onSuccess={handlePaid}
                          onError={msg => showToast(msg, "error")}
                        />
                      </Elements>
                      <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 10 }}
                        onClick={() => setClientSecret(null)}>
                        Cancel
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button className="pr-cta" onClick={handleSubscribe} disabled={subscribing}>
                        {subscribing
                          ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                          : `${ctaLabel} →`}
                      </button>
                      {clientSecret && !stripePromise && (
                        <p className="pr-fine">Payments are not configured (VITE_STRIPE_PUBLISHABLE_KEY missing).</p>
                      )}
                      <p className="pr-fine">
                        {active
                          ? "Renewing adds a full period after your current expiry — you never lose days."
                          : trial
                            ? "Free for your first month. Renew only if you love it."
                            : "Secure one-time payment via Stripe. No auto-renewal."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Membership dashboard */}
      {user && membership && (membership.active || membership.since) && (
        <section className="container pr-section">
          <p className="sec-eyebrow">Your Membership</p>
          <div className="pr-stats">
            <div className="pr-stat">
              <p className="pr-stat-label">Status</p>
              <p className={`pr-stat-value ${membership.active ? "is-active" : "is-expired"}`}>
                {membership.active ? "Active" : "Expired"}
              </p>
              <p className="pr-stat-sub">
                {membership.active ? `${daysLeft(membership.expiresAt)} days left` : `Ended ${fmtDate(membership.expiresAt)}`}
              </p>
            </div>
            <div className="pr-stat">
              <p className="pr-stat-label">Valid Until</p>
              <p className="pr-stat-value">{fmtDate(membership.expiresAt)}</p>
              <p className="pr-stat-sub">Member since {fmtDate(membership.since)}</p>
            </div>
            <div className="pr-stat">
              <p className="pr-stat-label">Total Saved</p>
              <p className="pr-stat-value pr-gold">₹{membership.totalSaved.toLocaleString("en-IN")}</p>
              <p className="pr-stat-sub">across {membership.discountedBookings} booking{membership.discountedBookings === 1 ? "" : "s"}</p>
            </div>
          </div>
          {membership.active && (
            <div className="pr-cta-row">
              <button className="btn btn-primary" onClick={() => navigate("/movies")}>🎟 Book with Prime</button>
              <button className="btn btn-ghost" onClick={() => navigate("/my-bookings")}>My Bookings</button>
            </div>
          )}
        </section>
      )}

      {/* How it works */}
      <section className="container pr-section">
        <p className="sec-eyebrow">How It Works</p>
        <h2 className="sec-title" style={{ marginBottom: 28 }}>THREE STEPS TO SAVING</h2>
        <div className="pr-steps">
          {[
            { n: "01", t: "Activate", d: `Start your free ${p?.trialDays ?? 30}-day trial in one tap — no card required.` },
            { n: "02", t: "Book as usual", d: `Pick any show. ${p?.ticketDiscountPct ?? 15}% comes off automatically before you pay.` },
            { n: "03", t: "Watch your savings", d: "Every discounted booking adds to your running total right here." },
          ].map(s => (
            <div key={s.n} className="pr-step">
              <span className="pr-step-num">{s.n}</span>
              <p className="pr-step-title">{s.t}</p>
              <p className="pr-step-desc">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
