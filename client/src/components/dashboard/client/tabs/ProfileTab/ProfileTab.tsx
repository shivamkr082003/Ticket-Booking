import { useState } from "react";
import UserAvatar from "../../../common/UserAvatar/UserAvatar.tsx";
import { profileApi } from "../../../../../api/index.api.ts";
import { showToast } from "../../../../common/Toast/toast.ts";
import type { User } from "../../../../../types/movie.types.ts";

interface ProfileTabProps {
  user:       User;
  onUpdated:  (updated: User) => void;
}

export default function ProfileTab({ user, onUpdated }: ProfileTabProps) {
  const [form,   setForm]   = useState({ name: user.name ?? "", email: user.email ?? "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await profileApi.updateProfile({ name: form.name });
      showToast("Profile updated successfully");
      onUpdated(updated);
    } catch (e: unknown) {
      if(e instanceof Error){
        showToast(e.message);
      }else{
        showToast("Failed to update");
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="anim-fadeup">
      <div className="dash-page-header">
        <h1 className="dash-page-title">My profile</h1>
        <p className="dash-page-sub">Manage your account details</p>
      </div>

      <div className="card" style={{ maxWidth: 520, padding: 28 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 28 }}>
          <UserAvatar name={user.name ?? "?"} size="lg" />
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)" }}>{user.name}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{user.email}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              <span className="badge badge-purple">{user.userRole}</span>
              <span className={`badge badge-${user.userStatus === "APPROVED" ? "green" : "yellow"}`}>{user.userStatus}</span>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input className="form-input" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Email <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(cannot be changed)</span></label>
          <input className="form-input" value={form.email} disabled style={{ opacity: .6 }} />
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}