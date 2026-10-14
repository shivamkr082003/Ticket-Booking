import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppNavbar from "../../components/common/Navbar/Navbar.tsx";
import { showToast } from "../../components/common/Toast/toast.ts";
import { bookingsApi, supportApi } from "../../api/index.api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { timeAgo } from "../../components/common/NotificationBell/timeAgo.ts";
import type { Booking, Movie, Show, SupportCategory, SupportTicket } from "../../types/movie.types.ts";
import { FAQ } from "./faq.ts";
import "./HelpPage.css";

const CATEGORIES: { key: SupportCategory; label: string }[] = [
  { key: "PAYMENT", label: "Payment" }, { key: "REFUND", label: "Refund" }, { key: "ENTRY", label: "Entry / ticket" },
  { key: "SHOW", label: "Show or cinema" }, { key: "FOOD", label: "Food & drinks" }, { key: "ACCOUNT", label: "Account" }, { key: "OTHER", label: "Something else" },
];
const STATUS_LABEL = { OPEN: "Open", IN_PROGRESS: "In progress", RESOLVED: "Resolved" } as const;

const bookingLabel = (b: Booking) => {
  const s = b.showId as Show | undefined;
  const m = s && typeof s.movieId === "object" ? (s.movieId as Movie).name : "Booking";
  const d = s?.showTime ? new Date(s.showTime).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
  return `${m}${d ? ` · ${d}` : ""} · ${b.seats.join(", ")}${b.ticketCode ? ` · ${b.ticketCode}` : ""}`;
};

export default function HelpPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [open,     setOpen]     = useState<number | null>(0);
  const [query,    setQuery]    = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets,  setTickets]  = useState<SupportTicket[]>([]);
  const [form, setForm] = useState({ category: "OTHER" as SupportCategory, bookingId: params.get("booking") ?? "", subject: "", message: "" });
  const [sending,  setSending]  = useState(false);
  const [followUp, setFollowUp] = useState<Record<string, string>>({});

  const loadTickets = useCallback(() => { supportApi.mine().then(setTickets).catch(() => {}); }, []);
  useEffect(() => {
    if (!user) return;
    loadTickets();
    bookingsApi.getMyBookings().then(setBookings).catch(() => {});
  }, [user, loadTickets]);

  const faq = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? FAQ.filter(f => `${f.q} ${f.a} ${f.topic}`.toLowerCase().includes(q)) : FAQ;
  }, [query]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await supportApi.create({ ...form, bookingId: form.bookingId || undefined });
      showToast("Got it — we'll reply here and in your notifications");
      setForm(f => ({ ...f, subject: "", message: "" }));
      loadTickets();
      document.getElementById("my-requests")?.scrollIntoView({ behavior: "smooth" });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Couldn't send your request", "error");
    } finally { setSending(false); }
  };

  const sendFollowUp = async (id: string) => {
    const message = followUp[id]?.trim();
    if (!message) return;
    try { await supportApi.reply(id, { message }); setFollowUp(f => ({ ...f, [id]: "" })); loadTickets(); }
    catch (err: unknown) { showToast(err instanceof Error ? err.message : "Couldn't send", "error"); }
  };

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />
      <div className="container hp">
        <header className="hp-head">
          <p className="hp-eyebrow">Help centre</p>
          <h1 className="hp-title">HOW CAN WE HELP?</h1>
          <input className="form-input hp-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search refunds, tickets, wallet…" aria-label="Search help" />
        </header>

        <div className="hp-grid">
          <section aria-label="Frequently asked questions">
            <div className="hp-faq">
              {faq.length === 0 && <p className="hp-muted">No answers match “{query}”. Send us a request instead →</p>}
              {faq.map((f, i) => (
                <div key={f.q} className={`hp-q ${open === i ? "is-open" : ""}`}>
                  <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                    <span className="hp-topic">{f.topic}</span>
                    <span className="hp-q-text">{f.q}</span>
                    <span className="hp-chev" aria-hidden="true">{open === i ? "−" : "+"}</span>
                  </button>
                  {open === i && <p className="hp-a">{f.a}</p>}
                </div>
              ))}
            </div>
            <p className="hp-legal">Policies: <Link to="/legal/refunds">Refunds</Link> · <Link to="/legal/terms">Terms</Link> · <Link to="/legal/privacy">Privacy</Link></p>
          </section>

          <section className="hp-card hp-contact" aria-label="Contact support">
            <h2 className="hp-card-title">Still stuck? Talk to us</h2>
            {!user ? (
              <p className="hp-muted"><Link to="/login">Sign in</Link> to raise a request — we'll link it to your booking and reply in the app.</p>
            ) : (
              <form onSubmit={submit} className="hp-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Topic</label>
                    <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as SupportCategory }))}>
                      {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Booking (optional)</label>
                    <select className="form-input" value={form.bookingId} onChange={e => setForm(f => ({ ...f, bookingId: e.target.value }))}>
                      <option value="">Not about a booking</option>
                      {bookings.slice(0, 20).map(b => <option key={b._id} value={b._id}>{bookingLabel(b)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-input" required minLength={4} maxLength={120} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Charged twice for one booking" />
                </div>
                <div className="form-group">
                  <label className="form-label">What happened?</label>
                  <textarea className="form-input" required minLength={10} maxLength={2000} rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                <button className="btn btn-primary" disabled={sending}>{sending ? "Sending…" : "Send request"}</button>
                <p className="hp-muted">We usually reply within a few hours.</p>
              </form>
            )}
          </section>
        </div>

        {user && tickets.length > 0 && (
          <section id="my-requests" className="hp-requests">
            <h2 className="hp-card-title">Your requests</h2>
            {tickets.map(t => (
              <article key={t._id} className="hp-ticket">
                <header>
                  <span className={`badge badge-${t.status === "RESOLVED" ? "green" : t.status === "IN_PROGRESS" ? "blue" : "yellow"}`}>{STATUS_LABEL[t.status]}</span>
                  <b>{t.subject}</b>
                  <small>{timeAgo(t.createdAt)}</small>
                </header>
                <div className="hp-thread">
                  <p className="hp-msg"><span>You</span>{t.message}</p>
                  {t.replies.map(r => (
                    <p key={r._id} className={`hp-msg ${r.staff ? "is-staff" : ""}`}><span>{r.staff ? "Cineverse support" : "You"} · {timeAgo(r.createdAt)}</span>{r.message}</p>
                  ))}
                </div>
                <div className="hp-follow">
                  <input className="form-input" value={followUp[t._id] ?? ""} maxLength={2000} placeholder={t.status === "RESOLVED" ? "Not fixed? Reply to reopen" : "Add more details"}
                    onChange={e => setFollowUp(f => ({ ...f, [t._id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") sendFollowUp(t._id); }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => sendFollowUp(t._id)} disabled={!followUp[t._id]?.trim()}>Reply</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
