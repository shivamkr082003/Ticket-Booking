import { Link }   from "react-router-dom";
import { FOOTER_COLS } from "../../../constants/movies.data";
import ThemeToggle from "../../common/ThemeToggle/ThemeToggle.tsx";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* Brand */}
        <div>
          <Link to="/" className="footer-logo">
            <div className="footer-logo-icon">🎬</div>
            <span className="footer-logo-text">CINEVERSE</span>
          </Link>
          <p className="footer-about">
            India's premier cinematic experience platform.
            Real-time seats, secure checkout and instant tickets for the best of world cinema.
          </p>
          <div className="footer-appearance">
            <span>Appearance</span>
            <ThemeToggle />
          </div>
        </div>

        {FOOTER_COLS.map(col => (
          <nav key={col.title} aria-label={col.title}>
            <p className="footer-col-title">{col.title}</p>
            {col.links.map(l => (
              <Link key={l.label} to={l.to} className="footer-link">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">© {new Date().getFullYear()} Cineverse Entertainment Pvt. Ltd. All rights reserved.</p>
        <p className="footer-copy">
          Payments secured by Stripe · <Link to="/credits" className="footer-credit-link">Photo credits</Link>
        </p>
      </div>
    </footer>
  );
}
