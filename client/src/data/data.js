/* ───────── DATA ───────── */
export const MOVIES = [
  {
    id: 1, title: "Neon Requiem", genre: "Sci-Fi Thriller", rating: "9.1",
    duration: "2h 24m", year: "2026", badge: "NOW SHOWING",
    badgeHex: "#ef4444", accentHex: "#ff6b35",
    poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&q=80",
    bg: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1800&q=90",
    description: "In a city where memories are currency, a rogue detective hunts a thief who steals the past.",
    cast: ["A. Rivera", "J. Chen", "M. Okafor"], screens: 14, price: "₹280",
  },
  {
    id: 2, title: "Obsidian Sky", genre: "Epic Fantasy", rating: "8.7",
    duration: "3h 02m", year: "2026", badge: "TRENDING",
    badgeHex: "#a855f7", accentHex: "#c084fc",
    poster: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=400&q=80",
    bg: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1800&q=90",
    description: "An ancient war erupts between realms as a forgotten heir reclaims a throne made of shadows.",
    cast: ["L. Fontaine", "R. Nakamura", "S. Adeyemi"], screens: 22, price: "₹320",
  },
  {
    id: 3, title: "Hollow Signal", genre: "Psychological Horror", rating: "8.4",
    duration: "1h 58m", year: "2026", badge: "NEW",
    badgeHex: "#22c55e", accentHex: "#4ade80",
    poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&q=80",
    bg: "https://images.unsplash.com/photo-1518655048521-f130df041f66?w=1800&q=90",
    description: "A radio operator receives transmissions from the future — all of them her own voice, screaming.",
    cast: ["P. Volkov", "T. Osei", "C. Laurent"], screens: 9, price: "₹240",
  },
  {
    id: 4, title: "Last Meridian", genre: "Action Drama", rating: "8.9",
    duration: "2h 15m", year: "2026", badge: "HOT",
    badgeHex: "#f59e0b", accentHex: "#fbbf24",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80",
    bg: "https://images.unsplash.com/photo-1475274047050-1d0c0975864c?w=1800&q=90",
    description: "A mercenary on her final mission discovers the city she's been hired to destroy is the one she built.",
    cast: ["D. Mercer", "A. Singh", "O. Johansson"], screens: 18, price: "₹300",
  },
];

export const UPCOMING = [
  { title: "Veil Protocol", genre: "Espionage", date: "Mar 21", hype: 94, img: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80" },
  { title: "Carbon Ghost", genre: "Sci-Fi", date: "Apr 4", hype: 88, img: "https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?w=500&q=80" },
  { title: "Savage Dawn", genre: "Western", date: "Apr 18", hype: 76, img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&q=80" },
  { title: "Deep Red", genre: "Thriller", date: "May 2", hype: 91, img: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=500&q=80" },
  { title: "Static Hymn", genre: "Drama", date: "May 16", hype: 82, img: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=500&q=80" },
];

export const CINEMAS = [
  { name: "CINEVERSE IMAX", location: "Connaught Place", dist: "2.1 km", screens: 8, rating: "4.9", tags: ["IMAX", "Dolby", "4DX", "Bar"] },
  { name: "GRAND CINEPLEX", location: "Cyber Hub", dist: "4.7 km", screens: 12, rating: "4.7", tags: ["IMAX", "Recliner", "Dine-in"] },
  { name: "NEXUS CINEMAS", location: "Vasant Kunj", dist: "7.3 km", screens: 6, rating: "4.5", tags: ["3D", "Dolby", "Parking"] },
];

export const REVIEWS = [
  { name: "Rahul M.", movie: "Neon Requiem", stars: 5, text: "Absolutely mind-blowing visuals. Best sci-fi I've seen in years. The ending left me speechless.", initials: "RM", ago: "2 days ago" },
  { name: "Priya K.", movie: "Obsidian Sky", stars: 5, text: "Epic world-building and stunning performances. Stayed for the second show immediately after.", initials: "PK", ago: "1 day ago" },
  { name: "Arjun S.", movie: "Last Meridian", stars: 4, text: "Non-stop action with a surprisingly emotional core. An absolute must-watch on the big screen.", initials: "AS", ago: "3 hours ago" },
];

export const TIMES = ["10:30 AM", "1:15 PM", "4:00 PM", "7:45 PM", "10:30 PM"];
export const OCCUPANCY = [42, 67, 55, 81, 48];
export const FORMATS = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];
export const TICKER = ["🎬 NOW BOOKING: NEON REQUIEM", "⭐ TRENDING: OBSIDIAN SKY — 8.7", "🔥 NEW: HOLLOW SIGNAL", "🎟 PRIME PASS — ₹799/MO", "📍 14 CINEMAS NEAR YOU", "🏆 BEST PICTURE: LAST MERIDIAN"];