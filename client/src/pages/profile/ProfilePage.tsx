import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import AppNavbar               from "../../components/common/Navbar/Navbar.tsx";
import { PageSpinner } from "../../components/common/SharedUI/SharedUI.tsx";
import { showToast } from "../../components/common/Toast/toast.ts";
import BookingCard             from "../../components/booking/BookingCard/BookingCard.tsx";
import ImageUpload             from "../../components/common/ImageUpload/ImageUpload.tsx";
import { profileApi, bookingsApi } from "../../api/index.api.ts";
import type { Booking } from "../../types/movie.types.ts";
import { useAuth }             from "../../context/AuthContext.tsx";
import { isPrimeMember }       from "../../utils/prime.ts";
import "./ProfilePage.css";

type Tab = "profile" | "bookings" | "security";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<Tab>("profile");

  // Profile form
  const [name,       setName]       = useState(user?.name   ?? "");
  const [phone,      setPhone]      = useState(user?.phone  ?? "");
  const [avatar,     setAvatar]     = useState(user?.avatar ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  // Password form
  const [pwForm,     setPwForm]     = useState({ current: "", newPw: "", confirm: "" });
  const [savingPw,   setSavingPw]   = useState(false);
  const [pwError,    setPwError]    = useState("");

  useEffect(() => {
    bookingsApi.getMyBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) { showToast("Name cannot be empty", "error"); return; }
    setSavingInfo(true);
    try {
      const updated = await profileApi.updateProfile({
        name:   name.trim(),
        phone:  phone.trim(),
        avatar: avatar.trim(),
      });
      updateUser(updated);
      showToast("Profile updated successfully!");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update", "error");
    } finally { setSavingInfo(false); }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current)           { setPwError("Current password is required"); return; }
    if (pwForm.newPw.length < 6)   { setPwError("New password must be at least 6 characters"); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError("Passwords do not match"); return; }
    setSavingPw(true);
    try {
      await profileApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      showToast("Password changed successfully!");
      setPwForm({ current: "", newPw: "", confirm: "" });
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : "Failed to change password");
    } finally { setSavingPw(false); }
  };

  // Stats
  const confirmed  = bookings.filter(b => b.status === "SUCCESSFUL").length;
  const totalSpent = bookings
    .filter(b => b.status === "SUCCESSFUL")
    .reduce((a, b) => a + (b.totalAmount ?? 0), 0);

  if (!user) return <div className="page-wrapper"><AppNavbar /><PageSpinner /></div>;

  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />

      <div className="pfp-container container">

        {/* ── Hero ── */}
        <div className="pfp-hero">
          <div className="pfp-avatar-wrap">
            {avatar || user.avatar
              ? <img
                  src={avatar || user.avatar}
                  alt={name}
                  className="pfp-avatar-img"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style");
                  }}
                />
              : null
            }
            <div
              className="pfp-avatar-fallback"
              style={{ display: (avatar || user.avatar) ? "none" : "flex" }}
            >
              {(name || user.name)?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="pfp-avatar-ring" />
          </div>

          <div className="pfp-hero-info">
            <h1 className="pfp-name">{user.name}</h1>
            <p className="pfp-email">✉ {user.email}</p>
            {(user.phone || phone) && (
              <p className="pfp-phone">📱 {user.phone || phone}</p>
            )}
            <div className="pfp-badges">
              <span className="badge badge-purple">{user.userRole}</span>
              <span className={`badge badge-${user.userStatus === "APPROVED" ? "green" : "yellow"}`}>
                {user.userStatus}
              </span>
              {isPrimeMember(user)
                ? <button className="badge badge-prime" onClick={() => navigate("/prime")}>✦ Prime Member</button>
                : <button className="badge badge-gray" onClick={() => navigate("/prime")}>✦ Get Prime</button>}
              <span className="pfp-joined">
                Joined {new Date(user.createdAt ?? new Date()).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        {!loading && (
          <div className="pfp-stats">
            <div className="pfp-stat">
              <p className="pfp-stat-val">{bookings.length}</p>
              <p className="pfp-stat-label">Total Bookings</p>
            </div>
            <div className="pfp-stat">
              <p className="pfp-stat-val">{confirmed}</p>
              <p className="pfp-stat-label">Confirmed</p>
            </div>
            <div className="pfp-stat">
              <p className="pfp-stat-val">₹{totalSpent.toLocaleString()}</p>
              <p className="pfp-stat-label">Total Spent</p>
            </div>
            <div className="pfp-stat">
              <p className="pfp-stat-val">{bookings.filter(b => b.status === "CANCELLED").length}</p>
              <p className="pfp-stat-label">Cancelled</p>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="pfp-tabs">
          {([
            { id: "profile",  label: "👤 Profile"  },
            { id: "bookings", label: "🎟 Bookings" },
            { id: "security", label: "🔒 Security" },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              className={`pfp-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="pfp-panel">
            <p className="pfp-panel-title">PERSONAL INFORMATION</p>

            {/* Avatar preview */}
            <div className="pfp-avatar-edit">
              <div className="pfp-avatar-preview">
                {avatar
                  ? <img src={avatar} alt="preview"
                      onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                  : <span>{(name || user.name)?.[0]?.toUpperCase() ?? "?"}</span>
                }
              </div>
              <div className="pfp-avatar-edit-info">
                <p className="pfp-avatar-edit-label">Profile Photo</p>
                <p className="pfp-avatar-edit-sub">Paste an image URL below</p>
              </div>
            </div>

            <div className="pfp-form">
              <ImageUpload
                label="Profile Photo"
                value={avatar}
                onChange={setAvatar}
                folder="cineverse/avatars"
                aspectRatio="square"
                optional
              />
              <div className="form-group">
                <label className="form-label">Display Name *</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Phone Number
                  <span className="pfp-optional"> (optional)</span>
                </label>
                <input
                  className="form-input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Email Address
                  <span className="pfp-readonly"> (cannot be changed)</span>
                </label>
                <input
                  className="form-input"
                  value={user.email}
                  disabled
                  style={{ opacity: .55 }}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={savingInfo}
              >
                {savingInfo ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* ── Bookings Tab ── */}
        {activeTab === "bookings" && (
          <div className="pfp-panel">
            <div className="pfp-panel-header">
              <p className="pfp-panel-title">BOOKING HISTORY</p>
              <button className="btn btn-ghost btn-sm"
                onClick={() => navigate("/my-bookings")}>
                View All →
              </button>
            </div>

            {loading ? <PageSpinner /> : bookings.length === 0 ? (
              <div className="empty-state" style={{ padding: "40px 0" }}>
                <div className="empty-state-icon">🎟</div>
                <p className="empty-state-title">No Bookings Yet</p>
                <p className="empty-state-sub">Book your first movie experience!</p>
                <button className="btn btn-primary" style={{ marginTop: 20 }}
                  onClick={() => navigate("/movies")}>
                  Browse Movies
                </button>
              </div>
            ) : (
              <div className="pfp-bookings-list">
                {bookings.slice(0, 5).map(b => (
                  <BookingCard
                    key={b._id}
                    booking={b}
                    onView={id => navigate(`/ticket/${id}`, { state: { booking: b } })}
                    onCancel={() => {}}
                  />
                ))}
                {bookings.length > 5 && (
                  <button className="btn btn-ghost" onClick={() => navigate("/my-bookings")}>
                    View all {bookings.length} bookings →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Security Tab ── */}
        {activeTab === "security" && (
          <div className="pfp-panel">
            <p className="pfp-panel-title">CHANGE PASSWORD</p>
            <div className="pfp-form">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={pwForm.newPw}
                  onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Re-enter new password"
                />
              </div>

              {pwError && <p className="pfp-pw-error">⚠ {pwError}</p>}

              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={savingPw}
              >
                {savingPw ? "Changing…" : "Change Password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}