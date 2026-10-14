import { useEffect, useState } from "react";
import { auditApi } from "../../../../../api/index.api.ts";
import { timeAgo } from "../../../../common/NotificationBell/timeAgo.ts";
import type { AuditEntry } from "../../../../../types/movie.types.ts";

const ENTITIES = ["", "Theatre", "Show", "Movie", "Coupon", "User", "Booking", "Support"];
const ACTION_BADGE: Record<AuditEntry["action"], string> = {
  CREATE: "green", UPDATE: "blue", DELETE: "red", STATUS: "yellow", CHECK_IN: "purple", REPLY: "gray",
};

export default function ActivityTab() {
  const [entity, setEntity] = useState("");
  const [page,   setPage]   = useState(1);
  const [data,   setData]   = useState<{ items: AuditEntry[]; pagination: { page: number; total: number; totalPages: number } } | null>(null);

  useEffect(() => {
    let cancelled = false;
    auditApi.list({ entity: entity || undefined, page }).then(r => { if (!cancelled) setData(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [entity, page]);

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div className="dash-page-header" style={{ marginBottom: 0 }}>
          <p className="dash-eyebrow">Audit log</p>
          <h1 className="dash-page-title">Activity</h1>
          <p className="dash-page-sub">Every change admins and theatre owners make — who, what and when. Kept for a year.</p>
        </div>
        <select className="form-input" style={{ width: 180 }} value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }} aria-label="Filter by type">
          {ENTITIES.map(e => <option key={e} value={e}>{e || "Everything"}</option>)}
        </select>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>What</th><th>Fields</th></tr></thead>
          <tbody>
            {data?.items.length === 0 && <tr><td colSpan={5} className="dash-table-empty">No activity recorded yet.</td></tr>}
            {data?.items.map(a => (
              <tr key={a._id}>
                <td className="cell-muted" title={new Date(a.createdAt).toLocaleString("en-IN")}>{timeAgo(a.createdAt)}</td>
                <td><strong>{a.actorName || "—"}</strong><small>{a.role === "ADMIN" ? "Admin" : "Theatre owner"}</small></td>
                <td><span className={`badge badge-${ACTION_BADGE[a.action]}`}>{a.action.replace("_", " ")}</span></td>
                <td>{a.summary}<small>{a.entity}{a.entityId ? ` · ${a.entityId.slice(-6)}` : ""}</small></td>
                <td className="cell-muted">{a.fields.length ? a.fields.slice(0, 5).join(", ") + (a.fields.length > 5 ? "…" : "") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div className="st-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Newer</button>
          <span className="cell-muted">Page {page} of {data.pagination.totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Older →</button>
        </div>
      )}
    </div>
  );
}
