import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/index.api.ts";
import ImageUpload from "../../components/common/ImageUpload/ImageUpload.tsx";
import { showToast } from "../../components/common/Toast/toast.ts";
import AuthShell from "../../components/auth/AuthShell/AuthShell.tsx";
import "./auth.css";

// ── SIGNUP ────────────────────────────────────────────────
export function SignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1|2>(1);   // step 1: basic info, step 2: optional profile

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    password: "",
    confirm:  "",
    role:     "CUSTOMER" as "CUSTOMER"|"CLIENT",
    phone:    "",
    avatar:   "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [showPw,  setShowPw]  = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const validateStep1 = (): string | null => {
    if (!form.name.trim())    return "Full name is required.";
    if (!form.email.trim())   return "Email is required.";
    if (!form.password)       return "Password is required.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.signup(
        form.name, form.email, form.password, form.role,
        form.phone || undefined, form.avatar || undefined
      );
      showToast("OTP sent to your email! 📧");
      // Handle both response shapes: { userId } and { _id }
      const userId = (res as Record<string, unknown>).userId
        ?? (res as Record<string, unknown>)._id;
      const email  = (res as Record<string, unknown>).email  ?? form.email;
      const name   = (res as Record<string, unknown>).name   ?? form.name;
      navigate("/verify-otp", {
        state: { userId, email, name },
        replace: true,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell variant="signup">
      <div className="auth-card auth-card-lg anim-fadeup">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🎬</div>
          <span className="auth-logo-text">CINEVERSE</span>
        </div>

        {/* Step indicator */}
        <div className="auth-steps">
          <div className={`auth-step ${step>=1?"active":""}`}>
            <div className="auth-step-dot">1</div>
            <span>Account</span>
          </div>
          <div className="auth-step-line"/>
          <div className={`auth-step ${step>=2?"active":""}`}>
            <div className="auth-step-dot">2</div>
            <span>Profile</span>
          </div>
        </div>

        <h1 className="auth-title">{step===1?"Create Account":"Your Profile"}</h1>
        <p className="auth-sub">
          {step===1?"Join millions of movie lovers":"Optional — add your details"}
        </p>

        <div className="auth-form">
          {error && <div className="auth-error">⚠ {error}</div>}

          {/* ── STEP 1 ── */}
          {step===1 && <>
            <div className="field">
              <label>Full Name *</label>
              <div className="input-icon-wrap">
                <span className="input-icon">👤</span>
                <input className="input" placeholder="John Doe"
                  value={form.name} onChange={e => set("name", e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleNext()}/>
              </div>
            </div>

            <div className="field">
              <label>Email *</label>
              <div className="input-icon-wrap">
                <span className="input-icon">✉</span>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set("email", e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleNext()}/>
              </div>
            </div>

            <div className="auth-row-2">
              <div className="field">
                <label>Password *</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">🔒</span>
                  <input className="input" type={showPw?"text":"password"} placeholder="••••••••"
                    value={form.password} onChange={e => set("password", e.target.value)}/>
                  <button type="button" className="input-eye" onClick={() => setShowPw(p=>!p)}>
                    {showPw?"🙈":"👁"}
                  </button>
                </div>
              </div>
              <div className="field">
                <label>Confirm Password *</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">🔒</span>
                  <input className="input" type={showPw?"text":"password"} placeholder="••••••••"
                    value={form.confirm} onChange={e => set("confirm", e.target.value)}
                    onKeyDown={e => e.key==="Enter" && handleNext()}/>
                </div>
              </div>
            </div>

            {/* Role selector */}
            <div className="field">
              <label>I am a…</label>
              <div className="role-selector">
                {(["CUSTOMER","CLIENT"] as const).map(r => (
                  <button key={r} className={`role-btn ${form.role===r?"active":""}`}
                    onClick={() => set("role", r)}>
                    <span className="role-btn-icon">{r==="CUSTOMER"?"🎟":"🏛"}</span>
                    <span className="role-btn-title">{r==="CUSTOMER"?"Movie Goer":"Theatre Owner"}</span>
                    <span className="role-btn-sub">{r==="CUSTOMER"?"Book tickets & explore movies":"Manage theatres & shows"}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.role==="CLIENT" && (
              <div className="auth-notice">
                <span>🏛</span>
                <p>Theatre owner accounts require admin approval before you can access the dashboard.</p>
              </div>
            )}

            <button className="btn btn-primary btn-full btn-lg auth-submit" onClick={handleNext}>
              Next →
            </button>
          </>}

          {/* ── STEP 2 ── */}
          {step===2 && <>
            {/* Avatar preview */}
            <div className="avatar-preview-wrap">
              <div className="avatar-preview">
                {form.avatar
                  ? <img src={form.avatar} alt="avatar"
                      onError={e => ((e.target as HTMLImageElement).style.display="none")}/>
                  : <span>{form.name[0]?.toUpperCase()??"?"}</span>
                }
              </div>
              <div>
                <p style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>Profile Photo</p>
                <p style={{fontSize:11,color:"var(--text-muted)"}}>Paste an image URL below</p>
              </div>
            </div>

            <ImageUpload
              label="Profile Photo"
              value={form.avatar}
              onChange={url => set("avatar", url)}
              folder="cineverse/avatars"
              aspectRatio="square"
              optional
            />

            <div className="field">
              <label>Phone Number <span className="label-optional">(optional)</span></label>
              <div className="input-icon-wrap">
                <span className="input-icon">📱</span>
                <input className="input" type="tel" placeholder="+91 98765 43210"
                  value={form.phone} onChange={e => set("phone", e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleSubmit()}/>
              </div>
            </div>

            {/* Summary card */}
            <div className="auth-summary">
              <div className="auth-summary-row"><span>Name</span><strong>{form.name}</strong></div>
              <div className="auth-summary-row"><span>Email</span><strong>{form.email}</strong></div>
              <div className="auth-summary-row"><span>Role</span>
                <span className={`badge badge-${form.role==="CLIENT"?"purple":"blue"}`} style={{fontSize:11}}>
                  {form.role==="CUSTOMER"?"Movie Goer":"Theatre Owner"}
                </span>
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost btn-full" onClick={() => { setStep(1); setError(""); }}>
                ← Back
              </button>
              <button className="btn btn-primary btn-full btn-lg auth-submit"
                onClick={handleSubmit} disabled={loading}>
                {loading
                  ? <span className="spinner" style={{width:22,height:22,borderWidth:2}}/>
                  : "Create Account →"}
              </button>
            </div>
          </>}
        </div>

        <div className="auth-divider"><span>or</span></div>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}

// ── RESET PASSWORD ────────────────────────────────────────
export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    oldPassword: "", newPassword: "", confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [showPw,  setShowPw]  = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.oldPassword || !form.newPassword || !form.confirm) {
      setError("All fields are required."); return;
    }
    if (form.newPassword !== form.confirm) {
      setError("New passwords do not match."); return;
    }
    if (form.newPassword.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    try {
      setLoading(true); setError("");
      await authApi.resetPassword(form.oldPassword, form.newPassword);
      showToast("Password updated successfully! 🔑");
      navigate("/movies");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed. Please check your current password.");
    } finally { setLoading(false); }
  };

  return (
    <AuthShell variant="reset">
      <div className="auth-card anim-fadeup">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎬</div>
          <span className="auth-logo-text">CINEVERSE</span>
        </div>

        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-sub">Choose a new strong password</p>

        <div className="auth-form">
          {error && <div className="auth-error">⚠ {error}</div>}

          {(["oldPassword","newPassword","confirm"] as const).map((k, i) => (
            <div key={k} className="field">
              <label>{["Current Password","New Password","Confirm New Password"][i]}</label>
              <div className="input-icon-wrap">
                <span className="input-icon">🔑</span>
                <input className="input" type={showPw?"text":"password"} placeholder="••••••••"
                  value={form[k]} onChange={e => set(k, e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleSubmit()}/>
                {i===0 && (
                  <button type="button" className="input-eye" onClick={() => setShowPw(p=>!p)}>
                    {showPw?"🙈":"👁"}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button className="btn btn-primary btn-full btn-lg auth-submit"
            onClick={handleSubmit} disabled={loading}>
            {loading
              ? <span className="spinner" style={{width:22,height:22,borderWidth:2}}/>
              : "Reset Password →"}
          </button>
        </div>

        <p className="auth-switch" style={{marginTop:20}}>
          <Link to="/movies">← Back to Movies</Link>
        </p>
      </div>
    </AuthShell>
  );
}