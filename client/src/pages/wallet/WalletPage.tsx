import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import AppNavbar from "../../components/common/Navbar/Navbar.tsx";
import PaymentForm from "../../components/booking/PaymentForm/PaymentForm.tsx";
import { showToast } from "../../components/common/Toast/toast.ts";
import { giftCardsApi, walletApi } from "../../api/index.api.ts";
import { useTheme } from "../../context/ThemeContext.tsx";
import { stripeAppearance } from "../../utils/stripeAppearance.ts";
import { timeAgo } from "../../components/common/NotificationBell/timeAgo.ts";
import type { GiftCard, WalletTxn } from "../../types/movie.types.ts";
import "./WalletPage.css";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const AMOUNTS = [500, 1000, 2000, 5000];
const REASON: Record<WalletTxn["reason"], string> = {
  REFUND: "Cancellation refund", GIFT_CARD: "Gift card redeemed", BOOKING: "Booking", BOOKING_RELEASED: "Booking not completed",
};

export default function WalletPage() {
  const { theme } = useTheme();
  const [balance, setBalance] = useState<number | null>(null);
  const [txns,    setTxns]    = useState<WalletTxn[]>([]);
  const [cards,   setCards]   = useState<GiftCard[]>([]);
  const [code,    setCode]    = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Gift card purchase
  const [amount,  setAmount]  = useState(1000);
  const [toName,  setToName]  = useState("");
  const [toEmail, setToEmail] = useState("");
  const [note,    setNote]    = useState("");
  const [checkout, setCheckout] = useState<{ giftCardId: string; clientSecret: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [justBought, setJustBought] = useState<GiftCard | null>(null);

  const load = useCallback(() => {
    walletApi.get().then(w => { setBalance(w.balance); setTxns(w.transactions); }).catch(() => setBalance(0));
    giftCardsApi.mine().then(setCards).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeeming(true);
    try {
      const r = await walletApi.redeem(code);
      showToast(`₹${r.amount} added to your wallet 🎉`);
      setCode(""); load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Couldn't redeem that code", "error");
    } finally { setRedeeming(false); }
  };

  const startPurchase = async () => {
    if (!(amount >= 100 && amount <= 10000)) { showToast("Gift cards are ₹100–₹10,000", "error"); return; }
    if (toEmail && !/^\S+@\S+\.\S+$/.test(toEmail)) { showToast("Enter a valid email for the recipient", "error"); return; }
    setStarting(true);
    try {
      const r = await giftCardsApi.purchase({ amount, recipientName: toName.trim(), recipientEmail: toEmail.trim(), message: note.trim() });
      setCheckout({ giftCardId: r.giftCardId, clientSecret: r.clientSecret });
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Couldn't start the payment", "error");
    } finally { setStarting(false); }
  };

  const onPaid = async (paymentIntentId: string) => {
    if (!checkout) return;
    try {
      const card = await giftCardsApi.confirm(checkout.giftCardId, paymentIntentId);
      setJustBought(card); setCheckout(null); setToName(""); setToEmail(""); setNote("");
      showToast(card.recipientEmail ? `Gift card sent to ${card.recipientEmail}` : "Gift card ready — share the code!");
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Payment went through but we couldn't issue the card — contact support", "error");
    }
  };

  const options = useMemo(() => (checkout ? { clientSecret: checkout.clientSecret, appearance: stripeAppearance(theme) } : null), [checkout, theme]);

  const copy = (c: string) => navigator.clipboard?.writeText(c).then(() => showToast("Code copied")).catch(() => {});

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />
      <div className="container wp">
        <section className="wp-hero theme-dark">
          <div>
            <p className="wp-eyebrow">Cineverse wallet</p>
            <p className="wp-balance">₹{balance === null ? "—" : balance.toLocaleString("en-IN")}</p>
            <p className="wp-sub">Spend it on tickets and snacks at checkout. Refunds to your wallet arrive instantly.</p>
          </div>
          <form className="wp-redeem" onSubmit={redeem}>
            <label htmlFor="wp-code">Have a gift card?</label>
            <div>
              <input id="wp-code" className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="CVGC-XXXX-XXXX-XXXX" maxLength={24} autoComplete="off" />
              <button className="btn btn-primary" disabled={redeeming || code.trim().length < 8}>{redeeming ? "Redeeming…" : "Redeem"}</button>
            </div>
          </form>
        </section>

        <div className="wp-grid">
          <section className="wp-card">
            <h2 className="wp-title">🎁 Gift a movie night</h2>
            {justBought?.code ? (
              <div className="wp-bought">
                <p>₹{justBought.amount} gift card {justBought.recipientEmail ? `emailed to ${justBought.recipientEmail}` : "is ready"}</p>
                <button className="wp-code" onClick={() => copy(justBought.code!)} title="Copy code">{justBought.code} <span>⧉</span></button>
                <button className="btn btn-ghost btn-sm" onClick={() => setJustBought(null)}>Buy another</button>
              </div>
            ) : checkout && options && stripePromise ? (
              <>
                <p className="wp-paying">Paying ₹{amount.toLocaleString("en-IN")}{toName ? ` for ${toName}` : ""} · <button className="tv-link" onClick={() => setCheckout(null)}>change</button></p>
                <Elements stripe={stripePromise} options={options}>
                  <PaymentForm totalAmount={amount} onSuccess={onPaid} onError={m => showToast(m, "error")} />
                </Elements>
              </>
            ) : (
              <>
                <div className="wp-amounts" role="radiogroup" aria-label="Gift card amount">
                  {AMOUNTS.map(a => (
                    <button key={a} type="button" role="radio" aria-checked={amount === a} className={amount === a ? "active" : ""} onClick={() => setAmount(a)}>₹{a.toLocaleString("en-IN")}</button>
                  ))}
                  <input className="form-input" type="number" min={100} max={10000} step={50} value={amount}
                    onChange={e => setAmount(Math.round(Number(e.target.value) || 0))} aria-label="Custom amount" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Recipient name</label>
                    <input className="form-input" value={toName} maxLength={60} onChange={e => setToName(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recipient email</label>
                    <input className="form-input" type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="We'll email them the code" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <input className="form-input" value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="Happy birthday! Popcorn's on me 🍿" />
                </div>
                <button className="btn btn-primary" onClick={startPurchase} disabled={starting || !stripePromise}>
                  {starting ? "Starting…" : `Buy ₹${amount.toLocaleString("en-IN")} gift card`}
                </button>
                {!stripePromise && <p className="wp-muted">Payments aren't configured on this site.</p>}
                <p className="wp-muted">Valid for 12 months. Leave the email blank to share the code yourself.</p>
              </>
            )}

            {cards.length > 0 && (
              <div className="wp-cards">
                <p className="wp-sub-title">Gift cards you bought</p>
                {cards.map(c => (
                  <div key={c._id} className="wp-gc">
                    <span className="wp-gc-amt">₹{c.amount}</span>
                    <span className="wp-gc-who">{c.recipientName || c.recipientEmail || "Unassigned"}<small>{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></span>
                    {c.status === "REDEEMED"
                      ? <span className="badge badge-gray">Redeemed</span>
                      : <button className="wp-code wp-code--sm" onClick={() => c.code && copy(c.code)}>{c.code} <span>⧉</span></button>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="wp-card">
            <h2 className="wp-title">Activity</h2>
            {txns.length === 0 ? (
              <p className="wp-muted">No wallet activity yet. Choose “Refund to wallet” when cancelling, or redeem a gift card, to add money. <Link to="/movies">Browse movies →</Link></p>
            ) : (
              <ul className="wp-txns">
                {txns.map(t => (
                  <li key={t._id}>
                    <span className={`wp-txn-icon ${t.type === "CREDIT" ? "in" : "out"}`} aria-hidden="true">{t.type === "CREDIT" ? "↓" : "↑"}</span>
                    <span className="wp-txn-text">
                      <b>{REASON[t.reason]}</b>
                      <small>{t.note ? `${t.note} · ` : ""}{timeAgo(t.createdAt)}</small>
                    </span>
                    <span className={`wp-txn-amt ${t.type === "CREDIT" ? "in" : "out"}`}>{t.type === "CREDIT" ? "+" : "−"}₹{t.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
