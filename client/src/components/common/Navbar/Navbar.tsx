// import { useState } from "react";
// import { Link, useNavigate, useLocation } from "react-router-dom";
// import { useAuth } from "../../../context/AuthContext.tsx";
// import "./Navbar.css";

// export default function AppNavbar() {
//   const { user, logout } = useAuth();
//   const navigate  = useNavigate();
//   const location  = useLocation();
//   const [menuOpen, setMenuOpen] = useState(false);

//   const isActive  = (path: string) => location.pathname.startsWith(path);
//   const isAdmin   = user?.userRole === "ADMIN" || user?.userRole === "CLIENT";
//   const roleCls   = user?.userRole === "ADMIN" ? "red" : user?.userRole === "CLIENT" ? "purple" : "blue";

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//     setMenuOpen(false);
//   };

//   return (
//     <nav className="app-nav">
//       <div className="app-nav-inner">

//         {/* Logo */}
//         <Link to="/" className="app-nav-logo">
//           <div className="app-nav-logo-icon">🎬</div>
//           <span className="app-nav-logo-text">CINEVERSE</span>
//         </Link>

//         {/* Desktop links */}
//         <div className="app-nav-links">
//           <Link to="/movies"    className={`app-nav-link ${isActive("/movies")    ? "active" : ""}`}>Movies</Link>
//           <Link to="/theatres"  className={`app-nav-link ${isActive("/theatres")  ? "active" : ""}`}>Theatres</Link>
//           {user && (
//             <Link to="/my-bookings" className={`app-nav-link ${isActive("/my-bookings") ? "active" : ""}`}>
//               My Bookings
//             </Link>
//           )}
//           {isAdmin && (
//             <Link to="/dashboard" className={`app-nav-link app-nav-link-admin ${isActive("/dashboard") ? "active" : ""}`}>
//               Dashboard
//             </Link>
//           )}
//         </div>

//         {/* Right side */}
//         <div className="app-nav-right">
//           {user ? (
//             <div className="app-nav-user">
//               {/* Avatar — image if available, else initial */}
//               <div
//                 className="app-nav-avatar"
//                 onClick={() => setMenuOpen(p => !p)}
//                 title={user.name}
//               >
//                 {user.avatar
//                   ? <img
//                       src={user.avatar}
//                       alt={user.name}
//                       className="app-nav-avatar-img"
//                       onError={e => {
//                         (e.target as HTMLImageElement).style.display = "none";
//                         ((e.target as HTMLImageElement).parentElement as HTMLElement).innerText =
//                           user.name?.[0]?.toUpperCase() ?? "?";
//                       }}
//                     />
//                   : user.name?.[0]?.toUpperCase() ?? "?"
//                 }
//               </div>

//               {/* Dropdown */}
//               {menuOpen && (
//                 <>
//                   <div className="app-nav-overlay" onClick={() => setMenuOpen(false)} />
//                   <div className="app-nav-dropdown">
//                     {/* User info */}
//                     <div className="app-nav-dropdown-header">
//                       <div className="app-nav-dropdown-avatar">
//                         {user.avatar
//                           ? <img src={user.avatar} alt={user.name}
//                               onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
//                           : user.name?.[0]?.toUpperCase() ?? "?"
//                         }
//                       </div>
//                       <div>
//                         <p className="app-nav-dropdown-name">{user.name}</p>
//                         <p className="app-nav-dropdown-email">{user.email}</p>
//                         <span className={`badge badge-${roleCls}`}>{user.userRole}</span>
//                       </div>
//                     </div>

//                     <div className="app-nav-dropdown-divider" />

//                     <Link to="/profile"     className="app-nav-dropdown-item" onClick={() => setMenuOpen(false)}>👤 My Profile</Link>
//                     <Link to="/my-bookings" className="app-nav-dropdown-item" onClick={() => setMenuOpen(false)}>🎟 My Bookings</Link>
//                     {isAdmin && (
//                       <Link to="/dashboard" className="app-nav-dropdown-item" onClick={() => setMenuOpen(false)}>📊 Dashboard</Link>
//                     )}

//                     <div className="app-nav-dropdown-divider" />

//                     <button className="app-nav-dropdown-item app-nav-dropdown-logout" onClick={handleLogout}>
//                       ← Logout
//                     </button>
//                   </div>
//                 </>
//               )}
//             </div>
//           ) : (
//             <div className="app-nav-auth-btns">
//               <Link to="/login"  className="btn btn-ghost btn-sm">Sign In</Link>
//               <Link to="/signup" className="btn btn-primary btn-sm">Join Now</Link>
//             </div>
//           )}

//           {/* Mobile hamburger */}
//           <button className="app-nav-hamburger" onClick={() => setMenuOpen(p => !p)}>
//             <span /><span /><span />
//           </button>
//         </div>
//       </div>

//       {/* Mobile menu */}
//       {menuOpen && (
//         <div className="app-nav-mobile-menu">
//           <Link to="/movies"    className="app-nav-mobile-link" onClick={() => setMenuOpen(false)}>Movies</Link>
//           <Link to="/theatres"  className="app-nav-mobile-link" onClick={() => setMenuOpen(false)}>Theatres</Link>
//           {user && (
//             <>
//               <Link to="/my-bookings" className="app-nav-mobile-link" onClick={() => setMenuOpen(false)}>My Bookings</Link>
//               <Link to="/profile"     className="app-nav-mobile-link" onClick={() => setMenuOpen(false)}>My Profile</Link>
//             </>
//           )}
//           {isAdmin && (
//             <Link to="/dashboard" className="app-nav-mobile-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
//           )}
//           {!user && (
//             <>
//               <Link to="/login"  className="app-nav-mobile-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
//               <Link to="/signup" className="app-nav-mobile-link" onClick={() => setMenuOpen(false)}>Join Now</Link>
//             </>
//           )}
//           {user && (
//             <button className="app-nav-mobile-link app-nav-mobile-logout" onClick={handleLogout}>
//               Logout
//             </button>
//           )}
//         </div>
//       )}
//     </nav>
//   );
// }


import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.tsx";
import ThemeToggle from "../ThemeToggle/ThemeToggle.tsx";
import SearchPalette from "../SearchPalette/SearchPalette.tsx";
import NotificationBell from "../NotificationBell/NotificationBell.tsx";
import { useCity } from "../../../context/CityContext.tsx";
import { isPrimeMember } from "../../../utils/prime.ts";
import "./Navbar.css";

interface AppNavbarProps {
  /** Transparent over a dark hero until the page is scrolled */
  overlay?: boolean;
}

export default function AppNavbar({ overlay = false }: AppNavbarProps) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const { city, openPicker } = useCity();
  const isMac = typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform);

  const isActive  = (path: string) => location.pathname.startsWith(path);
  const isAdmin   = user?.userRole === "ADMIN" || user?.userRole === "CLIENT";
  const isPrime   = isPrimeMember(user);
  const roleCls   = user?.userRole === "ADMIN" ? "red" : user?.userRole === "CLIENT" ? "purple" : "blue";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⌘K / Ctrl+K anywhere, or "/" when not typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setDropdownOpen(false);
    setMobileOpen(false);
  };

  return (
    <nav className={`app-nav theme-dark ${scrolled ? "is-scrolled" : ""} ${overlay && !scrolled && !mobileOpen && !dropdownOpen ? "app-nav--overlay" : ""}`}>
      <div className="app-nav-inner">

        {/* Logo */}
        <Link to="/" className="app-nav-logo">
          <div className="app-nav-logo-icon">🎬</div>
          <span className="app-nav-logo-text">CINEVERSE</span>
        </Link>

        {/* Desktop links */}
        <div className="app-nav-links">
          <Link to="/movies"    className={`app-nav-link ${isActive("/movies")    ? "active" : ""}`}>Movies</Link>
          <Link to="/theatres"  className={`app-nav-link ${isActive("/theatres")  ? "active" : ""}`}>Theatres</Link>
          {user && (
            <Link to="/my-bookings" className={`app-nav-link ${isActive("/my-bookings") ? "active" : ""}`}>
              My Bookings
            </Link>
          )}
          {isAdmin && (
            <Link to="/dashboard" className={`app-nav-link app-nav-link-admin ${isActive("/dashboard") ? "active" : ""}`}>
              Dashboard
            </Link>
          )}
          <Link to="/prime" className={`app-nav-link app-nav-link-prime ${isActive("/prime") ? "active" : ""}`}>
            ✦ Prime
          </Link>
        </div>

        {/* Right side */}
        <div className="app-nav-right">
          <button type="button" className="app-nav-search" onClick={() => setSearchOpen(true)} aria-label="Search movies and cinemas">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <span className="app-nav-search-label">Search</span>
            <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <button type="button" className="app-nav-city" onClick={openPicker} aria-label={`City: ${city ?? "All cities"}. Change city`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12" /><circle cx="12" cy="9" r="2.5" />
            </svg>
            <span className="app-nav-city-name">{city ?? "All cities"}</span>
            <span className="app-nav-city-caret" aria-hidden="true">▾</span>
          </button>
          <ThemeToggle />
          {user && <NotificationBell key={user.id ?? user._id} />}
          {user ? (
            <div className="app-nav-user">
              {/* Avatar — image if available, else initial */}
              <button
                type="button"
                className={`app-nav-avatar ${isPrime ? "is-prime" : ""}`}
                onClick={() => setDropdownOpen(p => !p)}
                title={user.name}
                aria-label="Account menu"
                aria-expanded={dropdownOpen}
              >
                {user.avatar
                  ? <img
                      src={user.avatar}
                      alt={user.name}
                      className="app-nav-avatar-img"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = "none";
                        ((e.target as HTMLImageElement).parentElement as HTMLElement).innerText =
                          user.name?.[0]?.toUpperCase() ?? "?";
                      }}
                    />
                  : user.name?.[0]?.toUpperCase() ?? "?"
                }
                {isPrime && <span className="app-nav-avatar-crown" aria-hidden="true">✦</span>}
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <>
                  <div className="app-nav-overlay" onClick={() => setDropdownOpen(false)} />
                  <div className="app-nav-dropdown">
                    {/* User info */}
                    <div className="app-nav-dropdown-header">
                      <div className="app-nav-dropdown-avatar">
                        {user.avatar
                          ? <img src={user.avatar} alt={user.name}
                              onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                          : user.name?.[0]?.toUpperCase() ?? "?"
                        }
                      </div>
                      <div>
                        <p className="app-nav-dropdown-name">{user.name}</p>
                        <p className="app-nav-dropdown-email">{user.email}</p>
                        <div className="app-nav-dropdown-badges">
                          <span className={`badge badge-${roleCls}`}>{user.userRole}</span>
                          {isPrime && <span className="badge badge-prime">✦ Prime</span>}
                        </div>
                      </div>
                    </div>

                    <div className="app-nav-dropdown-divider" />

                    <Link to="/profile"     className="app-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>👤 My Profile</Link>
                    <Link to="/my-bookings" className="app-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>🎟 My Bookings</Link>
                    <Link to="/watchlist"   className="app-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>♥ My Watchlist</Link>
                    <Link to="/wallet"      className="app-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>💳 Wallet &amp; Gift Cards</Link>
                    <Link to="/help"        className="app-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>🆘 Help &amp; Support</Link>
                    <Link to="/prime"       className="app-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      ✦ {isPrime ? "My Prime Pass" : "Get Prime Pass"}
                    </Link>
                    {isAdmin && (
                      <Link to="/dashboard" className="app-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>📊 Dashboard</Link>
                    )}

                    <div className="app-nav-dropdown-divider" />

                    <button className="app-nav-dropdown-item app-nav-dropdown-logout" onClick={handleLogout}>
                      ← Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="app-nav-auth-btns">
              <Link to="/login"  className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Join Now</Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className={`app-nav-hamburger ${mobileOpen ? "is-open" : ""}`}
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="app-nav-mobile-menu">
          <div className="app-nav-mobile-theme">Appearance <ThemeToggle /></div>
          <Link to="/movies"    className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>Movies</Link>
          <Link to="/theatres"  className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>Theatres</Link>
          <Link to="/prime"     className="app-nav-mobile-link app-nav-mobile-prime" onClick={() => setMobileOpen(false)}>✦ Prime Pass</Link>
          {user && (
            <>
              <Link to="/my-bookings" className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>My Bookings</Link>
              <Link to="/watchlist"   className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>My Watchlist</Link>
              <Link to="/wallet"      className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>Wallet &amp; Gift Cards</Link>
              <Link to="/profile"     className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>My Profile</Link>
            </>
          )}
          {isAdmin && (
            <Link to="/dashboard" className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
          )}
          {!user && (
            <>
              <Link to="/login"  className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link to="/signup" className="app-nav-mobile-link" onClick={() => setMobileOpen(false)}>Join Now</Link>
            </>
          )}
          {user && (
            <button className="app-nav-mobile-link app-nav-mobile-logout" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}