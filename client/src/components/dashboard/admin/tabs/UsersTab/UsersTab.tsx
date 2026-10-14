import { useState, useMemo } from "react";
import UserAvatar  from "../../../common/UserAvatar/UserAvatar.tsx";
import RoleBadge   from "../../../common/RoleBadge/RoleBadge.tsx";
import StatusBadge from "../../../common/StatusBadge/StatusBadge.tsx";
import type { User } from "../../../../../types/movie.types.ts";

const fmt = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

interface UsersTabProps {
  users:       User[];
  myId?:       string;
  onApprove:   (userId: string, status: "APPROVED" | "REJECTED", name: string) => void;
  onDelete:    (userId: string, name: string) => void;
}

export default function UsersTab({ users, myId, onApprove, onDelete }: UsersTabProps) {
  const [search,   setSearch]   = useState("");
  const [roleF,    setRoleF]    = useState("ALL");
  const [statusF,  setStatusF]  = useState("ALL");

  const pending  = useMemo(() => users.filter(u => u.userStatus === "PENDING"), [users]);

  const filtered = useMemo(() => users.filter(u => {
    if (roleF   !== "ALL" && u.userRole   !== roleF)   return false;
    if (statusF !== "ALL" && u.userStatus !== statusF) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) &&
        !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [users, search, roleF, statusF]);

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div>
          <h1 className="dash-page-title">Users</h1>
          <p className="dash-page-sub">{users.length} registered users</p>
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p className="dash-section-title" style={{ color: "var(--yellow)", marginBottom: 12 }}>
            ⏳ PENDING APPROVALS ({pending.length})
          </p>
          <div className="approval-grid">
            {pending.map(u => (
              <div key={u.id ?? u._id} className="approval-card">
                <div className="approval-card-top">
                  <div className="approval-avatar">{u.name[0].toUpperCase()}</div>
                  <div>
                    <p className="approval-name">{u.name}</p>
                    <p className="approval-email">{u.email}</p>
                    <RoleBadge role={u.userRole} />
                  </div>
                </div>
                <div className="approval-btns">
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                    onClick={() => onApprove(u.id ?? u._id!, "APPROVED", u.name)}>
                    ✓ Approve
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                    onClick={() => onApprove(u.id ?? u._id!, "REJECTED", u.name)}>
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="dash-filters">
        <input className="dash-filter-input" placeholder="🔍 Search name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="dash-filter-input" value={roleF} onChange={e => setRoleF(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="CLIENT">Client</option>
          <option value="CUSTOMER">Customer</option>
        </select>
        <select className="dash-filter-input" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="ALL">All Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>
        {(search || roleF !== "ALL" || statusF !== "ALL") && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(""); setRoleF("ALL"); setStatusF("ALL"); }}>
            Clear ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No users match</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id ?? u._id}>
                <td>
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                    <UserAvatar name={u.name} size="sm" />
                    <strong style={{ color: "var(--text-primary)" }}>{u.name}</strong>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.email}</td>
                <td><RoleBadge role={u.userRole} /></td>
                <td><StatusBadge status={u.userStatus} /></td>
                <td style={{ fontSize: 12 }}>{u.createdAt ? fmt(u.createdAt) : "—"}</td>
                <td>
                  <div className="row-actions">
                    {u.userStatus === "PENDING"  && <button className="btn btn-primary btn-sm" onClick={() => onApprove(u.id ?? u._id!, "APPROVED", u.name)}>✓ Approve</button>}
                    {u.userStatus === "PENDING"  && <button className="btn btn-danger btn-sm"  onClick={() => onApprove(u.id ?? u._id!, "REJECTED", u.name)}>✗ Reject</button>}
                    {u.userStatus === "APPROVED" && u.userRole !== "ADMIN" && <button className="btn btn-ghost btn-sm" onClick={() => onApprove(u.id ?? u._id!, "REJECTED", u.name)}>Suspend</button>}
                    {u.userStatus === "REJECTED" && <button className="btn btn-primary btn-sm" onClick={() => onApprove(u.id ?? u._id!, "APPROVED", u.name)}>Restore</button>}
                    {(u.id ?? u._id) !== myId && <button className="btn btn-danger btn-sm" onClick={() => onDelete(u.id ?? u._id!, u.name)}>🗑</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}