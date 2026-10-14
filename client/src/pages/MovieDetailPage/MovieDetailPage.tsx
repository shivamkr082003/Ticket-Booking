// import { useState } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import { motion, AnimatePresence } from "framer-motion";
// import Navbar from "../../components/common/Navbar/Navbar.tsx";
// import { Stars, Toast } from "../../components/common/index.tsx";
// import { useMovie }  from "../../hooks/useMovie.ts";
// import { useMovies } from "../../hooks/useMovies.ts";
// import type { ReleaseStatus } from "../../types/movie.types.ts";
// import "./MovieDetailPage.css";

// /* ── Helpers ── */
// function formatDuration(mins: number) {
//   const h = Math.floor(mins / 60), m = mins % 60;
//   return h > 0 ? `${h}h ${m}m` : `${m}m`;
// }
// function formatDate(iso: string) {
//   return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
// }
// function getInitials(name: string) {
//   return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
// }
// function getYouTubeId(url: string) {
//   const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]{11})/);
//   return m ? m[1] : null;
// }
// function statusLabel(s: ReleaseStatus) {
//   return s === "RELEASED" ? "Now Showing" : s === "COMING_SOON" ? "Coming Soon" : "Banned";
// }
// function statusClass(s: ReleaseStatus) {
//   return s === "RELEASED" ? "released" : s === "COMING_SOON" ? "coming-soon" : "banned";
// }

// /* ── Skeleton ── */
// function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
//   return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius }} />;
// }

// /* ── Page ── */
// export default function MovieDetailPage() {
//   const { id }   = useParams<{ id: string }>();
//   const navigate = useNavigate();

//   const { movie, loading, error } = useMovie(id);

//   // Fetch similar movies (same genre) — only when we know the genre
//   const { movies: allMovies } = useMovies({ limit: 12 });
//   const similar = movie
//     ? allMovies.filter(m => m._id !== id && m.genre.some(g => movie.genre.includes(g))).slice(0, 4)
//     : [];

//   const [wishlisted,  setWishlisted]  = useState(false);
//   const [showTrailer, setShowTrailer] = useState(false);
//   const [showShare,   setShowShare]   = useState(false);
//   const [toast,       setToast]       = useState<string | null>(null);

//   /* ── Loading state ── */
//   if (loading) {
//     return (
//       <div className="page">
//         <div className="grain" /><div className="scanlines" />
//         <Navbar />
//         <div className="mdp-skeleton-hero">
//           <div className="mdp-hero-content">
//             <div className="mdp-hero-inner">
//               <Skeleton w={220} h={320} radius={16} />
//               <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
//                 <Skeleton w={120} h={14} />
//                 <Skeleton w="55%" h={80} />
//                 <Skeleton w={200} h={14} />
//                 <Skeleton w="40%" h={14} />
//                 <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
//                   <Skeleton w={140} h={48} radius={10} />
//                   <Skeleton w={120} h={48} radius={10} />
//                   <Skeleton w={48}  h={48} radius={10} />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   /* ── Error state ── */
//   if (error || !movie) {
//     return (
//       <div className="page">
//         <div className="grain" /><div className="scanlines" />
//         <Navbar />
//         <div className="mdp-error">
//           <div className="mdp-error-code">404</div>
//           <p className="mdp-error-msg">Movie not found</p>
//           <p className="mdp-error-sub">{error}</p>
//           <button className="mdp-btn-back" onClick={() => navigate(-1)}>← Go Back</button>
//         </div>
//       </div>
//     );
//   }

//   const ytId       = getYouTubeId(movie.trailerUrl);
//   const thumbUrl   = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : movie.posterUrl;
//   const isReleased = movie.releaseStatus === "RELEASED";

//   return (
//     <div className="page">
//       <div className="grain" /><div className="scanlines" />
//       <Navbar />

//       {/* ══ HERO ══ */}
//       <motion.div className="mdp-hero"
//         initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>

//         <motion.div className="mdp-hero-bg"
//           style={{ backgroundImage: `url(${movie.posterUrl})` }}
//           initial={{ scale: 1.06 }} animate={{ scale: 1 }}
//           transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
//         <div className="mdp-hero-blur" />
//         <div className="mdp-hero-grad-l" />
//         <div className="mdp-hero-grad-b" />
//         <div className="mdp-hero-grid" />

//         <div className="mdp-hero-content">
//           <div className="mdp-hero-inner">

//             {/* Poster */}
//             <motion.div className="mdp-poster-wrap"
//               initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
//               <img className="mdp-poster" src={movie.posterUrl} alt={movie.name} />
//               <div className="mdp-poster-shine" />
//               <div className="mdp-cert-badge">{movie.certificate}</div>
//             </motion.div>

//             {/* Text */}
//             <motion.div className="mdp-hero-text"
//               initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
//               transition={{ delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>

//               {/* Breadcrumb */}
//               <div className="mdp-breadcrumb">
//                 <Link to="/">Home</Link>
//                 <span>›</span>
//                 <Link to="/movies">Movies</Link>
//                 <span>›</span>
//                 <span className="mdp-breadcrumb-cur">{movie.name}</span>
//               </div>

//               {/* Badges */}
//               <div className="mdp-badge-row">
//                 <span className={`mdp-status-badge ${statusClass(movie.releaseStatus)}`}>
//                   {statusLabel(movie.releaseStatus)}
//                 </span>
//                 {movie.genre.map(g => <span key={g} className="mdp-genre-pill">{g}</span>)}
//                 <span className="mdp-cert-pill">{movie.certificate}</span>
//               </div>

//               <h1 className="mdp-title">{movie.name}</h1>
//               <p className="mdp-director">Directed by <span>{movie.director}</span></p>

//               {/* Rating + meta */}
//               <div className="mdp-meta-row">
//                 <div className="mdp-rating-box">
//                   <Stars ratingOutOf10={movie.rating} size={18} />
//                   <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
//                     <span className="mdp-rating-num">{movie.rating.toFixed(1)}</span>
//                     <span className="mdp-rating-max">/10</span>
//                   </div>
//                 </div>
//                 <div className="mdp-meta-sep" />
//                 {[
//                   { label: "Duration",     value: formatDuration(movie.duration) },
//                   { label: "Release Date", value: formatDate(movie.releaseDate) },
//                   { label: "Certificate", value: movie.certificate },
//                 ].map((item, i) => (
//                   <>
//                     {i > 0 && <div key={`sep-${i}`} className="mdp-meta-sep" />}
//                     <div key={item.label} className="mdp-meta-item">
//                       <span className="mdp-meta-label">{item.label}</span>
//                       <span className="mdp-meta-value">{item.value}</span>
//                     </div>
//                   </>
//                 ))}
//               </div>

//               {/* Languages */}
//               <div className="mdp-lang-row">
//                 {movie.languages.map(l => <span key={l} className="mdp-lang-chip">{l}</span>)}
//               </div>

//               {/* CTAs */}
//               <div className="mdp-cta-row">
//                 {isReleased ? (
//                   <motion.button className="mdp-btn-book"
//                     whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
//                     onClick={() => navigate(`/movies/${movie._id}/book`)}>
//                     🎟 Book Tickets
//                   </motion.button>
//                 ) : (
//                   <motion.button className="mdp-btn-notify"
//                     whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
//                     onClick={() => setToast("You'll be notified when tickets go live!")}>
//                     🔔 Notify Me
//                   </motion.button>
//                 )}

//                 <motion.button className="mdp-btn-trailer"
//                   whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
//                   onClick={() => setShowTrailer(true)}>
//                   ▶ Watch Trailer
//                 </motion.button>

//                 <motion.button
//                   className={`mdp-btn-icon ${wishlisted ? "active" : ""}`}
//                   whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
//                   onClick={() => { setWishlisted(w => !w); setToast(wishlisted ? "Removed from wishlist" : "Added to wishlist!"); }}>
//                   {wishlisted ? "♥" : "♡"}
//                 </motion.button>

//                 <motion.button className="mdp-btn-icon"
//                   whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
//                   onClick={() => setShowShare(true)}>
//                   ↗
//                 </motion.button>
//               </div>
//             </motion.div>
//           </div>
//         </div>
//       </motion.div>

//       {/* ══ BODY ══ */}
//       <div className="mdp-body">

//         {/* LEFT COLUMN */}
//         <div>
//           {/* About */}
//           <Section title="About the Film">
//             <p className="mdp-description">{movie.description}</p>
//           </Section>

//           {/* Cast */}
//           <Section title="Cast">
//             <div className="mdp-cast-grid">
//               {movie.casts.map((name, i) => (
//                 <motion.div key={i} className="mdp-cast-card"
//                   initial={{ opacity: 0, scale: 0.9 }}
//                   whileInView={{ opacity: 1, scale: 1 }}
//                   viewport={{ once: true }}
//                   transition={{ delay: i * 0.05 }}>
//                   <div className="mdp-cast-avatar">{getInitials(name)}</div>
//                   <span className="mdp-cast-name">{name}</span>
//                 </motion.div>
//               ))}
//             </div>
//           </Section>

//           {/* Genre */}
//           <Section title="Genre">
//             <div className="mdp-genre-grid">
//               {movie.genre.map(g => (
//                 <motion.span key={g} className="mdp-genre-tag" whileHover={{ scale: 1.05 }}>{g}</motion.span>
//               ))}
//             </div>
//           </Section>

//           {/* Trailer thumbnail */}
//           <Section title="Trailer">
//             <div className="mdp-trailer-wrap" onClick={() => setShowTrailer(true)}>
//               <img className="mdp-trailer-thumb" src={thumbUrl} alt="Trailer" />
//               <div className="mdp-trailer-overlay">
//                 <motion.div className="mdp-play-circle" whileHover={{ scale: 1.1 }}>▶</motion.div>
//               </div>
//               <span className="mdp-trailer-label">Official Trailer</span>
//             </div>
//           </Section>

//           {/* Similar movies */}
//           {similar.length > 0 && (
//             <Section title="You May Also Like">
//               <div className="mdp-similar-list">
//                 {similar.map((sm, i) => (
//                   <motion.div key={sm._id} className="mdp-similar-card"
//                     initial={{ opacity: 0, x: -16 }}
//                     whileInView={{ opacity: 1, x: 0 }}
//                     viewport={{ once: true }}
//                     transition={{ delay: i * 0.06 }}
//                     onClick={() => navigate(`/movies/${sm._id}`)}>
//                     <img className="mdp-similar-poster" src={sm.posterUrl} alt={sm.name} />
//                     <div className="mdp-similar-info">
//                       <span className="mdp-similar-title">{sm.name}</span>
//                       <span className="mdp-similar-genre">{sm.genre.join(", ")}</span>
//                       <span className="mdp-similar-rating">★ {sm.rating.toFixed(1)}/10</span>
//                       <span className={`mdp-similar-status ${statusClass(sm.releaseStatus)}`}>
//                         {statusLabel(sm.releaseStatus)}
//                       </span>
//                     </div>
//                   </motion.div>
//                 ))}
//               </div>
//             </Section>
//           )}
//         </div>

//         {/* RIGHT SIDEBAR */}
//         <motion.aside className="mdp-sidebar"
//           initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
//           transition={{ delay: 0.4, ease: [0.22, 1, 0.36, 1] }}>

//           {/* Book card */}
//           <div className="mdp-book-card">
//             <h3 className="mdp-book-title">{isReleased ? "Book Your Seats" : "Coming Soon"}</h3>
//             <p className="mdp-book-sub">
//               {isReleased ? "Select your preferred showtime and seats." : `Releases on ${formatDate(movie.releaseDate)}`}
//             </p>
//             {isReleased && (
//               <>
//                 <div className="mdp-price-row">
//                   <span className="mdp-price-from">From</span>
//                   <span className="mdp-price-num">₹200</span>
//                   <span className="mdp-price-period">/ ticket</span>
//                 </div>
//                 <p className="mdp-book-note">Price varies by format &amp; seat type</p>
//               </>
//             )}
//             <motion.button
//               className={isReleased ? "mdp-btn-book-sidebar" : "mdp-btn-notify-sidebar"}
//               whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
//               onClick={() => isReleased
//                 ? navigate(`/movies/${movie._id}/book`)
//                 : setToast("You'll be notified when tickets go live!")}>
//               {isReleased ? "🎟 Book Tickets" : "🔔 Notify Me"}
//             </motion.button>
//           </div>

//           {/* Info card */}
//           <div className="mdp-info-card">
//             {[
//               { key: "Status",       val: statusLabel(movie.releaseStatus), cls: movie.releaseStatus === "RELEASED" ? "green" : "orange" },
//               { key: "Director",     val: movie.director,                   cls: "" },
//               { key: "Duration",     val: formatDuration(movie.duration),   cls: "" },
//               { key: "Release Date", val: formatDate(movie.releaseDate),    cls: "" },
//               { key: "Certificate",  val: movie.certificate,                cls: "orange" },
//               { key: "Rating",       val: `${movie.rating.toFixed(1)} / 10`, cls: "orange" },
//               { key: "Languages",    val: movie.languages.join(", "),       cls: "" },
//               { key: "Genres",       val: movie.genre.join(", "),           cls: "" },
//             ].map(row => (
//               <div key={row.key} className="mdp-info-row">
//                 <span className="mdp-info-key">{row.key}</span>
//                 <span className={`mdp-info-val ${row.cls}`}>{row.val}</span>
//               </div>
//             ))}
//           </div>
//         </motion.aside>
//       </div>

//       {/* ══ TRAILER MODAL ══ */}
//       <AnimatePresence>
//         {showTrailer && (
//           <motion.div className="mdp-modal-backdrop"
//             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//             onClick={() => setShowTrailer(false)}>
//             <motion.div className="mdp-trailer-modal"
//               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
//               transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
//               onClick={e => e.stopPropagation()}>
//               <button className="mdp-modal-close" onClick={() => setShowTrailer(false)}>✕</button>
//               <div className="mdp-iframe-wrap">
//                 {ytId ? (
//                   <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
//                     title={`${movie.name} Trailer`}
//                     allow="autoplay; encrypted-media" allowFullScreen />
//                 ) : (
//                   <div className="mdp-no-embed">
//                     <p>Cannot embed this trailer directly.</p>
//                     <a href={movie.trailerUrl} target="_blank" rel="noreferrer">Open Trailer ↗</a>
//                   </div>
//                 )}
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ══ SHARE MODAL ══ */}
//       <AnimatePresence>
//         {showShare && (
//           <motion.div className="mdp-modal-backdrop"
//             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//             onClick={() => setShowShare(false)}>
//             <motion.div className="mdp-share-modal"
//               initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
//               transition={{ duration: 0.25 }}
//               onClick={e => e.stopPropagation()}>
//               <button className="mdp-modal-close-sm" onClick={() => setShowShare(false)}>✕</button>
//               <h3 className="mdp-share-title">Share Movie</h3>
//               <p className="mdp-share-sub">Share "{movie.name}" with friends</p>
//               <div className="mdp-share-btns">
//                 {[
//                   { icon: "🔗", label: "Copy Link",  fn: () => { navigator.clipboard.writeText(window.location.href); setToast("Link copied!"); setShowShare(false); } },
//                   { icon: "🐦", label: "Share on X", fn: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(movie.name)}&url=${encodeURIComponent(window.location.href)}`) },
//                   { icon: "💬", label: "WhatsApp",   fn: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${movie.name} - ${window.location.href}`)}`) },
//                 ].map(b => (
//                   <motion.button key={b.label} className="mdp-share-btn"
//                     whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={b.fn}>
//                     <span>{b.icon}</span>{b.label}
//                   </motion.button>
//                 ))}
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ══ TOAST ══ */}
//       <AnimatePresence>
//         {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
//       </AnimatePresence>
//     </div>
//   );
// }

// /* ── Section wrapper ── */
// function Section({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <motion.div className="mdp-section"
//       initial={{ opacity: 0, y: 24 }}
//       whileInView={{ opacity: 1, y: 0 }}
//       viewport={{ once: true }}
//       transition={{ duration: 0.5 }}>
//       <h2 className="mdp-section-title">{title}</h2>
//       {children}
//     </motion.div>
//   );
// }