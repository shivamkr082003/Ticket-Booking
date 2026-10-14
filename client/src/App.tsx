// import { BrowserRouter, Routes, Route} from "react-router-dom";
// import { lazy, Suspense } from "react";
// import { AuthProvider } from "./context/AuthContext";
// import { SocketProvider } from "./context/SocketContext";
// import { ProtectedRoute, ToastProvider } from "./components/common/SharedUI/SharedUI.tsx";
// import ErrorBoundary from "./components/common/ErrorBoundary/ErrorBoundary.tsx";
// import "./styles/global.css";

// const LoginPage         = lazy(() => import("./pages/auth/LoginPage.tsx"));
// const SignupPage        = lazy(() => import("./pages/auth/SignUpPage.tsx").then(m => ({ default: m.SignupPage })));
// const ResetPasswordPage = lazy(() => import("./pages/auth/SignUpPage.tsx").then(m => ({ default: m.ResetPasswordPage })));
// const MoviesPage           = lazy(() => import("./pages/movies/MoviePage/MoviePage.tsx"));
// const UserMovieDetailPage  = lazy(() => import("./pages/movies/UserMovieDetail/UserMovieDetailPage.tsx"));
// const TheatresPage         = lazy(() => import("./pages/movies/TheatresPage/TheatresPage.tsx"));
// const TheatreDetailPage = lazy(() => import("./pages/movies/UserMovieDetail/TheatreDetailPage.tsx"));
// const PaymentPage  = lazy(() => import("./pages/booking/PaymentPage/PaymentPage.tsx"));
// const TicketPage   = lazy(() => import("./pages/booking/TicketPage/TicketPage.tsx"));
// const SeatSelectionPage = lazy(() => import("./pages/booking/SeatSelectionPage/SeatSelectionPage.tsx"));
// const MyBookingsPage = lazy(()=>import("./pages/booking/MyBookingsPage/MyBookingsPage.tsx"));
// const AdminDashboard    = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
// const HomePage          = lazy(() => import("./pages/HomePage/HomePage.tsx"));
// const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));

// function PageLoader() {
//   return (
//     <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080808" }}>
//       <div className="spinner" />
//     </div>
//   );
// }

// export default function App() {
//   return (
//     <ErrorBoundary>
//     <AuthProvider>
//       <SocketProvider>
//       <BrowserRouter>
//         <ToastProvider />
//         <div className="grain" />
//         <Suspense fallback={<PageLoader />}>
//           <Routes>
//             {/* Landing (cinematic homepage) */}
//             <Route path="/"             element={<HomePage />} />

//             {/* Auth */}
//             <Route path="/login"        element={<LoginPage />} />
//             <Route path="/signup"       element={<SignupPage />} />

//             {/* Movies */}
//             <Route path="/movies"       element={<MoviesPage />} />
//             <Route path="/movies/:id"   element={<UserMovieDetailPage />} />
//             <Route path="/theatres"     element={<TheatresPage />} />
//             <Route path="/theatres/:id" element={<TheatreDetailPage />} />

//             {/* Protected user */}
//             <Route path="/reset-password" element={<ProtectedRoute><ResetPasswordPage /></ProtectedRoute>} />
//             <Route path="/shows/:showId/seats" element={<ProtectedRoute><SeatSelectionPage /></ProtectedRoute>} />
//             <Route path="/payment"             element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
//             <Route path="/ticket/:bookingId"   element={<ProtectedRoute><TicketPage /></ProtectedRoute>} />
//             <Route path="/my-bookings"  element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
//             <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

//             {/* Admin / Client */}
//             <Route path="/dashboard"    element={<ProtectedRoute roles={["ADMIN","CLIENT"]}><AdminDashboard /></ProtectedRoute>} />

//             {/* 404 */}
//             <Route path="*" element={
//               <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"#080808" }}>
//                 <p style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:96,color:"rgba(239,68,68,.2)" }}>404</p>
//                 <p style={{ color:"rgba(255,255,255,.3)",fontSize:16 }}>Page not found</p>
//                 <a href="/movies" style={{ padding:"12px 28px",background:"var(--brand-gradient)",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13,letterSpacing:2,textTransform:"uppercase",textDecoration:"none" }}>Go to Movies</a>
//               </div>
//             } />
//           </Routes>
//         </Suspense>
//       </BrowserRouter>
//       </SocketProvider>
//     </AuthProvider>
//     </ErrorBoundary>
//   );
// }

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider }   from "./context/AuthContext";
import { SocketProvider }  from "./context/SocketContext";
import { ThemeProvider }   from "./context/ThemeContext.tsx";
import { CityProvider }    from "./context/CityContext.tsx";
import CityPicker          from "./components/common/CityPicker/CityPicker.tsx";
import WatchlistSync       from "./components/common/WatchlistSync/WatchlistSync.tsx";
import { ProtectedRoute, ToastProvider } from "./components/common/SharedUI/SharedUI.tsx";
import ErrorBoundary from "./components/common/ErrorBoundary/ErrorBoundary.tsx";
import "./styles/global.css";

const LoginPage            = lazy(() => import("./pages/auth/LoginPage.tsx"));
const SignupPage            = lazy(() => import("./pages/auth/SignUpPage.tsx").then(m => ({ default: m.SignupPage })));
const ResetPasswordPage     = lazy(() => import("./pages/auth/SignUpPage.tsx").then(m => ({ default: m.ResetPasswordPage })));
const OtpVerificationPage   = lazy(() => import("./pages/auth/OtpVerificationPage.tsx"));
const MoviesPage            = lazy(() => import("./pages/movies/MoviePage/MoviePage.tsx"));
const UserMovieDetailPage   = lazy(() => import("./pages/movies/UserMovieDetail/UserMovieDetailPage.tsx"));
const TheatresPage          = lazy(() => import("./pages/movies/TheatresPage/TheatresPage.tsx"));
const TheatreDetailPage     = lazy(() => import("./pages/movies/UserMovieDetail/TheatreDetailPage.tsx"));
const SeatSelectionPage     = lazy(() => import("./pages/booking/SeatSelectionPage/SeatSelectionPage.tsx"));
const PaymentPage           = lazy(() => import("./pages/booking/PaymentPage/PaymentPage.tsx"));
const TicketPage            = lazy(() => import("./pages/booking/TicketPage/TicketPage.tsx"));
const MyBookingsPage        = lazy(() => import("./pages/booking/MyBookingsPage/MyBookingsPage.tsx"));
const AdminDashboard        = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const HomePage              = lazy(() => import("./pages/HomePage/HomePage.tsx"));
const ProfilePage           = lazy(() => import("./pages/profile/ProfilePage"));
const PrimePage             = lazy(() => import("./pages/prime/PrimePage.tsx"));
const CreditsPage           = lazy(() => import("./pages/credits/CreditsPage.tsx"));
const WatchlistPage         = lazy(() => import("./pages/watchlist/WatchlistPage.tsx"));
const WalletPage            = lazy(() => import("./pages/wallet/WalletPage.tsx"));
const HelpPage              = lazy(() => import("./pages/help/HelpPage.tsx"));
const LegalPage             = lazy(() => import("./pages/legal/LegalPage.tsx"));

function PageLoader() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-base)" }}>
      <div className="spinner" />
    </div>
  );
}

// Reusable fallback components
function MovieFallback() {
  return (
    <div style={{ minHeight:"60vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, background:"var(--bg-base)" }}>
      <p style={{ color:"var(--text-muted)", fontSize:14 }}>Failed to load movie details.</p>
      <a href="/movies" className="btn btn-primary">← Back to Movies</a>
    </div>
  );
}

function BookingFallback() {
  return (
    <div style={{ minHeight:"60vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, background:"var(--bg-base)" }}>
      <p style={{ color:"var(--text-muted)", fontSize:14 }}>Something went wrong. Your booking was not affected.</p>
      <a href="/movies" className="btn btn-primary">← Back to Movies</a>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <CityProvider>
          <BrowserRouter>
            <ToastProvider />
            <CityPicker />
            <WatchlistSync />
            <div className="grain" />
            <Suspense fallback={<PageLoader />}>
              <Routes>

                {/* Landing */}
                <Route path="/" element={
                  <ErrorBoundary>
                    <HomePage />
                  </ErrorBoundary>
                } />

                {/* Auth */}
                <Route path="/login"       element={<LoginPage />} />
                <Route path="/signup"      element={<SignupPage />} />
                <Route path="/verify-otp"  element={<OtpVerificationPage />} />

                {/* Movies */}
                <Route path="/movies" element={
                  <ErrorBoundary>
                    <MoviesPage />
                  </ErrorBoundary>
                } />
                <Route path="/movies/:id" element={
                  <ErrorBoundary fallback={<MovieFallback />}>
                    <UserMovieDetailPage />
                  </ErrorBoundary>
                } />

                {/* Theatres */}
                <Route path="/theatres" element={
                  <ErrorBoundary>
                    <TheatresPage />
                  </ErrorBoundary>
                } />
                <Route path="/theatres/:id" element={
                  <ErrorBoundary>
                    <TheatreDetailPage />
                  </ErrorBoundary>
                } />

                {/* Protected — booking flow (individual boundaries important here) */}
                <Route path="/reset-password" element={
                  <ProtectedRoute>
                    <ResetPasswordPage />
                  </ProtectedRoute>
                } />
                <Route path="/shows/:showId/seats" element={
                  <ProtectedRoute>
                    <ErrorBoundary fallback={<BookingFallback />}>
                      <SeatSelectionPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/payment" element={
                  <ProtectedRoute>
                    <ErrorBoundary fallback={<BookingFallback />}>
                      <PaymentPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/ticket/:bookingId" element={
                  <ProtectedRoute>
                    <ErrorBoundary fallback={<BookingFallback />}>
                      <TicketPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/wallet" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <WalletPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/watchlist" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <WatchlistPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/my-bookings" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <MyBookingsPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <ProfilePage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />

                <Route path="/credits" element={<CreditsPage />} />
                <Route path="/help" element={<ErrorBoundary><HelpPage /></ErrorBoundary>} />
                <Route path="/legal/:doc" element={<LegalPage />} />

                {/* Prime Pass — public plan page, subscribing requires login */}
                <Route path="/prime" element={
                  <ErrorBoundary>
                    <PrimePage />
                  </ErrorBoundary>
                } />

                {/* Admin / Client */}
                <Route path="/dashboard" element={
                  <ProtectedRoute roles={["ADMIN","CLIENT"]}>
                    <ErrorBoundary>
                      <AdminDashboard />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="*" element={
                  <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, background:"var(--bg-base)" }}>
                    <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:120, lineHeight:1, background:"var(--brand-gradient)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent", opacity:.85 }}>404</p>
                    <p style={{ color:"var(--text-muted)", fontSize:16 }}>Page not found</p>
                    <a href="/movies" className="btn btn-primary btn-lg">Go to Movies</a>
                  </div>
                } />

              </Routes>
            </Suspense>
          </BrowserRouter>
          </CityProvider>
        </SocketProvider>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}