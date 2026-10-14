import { useCallback, useEffect, useState } from "react";
import { supportApi } from "../../../../../api/index.api.ts";
import { showToast } from "../../../../common/Toast/toast.ts";
import { timeAgo } from "../../../../common/NotificationBell/timeAgo.ts";
import type { SupportStatus, SupportTicket } from "../../../../../types/movie.types.ts";

const FILTERS: { key: SupportStatus | ""; label: string }[] = [
  { key: "", label: "All" }, { key: "OPEN", label: "Open" }, { key: "IN_PROGRESS", label: "In progress" }, { key: "RESOLVED", label: "Resolved" },
];
const BADGE: Record<SupportStatus, string> = { OPEN: "yellow", IN_PROGRESS: "blue", RESOLVED: "green" };

export default function SupportTab() {
  const [filter,  setFilter]  = useState<SupportStatus | "">("OPEN");
  const [items,   setItems]   = useState<SupportTicket[]>([]);
  const [open,    setOpen]    = useState(0);
  const [active,  setActive]  = useState<string | null>(null);
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    supportApi.all(filter || undefined)
      .then(r => { setItems(r.items); setOpen(r.open); })
      .catch((e: unknown) => showToast(e instanceof Error ? e.message : "Failed to load requests", "error"));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const t = items.find(x => x._id === active) ?? null;

  const send = async (status?: SupportStatus) => {
    if (!t) return;
    setSending(true);
    try {
      await supportApi.reply(t._id, { message: reply.trim() || undefined, status });
      setReply(""); showToast(status === "RESOLVED" ? "Marked resolved — customer notified" : "Reply sent");
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally { setSending(false); }
  };

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div className="dash-page-header" style={{ marginBottom: 0 }}>
          <p className="dash-eyebrow">Customers</p>
          <h1 className="dash-page-title">Support requests</h1>
          <p className="dash-page-sub">{open} waiting for a reply. Customers are notified in-app when you respond.</p>
        </div>
        <div className="cc-range" role="tablist" aria-label="Status">
          {FILTERS.map(f => (
            <button key={f.label} role="tab" aria-selected={filter === f.key} className={filter === f.key ? "active" : ""} onClick={() => { setFilter(f.key); setActive(null); }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="st-layout">
        <div className="st-list">
          {items.length === 0 && <p className="dash-table-empty">Nothing here — inbox zero 🎉</p>}
          {items.map(x => {
            const who = typeof x.userId === "object" ? x.userId : null;
            return (
              <button key={x._id} className={`st-item ${active === x._id ? "active" : ""}`} onClick={() => setActive(x._id)}>
                <span className="st-item-top"><span className={`badge badge-${BADGE[x.status]}`}>{x.status.replace("_", " ")}</span><small>{timeAgo(x.updatedAt)}</small></span>
                <b>{x.subject}</b>
                <small>{who?.name ?? "Customer"} · {x.category.toLowerCase()}{x.replies.length ? ` · ${x.replies.length} repl${x.replies.length > 1 ? "ies" : "y"}` : ""}</small>
              </button>
            );
          })}
        </div>

        <div className="st-detail">
          {!t ? <p className="dash-table-empty">Pick a request to read and reply.</p> : (
            <>
              <header className="st-head">
                <div>
                  <h2>{t.subject}</h2>
                  <p>{typeof t.userId === "object" ? `${t.userId.name} · ${t.userId.email}` : ""}</p>
                </div>
                {t.bookingId && typeof t.bookingId === "object" && (
                  <span className="st-booking">🎟 {t.bookingId.ticketCode ?? "Booking"} · {t.bookingId.seats.join(", ")}{t.bookingId.totalAmount ? ` · ₹${t.bookingId.totalAmount}` : ""}{t.bookingId.status ? ` · ${t.bookingId.status}` : ""}</span>
                )}
              </header>
              <div className="st-thread">
                <p className="st-msg"><span>Customer · {timeAgo(t.createdAt)}</span>{t.message}</p>
                {t.replies.map(r => <p key={r._id} className={`st-msg ${r.staff ? "is-staff" : ""}`}><span>{r.staff ? `${r.name} (staff)` : "Customer"} · {timeAgo(r.createdAt)}</span>{r.message}</p>)}
              </div>
              <textarea className="form-input" rows={3} value={reply} maxLength={2000} placeholder="Write a reply…" onChange={e => setReply(e.target.value)} />
              <div className="st-actions">
                <button className="btn btn-ghost btn-sm" disabled={sending} onClick={() => send("IN_PROGRESS")}>Reply · in progress</button>
                <button className="btn btn-primary btn-sm" disabled={sending} onClick={() => send("RESOLVED")}>{reply.trim() ? "Reply & resolve" : "Mark resolved"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
