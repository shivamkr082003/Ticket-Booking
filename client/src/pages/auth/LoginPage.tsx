import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/index.api.ts";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types/movie.types.ts";
import AuthShell from "../../components/auth/AuthShell/AuthShell.tsx";
import "./auth.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    try {
      setLoading(true);
      setError("");

      const { token, user: rawUser } = await authApi.signin(form.email, form.password);

      const raw = rawUser as unknown as Record<string, unknown>;

      const user: User = {
        id:         String(raw.id    ?? raw._id        ?? ""),
        _id:        String(raw._id   ?? raw.id         ?? ""),
        name:       String(raw.name  ?? ""),
        email:      String(raw.email ?? ""),
        phone:      raw.phone  ? String(raw.phone)  : undefined,
        avatar:     raw.avatar ? String(raw.avatar) : undefined,
        userRole:   String(raw.userRole   ?? raw.role   ?? "CUSTOMER").toUpperCase().trim() as User["userRole"],
        userStatus: String(raw.userStatus ?? raw.status ?? "PENDING").toUpperCase().trim()  as User["userStatus"],
        createdAt:  raw.createdAt ? String(raw.createdAt) : undefined,
        isPrime:        Boolean(raw.isPrime),
        primeExpiresAt: raw.primeExpiresAt ? String(raw.primeExpiresAt) : null,
      };

      login(token, user);

      const dest = (user.userRole === "ADMIN" || user.userRole === "CLIENT")
        ? "/dashboard"
        : "/movies";

      setTimeout(() => navigate(dest, { replace: true }), 50);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell variant="login">
      <div className="auth-card anim-fadeup">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎬</div>
          <span className="auth-logo-text">CINEVERSE</span>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-sub">Sign in to book your next experience</p>

        <div className="auth-form">
          {error && <div className="auth-error">⚠ {error}</div>}

          <div className="field">
            <label>Email</label>
            <div className="input-icon-wrap">
              <span className="input-icon">✉</span>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set("email", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
          </div>

          <div className="field">
            <label>Password</label>
            <div className="input-icon-wrap">
              <span className="input-icon">🔒</span>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => set("password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
          </div>

          <button className="btn btn-primary btn-full btn-lg auth-submit"
            onClick={handleSubmit} disabled={loading}>
            {loading
              ? <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
              : "Sign In →"}
          </button>
        </div>

        <div className="auth-divider"><span>or</span></div>
        <p className="auth-switch">
          New to Cineverse? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </AuthShell>
  );
}