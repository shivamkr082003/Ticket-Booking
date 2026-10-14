import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../../../api/index.api.ts";
import type { AppNotification, NotificationType } from "../../../types/movie.types.ts";
import { timeAgo } from "./timeAgo.ts";
import "./NotificationBell.css";

const POLL_MS = 60_000;

const ICON: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: "🎟",
  BOOKING_CANCELLED: "↩️",
  SHOW_REMINDER:     "⏰",
  BOOKINGS_OPEN:     "🔔",
  SUPPORT_REPLY:     "💬",
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [items,  setItems]  = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open,   setOpen]   = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    notificationsApi.list()
      .then(r => { setItems(r.items); setUnread(r.unread); })
      .catch(() => { /* bell just stays quiet */ })
      .finally(() => setLoaded(true));
  }, []);

  // Poll while the tab is visible; refresh when the user comes back to it
  useEffect(() => {
    load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    window.addEventListener("focus", load);
    return () => { window.clearInterval(t); window.removeEventListener("focus", load); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey  = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const openItem = (n: AppNotification) => {
    setOpen(false);
    if (!n.readAt) {
      setItems(list => list.map(x => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread(u => Math.max(0, u - 1));
      notificationsApi.read(n._id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const readAll = () => {
    setItems(list => list.map(x => (x.readAt ? x : { ...x, readAt: new Date().toISOString() })));
    setUnread(0);
    notificationsApi.readAll().catch(load);
  };

  return (
    <div className="nb" ref={wrapRef}>
      <button type="button" className={`nb-btn ${open ? "is-open" : ""}`} onClick={() => { setOpen(o => !o); if (!open) load(); }}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} aria-expanded={open} aria-haspopup="true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && <span className="nb-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <div className="nb-head">
            <p className="nb-title">Notifications</p>
            {unread > 0 && <button className="nb-link" onClick={readAll}>Mark all read</button>}
          </div>
          <div className="nb-list">
            {loaded && items.length === 0 && (
              <div className="nb-empty">
                <span aria-hidden="true">🔔</span>
                <p>You're all caught up.</p>
                <small>Booking updates, show reminders and "bookings open" alerts for your watchlist land here.</small>
              </div>
            )}
            {items.map(n => (
              <button key={n._id} className={`nb-item ${n.readAt ? "" : "is-unread"}`} onClick={() => openItem(n)}>
                {n.image
                  ? <img className="nb-thumb" src={n.image} alt="" loading="lazy" />
                  : <span className="nb-icon" aria-hidden="true">{ICON[n.type]}</span>}
                <span className="nb-text">
                  <span className="nb-item-title"><span aria-hidden="true">{ICON[n.type]} </span>{n.title}</span>
                  {n.body && <span className="nb-item-body">{n.body}</span>}
                  <span className="nb-time">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
