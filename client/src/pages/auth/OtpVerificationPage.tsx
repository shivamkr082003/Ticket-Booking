import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate }    from "react-router-dom";
import { authApi }    from "../../api/index.api.ts";
import { showToast }  from "../../components/common/Toast/toast.ts";
import AuthShell from "../../components/auth/AuthShell/AuthShell.tsx";
import "./auth.css";

export default function OtpVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // userId + email passed via navigate state from SignupPage
  const { userId, email} = location.state ?? {};

  const [otp,       setOtp]       = useState<string[]>(["","","","","",""]);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState("");
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no userId
  useEffect(() => {
    if (!userId) navigate("/signup", { replace: true });
  }, [userId,navigate]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const otpString = otp.join("");

  const handleChange = (index: number, val: string) => {
    // Only allow digits
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");

    // Auto-focus next
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otpString.length === 6) {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next   = [...otp];
    pasted.split("").forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    if (otpString.length !== 6) { setError("Enter all 6 digits"); return; }
    setLoading(true);
    setError("");
    try {
      await authApi.verifyOtp(userId, otpString);
      showToast("Email verified! Please sign in. 🎬");
      navigate("/login", { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid OTP";
      setError(msg);
      // Clear OTP on wrong attempt
      setOtp(["","","","","",""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await authApi.resendOtp(userId);
      showToast("OTP resent! Check your email.");
      setCountdown(60);
      setOtp(["","","","","",""]);
      setError("");
      inputRefs.current[0]?.focus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to resend OTP";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell variant="verify">
      <div className="auth-card anim-fadeup">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🎬</div>
          <span className="auth-logo-text">CINEVERSE</span>
        </div>

        {/* Icon */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 52 }}>🔐</div>
        </div>

        <h1 className="auth-title" style={{ textAlign: "center" }}>Verify Email</h1>
        <p className="auth-sub" style={{ textAlign: "center" }}>
          We sent a 6-digit OTP to<br />
          <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
        </p>

        <div className="auth-form">
          {error && <div className="auth-error">⚠ {error}</div>}

          {/* OTP inputs */}
          <div className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                className={`otp-input ${digit ? "filled" : ""}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={e => e.target.select()}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            className="btn btn-primary btn-full btn-lg auth-submit"
            onClick={handleVerify}
            disabled={loading || otpString.length !== 6}
          >
            {loading
              ? <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
              : "Verify OTP →"
            }
          </button>

          {/* Resend */}
          <div style={{ textAlign: "center" }}>
            {countdown > 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Resend OTP in <strong style={{ color: "var(--text-accent)" }}>{countdown}s</strong>
              </p>
            ) : (
              <button
                className="btn btn-ghost"
                onClick={handleResend}
                disabled={resending}
                style={{ fontSize: 13 }}
              >
                {resending ? "Sending…" : "Resend OTP"}
              </button>
            )}
          </div>

          <p className="auth-switch">
            Wrong email?{" "}
            <span
              style={{ color: "var(--text-accent)", cursor: "pointer", fontWeight: 600 }}
              onClick={() => navigate("/signup")}
            >
              Go back
            </span>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}