// Demo data for local development: movies, theatres, shows, bookings, reviews, coupons…
//   npm run seed            → refuses if the DB already has movies/theatres
//   npm run seed -- --reset → wipes the app collections first
import dotenv from "dotenv";
dotenv.config();

import crypto   from "crypto";
import mongoose from "mongoose";
import connectDB from "../config/db.js";

import User          from "../models/user.model.js";
import Movie         from "../models/movie.model.js";
import Theatre       from "../models/theatre.model.js";
import Show          from "../models/show.model.js";
import Booking       from "../models/bookings.model.js";
import Review        from "../models/review.model.js";
import TheatreReview from "../models/theatreReview.model.js";
import Coupon        from "../models/coupon.model.js";
import SupportTicket from "../models/supportTicket.model.js";
import Notification  from "../models/notification.model.js";
import WalletTxn     from "../models/walletTxn.model.js";
import AuditLog      from "../models/auditLog.model.js";
import GiftCard      from "../models/giftCard.model.js";

import { BOOKING_STATUS, REFUND_STATUS, PRIME_PLAN } from "../utils/constants.js";
import { priceSeats, snapshotLayout, seatCount, minCategoryPrice } from "../utils/seatLayout.js";
import { priceAdjustmentsFor, totalPct, applyPct } from "../utils/dynamicPricing.js";
import { bookingFeeFor } from "../services/pricing.service.js";

// ── Deterministic randomness ─────────────────────────────
let _s = 20261016;
const rand  = () => ((_s = (_s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const int   = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick  = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (arr, n) => shuffle(arr).slice(0, n);
const ticketCode = () => "CV-" + crypto.randomBytes(6).toString("hex").toUpperCase();

const DAY  = 24 * 3600 * 1000;
const NOW  = new Date();
const daysAgo = (d) => new Date(NOW.getTime() - d * DAY);
const daysFromNow = (d) => new Date(NOW.getTime() + d * DAY);
// A Date for `dayOffset` days from today at hh:mm India time
const istAt = (dayOffset, hh, mm) => {
    const base = new Date(NOW.getTime() + 5.5 * 3600 * 1000);          // shift to IST wall clock
    const y = base.getUTCFullYear(), m = base.getUTCMonth(), d = base.getUTCDate() + dayOffset;
    return new Date(Date.UTC(y, m, d, hh, mm) - 5.5 * 3600 * 1000);
};

const WIKI = "https://upload.wikimedia.org/wikipedia/en";
const YT   = (id) => `https://www.youtube.com/watch?v=${id}`;

// ── Movies ───────────────────────────────────────────────
const MOVIES = [
    // Now showing
    { name: "Dune: Part Two", genre: ["Sci-Fi", "Adventure", "Drama"], languages: ["English", "Hindi"], duration: 166, certificate: "UA", director: "Denis Villeneuve",
      casts: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Austin Butler", "Florence Pugh", "Javier Bardem"],
      posterUrl: `${WIKI}/5/52/Dune_Part_Two_poster.jpeg`, trailer: "Way9Dexny3w", released: 12,
      description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he must prevent a terrible future only he can foresee." },
    { name: "Oppenheimer", genre: ["Biography", "Drama", "History"], languages: ["English", "Hindi"], duration: 180, certificate: "UA", director: "Christopher Nolan",
      casts: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr.", "Florence Pugh"],
      posterUrl: `${WIKI}/4/4a/Oppenheimer_%28film%29.jpg`, trailer: "uYPbbksJxIg", released: 30,
      description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb — a gripping portrait of genius, hubris and the moral weight of a world-changing invention." },
    { name: "Interstellar", genre: ["Sci-Fi", "Drama", "Adventure"], languages: ["English"], duration: 169, certificate: "UA", director: "Christopher Nolan",
      casts: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
      posterUrl: `${WIKI}/b/bc/Interstellar_film_poster.jpg`, trailer: "zSWdZVtXT7E", released: 9,
      description: "Back on the big screen in IMAX. When Earth becomes uninhabitable, a team of explorers travels through a wormhole near Saturn in search of a new home for humanity." },
    { name: "Jawan", genre: ["Action", "Thriller"], languages: ["Hindi", "Tamil", "Telugu"], duration: 169, certificate: "UA", director: "Atlee",
      casts: ["Shah Rukh Khan", "Nayanthara", "Vijay Sethupathi", "Deepika Padukone", "Sanya Malhotra"],
      posterUrl: `${WIKI}/3/39/Jawan_film_poster.jpg`, trailer: "MWOlnZSnXJo", released: 25,
      description: "A high-octane action thriller about a man driven by a personal vendetta who sets out to rectify the wrongs in society, while keeping a promise made years ago." },
    { name: "Pathaan", genre: ["Action", "Thriller"], languages: ["Hindi", "Tamil", "Telugu"], duration: 146, certificate: "UA", director: "Siddharth Anand",
      casts: ["Shah Rukh Khan", "Deepika Padukone", "John Abraham", "Dimple Kapadia"],
      posterUrl: `${WIKI}/c/c3/Pathaan_film_poster.jpg`, trailer: "vqu4z34wENw", released: 40,
      description: "An exiled RAW agent returns to take down a rogue mercenary group planning a devastating attack on India, in this globe-trotting spy actioner from the YRF Spy Universe." },
    { name: "KGF: Chapter 2", genre: ["Action", "Drama", "Crime"], languages: ["Kannada", "Hindi", "Telugu", "Tamil"], duration: 168, certificate: "UA", director: "Prashanth Neel",
      casts: ["Yash", "Sanjay Dutt", "Raveena Tandon", "Srinidhi Shetty", "Prakash Raj"],
      posterUrl: `${WIKI}/d/d0/K.G.F_Chapter_2.jpg`, trailer: "JKa05nyUmuQ", released: 35,
      description: "Rocky, now the undisputed king of the Kolar Gold Fields, must defend his empire against the ruthless Adheera and a government determined to bring him down." },
    { name: "Pushpa 2: The Rule", genre: ["Action", "Drama", "Crime"], languages: ["Telugu", "Hindi", "Tamil", "Malayalam"], duration: 200, certificate: "UA", director: "Sukumar",
      casts: ["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil", "Jagapathi Babu"],
      posterUrl: `${WIKI}/1/11/Pushpa_2-_The_Rule.jpg`, trailer: "1kVK0MZlbI4", released: 18,
      description: "Pushpa Raj tightens his grip on the red sandalwood smuggling syndicate, while his bitter rivalry with SP Bhanwar Singh Shekhawat reaches boiling point." },
    { name: "Animal", genre: ["Action", "Crime", "Drama"], languages: ["Hindi", "Telugu"], duration: 201, certificate: "A", director: "Sandeep Reddy Vanga",
      casts: ["Ranbir Kapoor", "Rashmika Mandanna", "Anil Kapoor", "Bobby Deol", "Triptii Dimri"],
      posterUrl: `${WIKI}/9/90/Animal_%282023_film%29_poster.jpg`, trailer: "8FkLRUJj-o0", released: 28,
      description: "A son's obsessive love for his distant father spirals into a violent war against the enemies who tried to take everything from his family." },
    { name: "Stree 2", genre: ["Horror", "Comedy"], languages: ["Hindi"], duration: 147, certificate: "UA", director: "Amar Kaushik",
      casts: ["Shraddha Kapoor", "Rajkummar Rao", "Pankaj Tripathi", "Abhishek Banerjee", "Aparshakti Khurana"],
      posterUrl: `${WIKI}/a/a1/Stree_2.jpg`, trailer: "KVnheXywIbY", released: 6,
      description: "The town of Chanderi is haunted again — this time by the headless terror Sarkata. Vicky and his friends team up with Stree herself to save the town's women." },
    { name: "Kalki 2898 AD", genre: ["Sci-Fi", "Action", "Fantasy"], languages: ["Telugu", "Hindi", "Tamil"], duration: 181, certificate: "UA", director: "Nag Ashwin",
      casts: ["Prabhas", "Amitabh Bachchan", "Kamal Haasan", "Deepika Padukone", "Disha Patani"],
      posterUrl: `${WIKI}/4/4c/Kalki_2898_AD.jpg`, trailer: "kQDd1AhGIHk", released: 21,
      description: "In a dystopian future ruled by the Complex, a bounty hunter crosses paths with a pregnant woman carrying a child prophesied to change the world." },
    { name: "Leo", genre: ["Action", "Thriller", "Crime"], languages: ["Tamil", "Telugu", "Hindi"], duration: 164, certificate: "UA", director: "Lokesh Kanagaraj",
      casts: ["Vijay", "Sanjay Dutt", "Trisha Krishnan", "Arjun Sarja", "Gautham Vasudev Menon"],
      posterUrl: `${WIKI}/7/75/Leo_%282023_Indian_film%29.jpg`, trailer: "Po3jStA673E", released: 14,
      description: "A mild-mannered café owner in Himachal becomes the target of a dangerous drug cartel convinced he is someone from their violent past." },
    { name: "Inside Out 2", genre: ["Animation", "Comedy", "Family"], languages: ["English", "Hindi"], duration: 96, certificate: "U", director: "Kelsey Mann",
      casts: ["Amy Poehler", "Maya Hawke", "Kensington Tallman", "Liza Lapira", "Tony Hale"],
      posterUrl: `${WIKI}/f/f7/Inside_Out_2_poster.jpg`, trailer: "LEjhY15eCx0", released: 10,
      description: "Riley is now a teenager, and Headquarters is undergoing a sudden demolition to make room for some unexpected new Emotions — led by Anxiety." },
    { name: "Deadpool & Wolverine", genre: ["Action", "Comedy", "Superhero"], languages: ["English", "Hindi"], duration: 128, certificate: "A", director: "Shawn Levy",
      casts: ["Ryan Reynolds", "Hugh Jackman", "Emma Corrin", "Matthew Macfadyen"],
      posterUrl: `${WIKI}/4/4c/Deadpool_%26_Wolverine_poster.jpg`, trailer: "73_1biulkYk", released: 16,
      description: "A listless Wade Wilson is pulled out of retirement by the TVA and must team up with a reluctant Wolverine to save his universe." },
    { name: "12th Fail", genre: ["Drama", "Biography"], languages: ["Hindi"], duration: 147, certificate: "U", director: "Vidhu Vinod Chopra",
      casts: ["Vikrant Massey", "Medha Shankr", "Anant V Joshi", "Anshumaan Pushkar"],
      posterUrl: `${WIKI}/f/f2/12th_Fail_poster.jpeg`, trailer: "KjbtuqENvVE", released: 45,
      description: "Based on the true story of IPS officer Manoj Kumar Sharma, who rose from extreme poverty in Chambal to crack the UPSC exam against all odds." },
    { name: "Laapataa Ladies", genre: ["Comedy", "Drama"], languages: ["Hindi"], duration: 124, certificate: "U", director: "Kiran Rao",
      casts: ["Nitanshi Goel", "Pratibha Ranta", "Sparsh Shrivastava", "Ravi Kishan", "Chhaya Kadam"],
      posterUrl: `${WIKI}/5/52/Laapataa_Ladies_poster.jpg`, trailer: "sm8t7aW5_4s", released: 33,
      description: "Two young brides get swapped on a crowded train in rural India, setting off a heart-warming and hilarious search across Nirmal Pradesh." },
    { name: "Kantara: Chapter 1", genre: ["Action", "Drama", "Mythology"], languages: ["Kannada", "Hindi", "Telugu", "Tamil"], duration: 168, certificate: "UA", director: "Rishab Shetty",
      casts: ["Rishab Shetty", "Rukmini Vasanth", "Jayaram", "Gulshan Devaiah"],
      posterUrl: `${WIKI}/6/69/Kantara-_Chapter_1_poster.jpg`, trailer: "M2OnifMgvps", released: 3,
      description: "Set in the Kadamba era, this prequel traces the origins of the divine forest spirits and the legend of Kantara." },
    { name: "Sitaare Zameen Par", genre: ["Comedy", "Drama", "Sports"], languages: ["Hindi"], duration: 155, certificate: "U", director: "R. S. Prasanna",
      casts: ["Aamir Khan", "Genelia Deshmukh", "Aroush Datta", "Gopi Krishnan Varma"],
      posterUrl: `${WIKI}/4/44/Sitaare_Zameen_Par_poster.jpg`, trailer: "YH6k5weqwy8", released: 20,
      description: "A disgraced basketball coach is sentenced to community service training a team of neurodivergent players — and learns more from them than he ever teaches." },
    { name: "Saiyaara", genre: ["Romance", "Drama", "Musical"], languages: ["Hindi"], duration: 156, certificate: "UA", director: "Mohit Suri",
      casts: ["Ahaan Panday", "Aneet Padda", "Alam Khan", "Varun Badola"],
      posterUrl: null, wiki: "Saiyaara", trailer: "9r-tT5IN0vg", released: 8,
      description: "A volatile young musician and a shy lyricist find each other — and the song of their lives — until fate tests the love they've built." },
    { name: "Avatar: Fire and Ash", genre: ["Sci-Fi", "Adventure", "Fantasy"], languages: ["English", "Hindi", "Tamil", "Telugu"], duration: 192, certificate: "UA", director: "James Cameron",
      casts: ["Sam Worthington", "Zoe Saldaña", "Sigourney Weaver", "Stephen Lang", "Oona Chaplin"],
      posterUrl: `${WIKI}/9/95/Avatar_Fire_and_Ash_poster.jpeg`, trailer: "nb_fFj_0rq8", released: 2,
      description: "Jake and Neytiri's family face a new, aggressive Na'vi tribe — the Ash People — as the conflict on Pandora escalates beyond anything they've known." },

    // Coming soon
    { name: "Avengers: Doomsday", genre: ["Action", "Superhero", "Sci-Fi"], languages: ["English", "Hindi", "Tamil", "Telugu"], duration: 150, certificate: "UA", director: "Anthony & Joe Russo",
      casts: ["Robert Downey Jr.", "Chris Hemsworth", "Anthony Mackie", "Pedro Pascal", "Vanessa Kirby"],
      posterUrl: `${WIKI}/e/ee/Avengers_Doomsday_poster.jpg`, trailer: "irVNGjRFZGk", upcoming: 63,
      description: "The Avengers and their allies must come together once more as Victor von Doom rises to threaten the entire multiverse." },
    { name: "Dune: Part Three", genre: ["Sci-Fi", "Adventure", "Drama"], languages: ["English", "Hindi"], duration: 160, certificate: "UA", director: "Denis Villeneuve",
      casts: ["Timothée Chalamet", "Zendaya", "Florence Pugh", "Robert Pattinson", "Jason Momoa"],
      posterUrl: `${WIKI}/7/7b/Dune_Part_Three_poster.jpg`, trailer: "NdvqHc56lE0", upcoming: 63,
      description: "Years after his rise to power, Emperor Paul Atreides confronts the terrible consequences of the holy war waged in his name." },
    { name: "Ramayana: Part 1", genre: ["Mythology", "Action", "Fantasy"], languages: ["Hindi", "Tamil", "Telugu", "Kannada", "Malayalam"], duration: 170, certificate: "U", director: "Nitesh Tiwari",
      casts: ["Ranbir Kapoor", "Sai Pallavi", "Yash", "Sunny Deol", "Ravi Dubey"],
      posterUrl: `${WIKI}/4/48/Ramayana_Part_1_%28poster%29.jpg`, trailer: "8HiWKbDTc7w", upcoming: 23,
      description: "An epic retelling of the timeless tale of Prince Rama, Sita and the mighty Ravana — brought to life with music by Hans Zimmer and A. R. Rahman." },
    { name: "Toxic", genre: ["Action", "Crime", "Thriller"], languages: ["Kannada", "English", "Hindi"], duration: 155, certificate: "A", director: "Geetu Mohandas",
      casts: ["Yash", "Nayanthara", "Kiara Advani", "Huma Qureshi", "Tara Sutaria"],
      posterUrl: `${WIKI}/0/0b/Toxic-_A_Fairy_Tale_for_Grown-Ups_poster.jpg`, trailer: "aF08WVSvCok", upcoming: 41,
      description: "A fairy tale for grown-ups: a gangster rises through the drug cartels of 1960s Goa in this stylish, brutal crime saga." },
];

// ── Cities & theatres ────────────────────────────────────
const SCREEN_TYPES = {
    standard: (name, base = 180) => ({
        name, sound: "Dolby 7.1", projection: "4K Digital", photo: "",
        layout: {
            rows: "ABCDEFGHIJKL".split(""), cols: 18, aisles: [4, 14], accessible: ["A1", "A2"],
            categories: [
                { key: "REGULAR",  label: "Regular",  price: base,       rows: ["A", "B", "C", "D"] },
                { key: "PREMIUM",  label: "Premium",  price: base + 100, rows: ["E", "F", "G", "H", "I", "J"] },
                { key: "RECLINER", label: "Recliner", price: base + 270, rows: ["K", "L"] },
            ],
        },
    }),
    atmos: (name, base = 220) => ({
        name, sound: "Dolby Atmos", projection: "4K Laser", photo: "",
        layout: {
            rows: "ABCDEFGHIJKLM".split(""), cols: 20, aisles: [5, 15], accessible: ["A1", "A2", "A19", "A20"],
            categories: [
                { key: "REGULAR",  label: "Regular",  price: base,       rows: ["A", "B", "C"] },
                { key: "PREMIUM",  label: "Premium",  price: base + 110, rows: ["D", "E", "F", "G", "H", "I", "J"] },
                { key: "RECLINER", label: "Recliner", price: base + 330, rows: ["K", "L", "M"] },
            ],
        },
    }),
    imax: (name) => ({
        name, sound: "IMAX 12-Channel", projection: "IMAX Laser", photo: "",
        layout: {
            rows: "ABCDEFGHIJKLMN".split(""), cols: 24, aisles: [6, 18], accessible: ["A1", "A2", "A23", "A24"],
            categories: [
                { key: "REGULAR",  label: "Classic",  price: 380, rows: ["A", "B", "C", "D"] },
                { key: "PREMIUM",  label: "Prime",    price: 520, rows: ["E", "F", "G", "H", "I", "J", "K"] },
                { key: "RECLINER", label: "Recliner", price: 780, rows: ["L", "M", "N"] },
            ],
        },
    }),
    lounge: (name) => ({
        name, sound: "Dolby Atmos", projection: "4K Laser", photo: "",
        layout: {
            rows: "ABCDEF".split(""), cols: 10, aisles: [5], accessible: ["A1"],
            categories: [{ key: "RECLINER", label: "Luxury Recliner", price: 750, rows: ["A", "B", "C", "D", "E", "F"] }],
        },
    }),
};

const THEATRES = [
    // owner index, name, city, state, pincode, address, lat, lng, screens, amenities, phone
    [0, "Cineverse Grand Andheri",        "Mumbai",    "Maharashtra",   400053, "Infiniti Mall, New Link Road, Andheri West", 19.1405, 72.8333, ["imax:IMAX Hall", "atmos:Audi 2", "standard:Audi 3", "lounge:Gold Lounge"], 195],
    [0, "Starlight Cinemas Lower Parel",  "Mumbai",    "Maharashtra",   400013, "Phoenix Palladium, Senapati Bapat Marg, Lower Parel", 18.9944, 72.8256, ["atmos:Audi 1", "standard:Audi 2", "standard:Audi 3"], 210],
    [0, "Marine Talkies Ghatkopar",       "Mumbai",    "Maharashtra",   400086, "R City Mall, LBS Marg, Ghatkopar West", 19.0996, 72.9162, ["standard:Screen 1", "standard:Screen 2"], 160],
    [1, "Cineverse Select Citywalk",      "Delhi",     "Delhi",         110017, "Select Citywalk, A-3 District Centre, Saket", 28.5286, 77.2193, ["imax:IMAX Hall", "atmos:Audi 2", "lounge:Director's Cut"], 230],
    [1, "Rajdhani Multiplex Rajouri",     "Delhi",     "Delhi",         110027, "Pacific Mall, Najafgarh Road, Rajouri Garden", 28.6420, 77.1086, ["standard:Audi 1", "standard:Audi 2", "atmos:Audi 3"], 170],
    [1, "Starlight Cinemas Noida",        "Noida",     "Uttar Pradesh", 201301, "DLF Mall of India, Sector 18", 28.5677, 77.3211, ["atmos:Audi 1", "standard:Audi 2", "standard:Audi 3"], 180],
    [2, "Cineverse Orion Bengaluru",      "Bengaluru", "Karnataka",     560055, "Orion Mall, Dr Rajkumar Road, Malleshwaram", 13.0108, 77.5550, ["imax:IMAX Hall", "atmos:Audi 2", "standard:Audi 3", "standard:Audi 4"], 200],
    [2, "Garden City Screens Koramangala","Bengaluru", "Karnataka",     560095, "Forum Mall, Hosur Road, Koramangala", 12.9345, 77.6112, ["atmos:Audi 1", "standard:Audi 2", "lounge:Recliner Lounge"], 210],
    [2, "Cineverse Phoenix Whitefield",   "Bengaluru", "Karnataka",     560048, "Phoenix Marketcity, Whitefield Main Road", 12.9975, 77.6966, ["standard:Audi 1", "standard:Audi 2", "atmos:Audi 3"], 190],
    [3, "Charminar Cinemas Banjara Hills","Hyderabad", "Telangana",     500034, "GVK One Mall, Road No. 1, Banjara Hills", 17.4196, 78.4485, ["atmos:Audi 1", "standard:Audi 2", "standard:Audi 3"], 180],
    [3, "Cineverse Prasads Hyderabad",    "Hyderabad", "Telangana",     500063, "NTR Marg, Necklace Road, Khairatabad", 17.4123, 78.4664, ["imax:Large Format", "standard:Screen 2", "standard:Screen 3"], 170],
    [3, "Marina Screens Chennai",         "Chennai",   "Tamil Nadu",    600017, "Express Avenue, Whites Road, Royapettah", 13.0587, 80.2641, ["atmos:Audi 1", "standard:Audi 2", "standard:Audi 3"], 160],
    [1, "Deccan Talkies Pune",            "Pune",      "Maharashtra",   411014, "Phoenix Marketcity, Viman Nagar", 18.5622, 73.9167, ["atmos:Audi 1", "standard:Audi 2", "lounge:Platinum Lounge"], 190],
    [0, "Howrah Cineplex Kolkata",        "Kolkata",   "West Bengal",   700091, "City Centre, DC Block, Salt Lake Sector 1", 22.5868, 88.4089, ["standard:Audi 1", "standard:Audi 2", "atmos:Audi 3"], 150],
    [3, "Cineverse Lulu Kochi",           "Kochi",     "Kerala",        682024, "Lulu Mall, NH 66, Edappally", 10.0272, 76.3080, ["imax:IMAX Hall", "standard:Audi 2", "atmos:Audi 3"], 170],
];

const AMENITY_SETS = [
    ["Recliner Seats", "Food Court", "Parking", "M-Ticket", "Wheelchair Access", "Dolby Atmos", "Air Conditioning", "Restrooms", "Elevator"],
    ["Recliner Seats", "Lounge", "In-seat Dining", "Valet Parking", "M-Ticket", "Wheelchair Access", "Dolby Atmos", "Cafe", "Baby Changing"],
    ["Food Court", "Parking", "M-Ticket", "Air Conditioning", "Restrooms", "3D Glasses", "ATM", "Wheelchair Access"],
    ["Recliner Seats", "Food Court", "Parking", "Charging Points", "Kids Zone", "Dolby Atmos", "Elevator", "Water Dispenser", "Online Booking"],
];

const MENU = [
    { name: "Salted Popcorn (Large)",   category: "Popcorn",   price: 340, veg: true,  description: "Classic butter-salted, freshly popped" },
    { name: "Caramel Popcorn (Large)",  category: "Popcorn",   price: 390, veg: true,  description: "Crunchy caramel glaze" },
    { name: "Cheese Popcorn (Medium)",  category: "Popcorn",   price: 310, veg: true,  description: "Loaded with cheddar seasoning" },
    { name: "Couple Combo",             category: "Combos",    price: 690, veg: true,  description: "Large popcorn + 2 Pepsi (500 ml)" },
    { name: "Family Combo",             category: "Combos",    price: 1150, veg: true, description: "2 Large popcorn + 4 soft drinks + nachos" },
    { name: "Nachos with Cheese Dip",   category: "Snacks",    price: 280, veg: true,  description: "Tortilla chips, jalapeños, warm cheese sauce" },
    { name: "Chicken Hot Dog",          category: "Snacks",    price: 260, veg: false, description: "Grilled chicken sausage, mustard, onions" },
    { name: "Paneer Tikka Sandwich",    category: "Snacks",    price: 240, veg: true,  description: "Smoky paneer tikka in toasted bread" },
    { name: "Peri Peri Fries",          category: "Snacks",    price: 210, veg: true,  description: "Crispy fries, peri peri spice" },
    { name: "Chicken Burger",           category: "Snacks",    price: 290, veg: false, description: "Crispy chicken patty, lettuce, mayo" },
    { name: "Pepsi (500 ml)",           category: "Beverages", price: 180, veg: true,  description: "Chilled fountain drink" },
    { name: "Cold Coffee",              category: "Beverages", price: 220, veg: true,  description: "Thick, creamy and chilled" },
    { name: "Mineral Water",            category: "Beverages", price: 60,  veg: true,  description: "1 litre bottle" },
    { name: "Choco Lava Cake",          category: "Desserts",  price: 190, veg: true,  description: "Warm cake with a molten centre" },
    { name: "Brownie Sundae",           category: "Desserts",  price: 250, veg: true,  description: "Walnut brownie, vanilla ice cream, fudge" },
];

// ── People ───────────────────────────────────────────────
const OWNERS = [
    ["Rohan Mehta",     "rohan.mehta@cineverse.in",   "9820012345"],
    ["Priya Malhotra",  "priya.malhotra@cineverse.in","9811023456"],
    ["Karthik Reddy",   "karthik.reddy@cineverse.in", "9845034567"],
    ["Ananya Iyer",     "ananya.iyer@cineverse.in",   "9849045678"],
];
const PENDING_OWNERS = [
    ["Vikram Sethi", "vikram.sethi@cineverse.in", "9876501234"],
    ["Neha Kapoor",  "neha.kapoor@cineverse.in",  "9876512345"],
];
const CUSTOMER_NAMES = [
    "Aarav Sharma", "Ishita Verma", "Kabir Singh", "Meera Nair", "Arjun Patel", "Sanya Gupta", "Vivaan Joshi", "Diya Menon",
    "Aditya Rao", "Kavya Pillai", "Rahul Desai", "Tanvi Kulkarni", "Siddharth Bose", "Riya Chatterjee", "Nikhil Agarwal", "Pooja Hegde",
    "Yash Thakur", "Sneha Reddy", "Aman Khanna", "Nisha Bhatt", "Varun Saxena", "Anjali Mishra", "Harsh Vardhan", "Simran Kaur",
    "Dev Malhotra", "Aisha Khan", "Kunal Shah", "Shreya Ghoshal", "Rohit Yadav", "Neha Sinha", "Manish Tiwari", "Ritika Das",
    "Gaurav Chopra", "Lavanya Krishnan", "Sameer Kulkarni", "Tara Fernandes", "Akash Jain", "Bhavna Iyer", "Om Prakash", "Zoya Mirza",
];

// ── Review text ──────────────────────────────────────────
const MOVIE_REVIEWS = {
    high: [
        "Absolutely blown away. The visuals, the music, the performances — this is why we go to the movies. Watched it in IMAX and it was worth every rupee.",
        "A masterpiece. The second half had the whole theatre clapping and whistling. Easily one of the best films of the year.",
        "Goosebumps in every action sequence. The background score is on another level. Already planning a second watch with family.",
        "Brilliant storytelling and the lead performance is career-best. Don't miss this one on the big screen.",
        "Perfect blend of emotion and spectacle. I laughed, I cried, I cheered. Highly recommended!",
        "The cinematography alone deserves an award. Every frame looks like a painting. Go for the recliner seats, totally worth it.",
        "Paisa vasool! Mass moments, great music and a climax that leaves you speechless.",
        "One of those rare films that stays with you for days. Superb direction and a tight screenplay.",
    ],
    mid: [
        "Good one-time watch. First half is gripping but the second half drags a bit. Performances hold it together.",
        "Solid entertainer with a few slow patches. The songs could have been trimmed but the climax makes up for it.",
        "Visually stunning but the story felt a little predictable. Still a fun weekend outing.",
        "Decent film, great sound design. Watch it in Dolby Atmos for the full experience.",
        "Enjoyed it overall. The lead actor carries the film, though the runtime could be shorter.",
    ],
    low: [
        "Expected much more after all the hype. Too long and the plot is all over the place.",
        "Some good moments but overall disappointing. The editing really needed work.",
    ],
};
const THEATRE_REVIEWS = [
    "Super clean auditorium and the recliners are really comfortable. Staff was polite and the popcorn was fresh.",
    "Sound quality is amazing, especially in the Atmos hall. Parking can get crowded on weekends though.",
    "Great experience overall. Easy entry with the M-ticket and the screen is crystal clear.",
    "Seats are comfortable but the food is a bit overpriced. Picture and sound were excellent.",
    "My go-to theatre in the city. Never had a bad experience here — clean washrooms too!",
    "The IMAX screen is massive. Booking recliners was totally worth it for a 3-hour movie.",
    "Decent multiplex. AC was a bit too cold but the projection quality was great.",
    "Loved the lounge — in-seat service and blankets made it feel premium.",
];

// ── Helpers ──────────────────────────────────────────────
async function wikiPoster(title) {
    try {
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: { "User-Agent": "CineverseSeed/1.0 (local dev)" } });
        const j = await r.json();
        return j.originalimage?.source?.split("?")[0] ?? null;
    } catch { return null; }
}

const seatId = (row, col) => `${row}${col}`;

/** n adjacent free seats in one row, preferring the given categories; null if none */
function findSeats(layout, taken, n, preferRows) {
    const rows = shuffle(preferRows?.length ? preferRows : layout.rows);
    for (const row of rows) {
        const starts = shuffle([...Array(layout.cols - n + 1).keys()].map((k) => k + 1));
        for (const s of starts) {
            const seats = [...Array(n).keys()].map((k) => seatId(row, s + k));
            if (seats.every((x) => !taken.has(x))) return seats;
        }
    }
    return null;
}

async function insertInChunks(Model, docs, size = 1000) {
    for (let i = 0; i < docs.length; i += size) {
        await Model.insertMany(docs.slice(i, i + size), { ordered: false });
    }
}

// ── Main ─────────────────────────────────────────────────
async function main() {
    await connectDB();
    const reset = process.argv.includes("--reset");
    const MODELS = [User, Movie, Theatre, Show, Booking, Review, TheatreReview, Coupon, SupportTicket, Notification, WalletTxn, AuditLog, GiftCard];

    const existing = await Movie.estimatedDocumentCount() + await Theatre.estimatedDocumentCount();
    if (existing && !reset) {
        console.log("Database already has movies/theatres. Re-run with --reset to wipe and reseed.");
        return;
    }
    if (reset) {
        for (const M of MODELS) await M.deleteMany({});
        console.log("Wiped existing data");
    }

    // Users — created one by one so the password hook runs
    console.log("Users…");
    const admin = await User.create({ name: "Cineverse Admin", email: "admin@cineverse.in", password: "Admin@123", phone: "9999900000",
        userRole: "ADMIN", userStatus: "APPROVED", isEmailVerified: true });
    const owners = [];
    for (const [name, email, phone] of OWNERS)
        owners.push(await User.create({ name, email, phone, password: "Owner@123", userRole: "CLIENT", userStatus: "APPROVED", isEmailVerified: true, createdAt: daysAgo(int(120, 300)) }));
    for (const [name, email, phone] of PENDING_OWNERS)
        await User.create({ name, email, phone, password: "Owner@123", userRole: "CLIENT", userStatus: "PENDING", isEmailVerified: true, createdAt: daysAgo(int(1, 6)) });

    const customers = [];
    // A known demo login first
    customers.push(await User.create({ name: "Demo User", email: "user@cineverse.in", password: "User@123", phone: "9000000001",
        userRole: "CUSTOMER", userStatus: "APPROVED", isEmailVerified: true,
        primeSince: daysAgo(40), primeExpiresAt: daysFromNow(20), primeTrialUsed: true, walletBalance: 0, createdAt: daysAgo(200) }));
    for (const name of CUSTOMER_NAMES) {
        const handle = name.toLowerCase().replace(/[^a-z]+/g, ".");
        const prime = chance(0.3);
        customers.push(await User.create({
            name, email: `${handle}@example.com`, password: "User@123", phone: `9${int(100000000, 999999999)}`,
            userRole: "CUSTOMER", userStatus: "APPROVED", isEmailVerified: true,
            ...(prime ? { primeSince: daysAgo(int(10, 90)), primeExpiresAt: daysFromNow(int(3, 28)), primeTrialUsed: true } : {}),
            createdAt: daysAgo(int(5, 360)),
        }));
    }
    const isPrime = (u) => Boolean(u.primeExpiresAt && u.primeExpiresAt > NOW);

    // Movies
    console.log("Movies…");
    const movieDocs = [];
    for (const m of MOVIES) {
        const posterUrl = m.posterUrl ?? (await wikiPoster(m.wiki ?? m.name)) ?? `${WIKI}/b/bc/Interstellar_film_poster.jpg`;
        movieDocs.push({
            name: m.name, description: m.description, casts: m.casts, trailerUrl: YT(m.trailer), languages: m.languages,
            releaseDate: m.upcoming ? daysFromNow(m.upcoming) : daysAgo(m.released), duration: m.duration,
            posterUrl, bannerUrl: "", images: [], genre: m.genre, certificate: m.certificate, director: m.director,
            releaseStatus: m.upcoming ? "COMING_SOON" : "RELEASED", rating: 0, isActive: true,
            createdAt: m.upcoming ? daysAgo(int(2, 20)) : daysAgo(m.released + int(5, 15)),
        });
    }
    const movies = await Movie.insertMany(movieDocs);
    const released = movies.filter((m) => m.releaseStatus === "RELEASED");
    const upcoming = movies.filter((m) => m.releaseStatus === "COMING_SOON");

    // Theatres
    console.log("Theatres…");
    const theatreDocs = THEATRES.map(([o, name, city, state, pincode, address, lat, lng, screenSpecs, base], i) => {
        const screens = screenSpecs.map((spec) => {
            const [type, sname] = spec.split(":");
            return SCREEN_TYPES[type](sname, type === "standard" ? base : type === "atmos" ? base + 40 : undefined);
        });
        // Bigger theatres carry more titles; regional favourites everywhere
        const regional = { Hyderabad: ["Pushpa 2: The Rule", "Kalki 2898 AD"], Chennai: ["Leo"], Bengaluru: ["KGF: Chapter 2", "Kantara: Chapter 1"], Kochi: ["Leo"] }[city] ?? [];
        const must = released.filter((m) => regional.includes(m.name) || ["Avatar: Fire and Ash", "Kantara: Chapter 1", "Stree 2", "Dune: Part Two"].includes(m.name));
        const rest = sample(released.filter((m) => !must.includes(m)), int(4, 7));
        const menu = MENU.filter(() => chance(0.85)).map((item) => ({ ...item, image: "", available: chance(0.95) }));
        return {
            name, city, state, pincode, address, owner: owners[o]._id,
            description: `${name} brings the big-screen experience to ${city} with ${screens.length} screens, ${screens.some((s) => s.sound === "Dolby Atmos") ? "Dolby Atmos sound, " : ""}plush seating and a full-service food court.`,
            movies: [...must, ...rest].map((m) => m._id), totalScreens: screens.length, screens,
            amenities: [...AMENITY_SETS[i % AMENITY_SETS.length], ...(screens.some((s) => s.sound.startsWith("IMAX")) ? ["IMAX Screen"] : [])],
            images: [], phone: `+91 ${int(70000, 99999)} ${int(10000, 99999)}`, openingHours: pick(["9:00 AM – 1:00 AM", "8:30 AM – 12:30 AM", "10:00 AM – 1:30 AM"]),
            menu, amenityPhotos: {}, location: { lat, lng },
            pricingRules: { weekendPct: pick([10, 15, 20]), morningPct: pick([-10, -15, -20]), primeTimePct: pick([0, 5, 10]), openingDayPct: 0 },
            cancellationPolicy: null,
            isActive: true, createdAt: daysAgo(int(90, 400)),
        };
    });
    const theatres = await Theatre.insertMany(theatreDocs);

    // Shows: last 14 days + next 7 days
    console.log("Shows…");
    const SLOTS = [[9, 45], [13, 0], [16, 15], [19, 30], [22, 40]];
    const movieById = new Map(movies.map((m) => [String(m._id), m]));
    const showDocs = [];
    for (const t of theatres) {
        const tMovies = t.movies.map((id) => movieById.get(String(id)));
        t.screens.forEach((screen, si) => {
            const isImax = screen.sound.startsWith("IMAX");
            const isLounge = screen.layout.categories.length === 1;
            // Each screen keeps a small rotation so schedules look intentional
            const rotation = isImax
                ? tMovies.filter((m) => ["Avatar: Fire and Ash", "Dune: Part Two", "Interstellar", "Oppenheimer", "Kalki 2898 AD", "Deadpool & Wolverine"].includes(m.name))
                : shuffle(tMovies).slice(0, 3);
            const pool = rotation.length ? rotation : tMovies;
            for (let day = -14; day <= 6; day++) {
                SLOTS.forEach(([hh, mm], k) => {
                    if (isLounge && k === 0) return;
                    const movie = pool[(day + 14 + k + si) % pool.length];
                    if (movie.releaseDate > istAt(day, 23, 59)) return;          // not released yet that day
                    const showTime = istAt(day, hh, mm + (si * 5));
                    const priceAdjustments = priceAdjustmentsFor(showTime, t.pricingRules, movie.releaseDate);
                    const pct = totalPct(priceAdjustments);
                    const seatLayout = snapshotLayout(screen, {}, pct);
                    const format = isImax ? "IMAX" : screen.sound === "Dolby Atmos" ? (chance(0.25) && ["Avatar: Fire and Ash", "Inside Out 2", "Deadpool & Wolverine"].includes(movie.name) ? "3D" : "Dolby Atmos") : (chance(0.15) && movie.genre.includes("Animation") ? "3D" : "2D");
                    const local = { Chennai: "Tamil", Hyderabad: "Telugu", Bengaluru: "Kannada", Kochi: "Malayalam" }[t.city];
                    const language = movie.languages.includes(local) && chance(0.6) ? local : (movie.languages.includes("Hindi") && !(movie.languages[0] === "English" && chance(0.6)) ? "Hindi" : movie.languages[0]);
                    const tags = [];
                    if (language === "English" && chance(0.4)) tags.push("Subtitled");
                    if (chance(0.5)) tags.push("Wheelchair Accessible");
                    if (movie.certificate === "U" && k <= 1 && chance(0.5)) tags.push("Kids");
                    if (k === 0 && chance(0.15)) tags.push("Sensory Friendly");
                    showDocs.push({
                        theatreId: t._id, movieId: movie._id, showTime, screen: screen.name,
                        noOfSeats: seatCount(seatLayout), bookedSeats: [], seatLayout, price: minCategoryPrice(seatLayout),
                        language, format, tags, priceAdjustments, isActive: true,
                        createdAt: new Date(Math.min(showTime.getTime() - 6 * DAY, NOW.getTime())),
                    });
                });
            }
        });
    }
    // A few cancelled shows for realism
    showDocs.filter((s) => s.showTime > NOW).slice(0, 400).forEach((s) => { if (chance(0.02)) s.isActive = false; });
    console.log(`  ${showDocs.length} shows`);

    // Coupons
    const coupons = await Coupon.insertMany([
        { code: "FIRSTSHOW", description: "Flat ₹150 off on your first booking", type: "FLAT", value: 150, minAmount: 400, perUserLimit: 1, validFrom: daysAgo(60), validUntil: daysFromNow(60), usageLimit: 0 },
        { code: "WEEKEND20", description: "20% off weekend shows, up to ₹200", type: "PERCENT", value: 20, maxDiscount: 200, minAmount: 500, perUserLimit: 3, validFrom: daysAgo(30), validUntil: daysFromNow(45) },
        { code: "POPCORN100", description: "₹100 off when you add food worth ₹500+", type: "FLAT", value: 100, minAmount: 800, perUserLimit: 2, validFrom: daysAgo(20), validUntil: daysFromNow(30) },
        { code: "DIWALI25", description: "Festive offer — 25% off, up to ₹300", type: "PERCENT", value: 25, maxDiscount: 300, minAmount: 600, perUserLimit: 2, usageLimit: 5000, validFrom: daysAgo(5), validUntil: daysFromNow(25) },
        { code: "IMAXLOVE", description: "15% off IMAX bookings, up to ₹250", type: "PERCENT", value: 15, maxDiscount: 250, minAmount: 700, perUserLimit: 2, validFrom: daysAgo(15), validUntil: daysFromNow(40) },
        { code: "STUDENT50", description: "Flat ₹50 off for students on weekdays", type: "FLAT", value: 50, minAmount: 250, perUserLimit: 5, validFrom: daysAgo(90), validUntil: daysFromNow(90) },
        { code: "MONSOON30", description: "Monsoon special — 30% off (expired)", type: "PERCENT", value: 30, maxDiscount: 250, minAmount: 400, perUserLimit: 1, validFrom: daysAgo(120), validUntil: daysAgo(20), isActive: false },
    ]);
    const liveCoupons = coupons.filter((c) => c.isActive);
    const couponUse = new Map();

    // Bookings
    console.log("Bookings…");
    const theatreById = new Map(theatres.map((t) => [String(t._id), t]));
    const bookingDocs = [];
    const insertedShows = await Show.insertMany(showDocs);
    const showUpdates = [];
    for (const show of insertedShows) {
        if (!show.isActive) continue;
        const theatre = theatreById.get(String(show.theatreId));
        const past = show.showTime < NOW;
        const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(show.showTime));
        const daysOut = (show.showTime - NOW) / DAY;
        const popularity = (hour >= 18 ? 1.6 : hour < 12 ? 0.6 : 1) * (["Avatar: Fire and Ash", "Kantara: Chapter 1", "Stree 2", "Dune: Part Two", "Pushpa 2: The Rule"].includes(movieById.get(String(show.movieId)).name) ? 1.5 : 1);
        const n = Math.round((past ? int(2, 6) : Math.max(0, int(0, 4) - Math.floor(daysOut / 2))) * popularity);
        const taken = new Set();
        const layout = show.seatLayout;

        for (let b = 0; b < n; b++) {
            const user = chance(0.12) ? customers[0] : pick(customers);
            const prime = isPrime(user);
            const qty = pick([1, 2, 2, 2, 2, 3, 4, 4, 5]);
            const preferRows = chance(0.55) ? layout.categories.find((c) => c.key === "PREMIUM")?.rows : chance(0.5) ? layout.categories.at(-1).rows : null;
            const seats = findSeats(layout, taken, qty, preferRows);
            if (!seats) break;

            const { subtotal, lineItems } = priceSeats(show, seats);
            const discount = prime ? Math.round((subtotal * PRIME_PLAN.ticketDiscountPct) / 100) : 0;
            const addOns = chance(0.55)
                ? sample(theatre.menu.filter((m) => m.available), int(1, 3)).map((m) => ({ itemId: m._id, name: m.name, price: m.price, qty: int(1, Math.max(1, Math.ceil(qty / 2))) }))
                : [];
            const addOnsTotal = addOns.reduce((a, i) => a + i.price * i.qty, 0);
            const base = subtotal - discount + addOnsTotal;
            const fee = bookingFeeFor(seats.length, prime);

            let couponCode = null, couponDiscount = 0;
            if (chance(0.18)) {
                const c = pick(liveCoupons);
                if (base >= c.minAmount) {
                    const raw = c.type === "PERCENT" ? Math.round((base * c.value) / 100) : c.value;
                    couponDiscount = Math.max(0, Math.min(c.type === "PERCENT" && c.maxDiscount ? Math.min(raw, c.maxDiscount) : raw, base - 1));
                    couponCode = c.code;
                    couponUse.set(c.code, (couponUse.get(c.code) ?? 0) + 1);
                }
            }
            const totalAmount = base - couponDiscount + fee.bookingFee + fee.bookingFeeGst;

            const leadDays = past ? int(0, 5) : Math.min(int(0, 4), Math.max(0, (show.showTime - NOW) / DAY));
            const createdAt = new Date(Math.min(show.showTime.getTime() - leadDays * DAY - int(1, 20) * 3600 * 1000, NOW.getTime() - int(5, 600) * 60 * 1000));

            const cancelled = chance(0.06);
            const doc = {
                showId: show._id, userId: user._id, seats, totalAmount, subtotal, discount, primeApplied: prime, lineItems,
                addOns, addOnsTotal, couponCode, couponDiscount, ...fee,
                paidWith: "CARD", reminderSentAt: createdAt, stripePaymentIntentId: `pi_demo_${crypto.randomBytes(8).toString("hex")}`,
                ticketCode: ticketCode(),
                status: cancelled ? BOOKING_STATUS.cancelled : BOOKING_STATUS.successful,
                createdAt, updatedAt: createdAt,
            };
            if (cancelled) {
                const refundable = totalAmount - fee.bookingFee - fee.bookingFeeGst;
                Object.assign(doc, {
                    cancelledAt: new Date(createdAt.getTime() + int(1, 24) * 3600 * 1000),
                    cancellationReason: pick(["Plans changed", "Booked wrong show time", "Unable to attend", "Booked wrong theatre"]),
                    refundAmount: chance(0.7) ? refundable : Math.round(refundable / 2),
                    refundStatus: REFUND_STATUS.refunded, refundMethod: "SOURCE",
                });
            } else {
                seats.forEach((s) => taken.add(s));
                if (past && chance(0.85)) doc.checkedInAt = new Date(show.showTime.getTime() - int(5, 25) * 60 * 1000);
            }
            bookingDocs.push(doc);
        }
        if (taken.size) showUpdates.push({ updateOne: { filter: { _id: show._id }, update: { $set: { bookedSeats: [...taken] } } } });
    }
    await insertInChunks(Booking, bookingDocs);
    for (let i = 0; i < showUpdates.length; i += 1000) await Show.bulkWrite(showUpdates.slice(i, i + 1000), { ordered: false });
    for (const [code, n] of couponUse) await Coupon.updateOne({ code }, { usedCount: n });
    console.log(`  ${bookingDocs.length} bookings`);

    // Movie reviews
    console.log("Reviews…");
    const reviewDocs = [];
    for (const m of released) {
        const bias = ["Dune: Part Two", "Oppenheimer", "Interstellar", "12th Fail", "Laapataa Ladies", "Kantara: Chapter 1", "Stree 2"].includes(m.name) ? 1.5 : 0;
        for (const u of sample(customers, int(6, 14))) {
            const rating = Math.max(1, Math.min(10, Math.round(int(5, 10) + bias - (chance(0.1) ? 4 : 0))));
            const tier = rating >= 8 ? "high" : rating >= 5 ? "mid" : "low";
            reviewDocs.push({
                movieId: m._id, userId: u._id, rating, comment: pick(MOVIE_REVIEWS[tier]),
                likes: sample(customers, int(0, 12)).map((x) => x._id), createdAt: new Date(m.releaseDate.getTime() + int(0, 10) * DAY + int(1, 20) * 3600 * 1000),
            });
        }
    }
    reviewDocs.forEach((r) => { if (r.createdAt > NOW) r.createdAt = daysAgo(rand()); });
    await Review.insertMany(reviewDocs);
    for (const m of released) {
        const rs = reviewDocs.filter((r) => String(r.movieId) === String(m._id));
        await Movie.updateOne({ _id: m._id }, { rating: Math.round((rs.reduce((a, r) => a + r.rating, 0) / rs.length) * 10) / 10 });
    }

    // Theatre reviews (from customers with a past booking there)
    const pastVisitors = new Map();
    const showTheatre = new Map(insertedShows.map((s) => [String(s._id), { t: String(s.theatreId), past: s.showTime < NOW }]));
    for (const b of bookingDocs) {
        const st = showTheatre.get(String(b.showId));
        if (b.status !== BOOKING_STATUS.successful || !st.past) continue;
        if (!pastVisitors.has(st.t)) pastVisitors.set(st.t, new Set());
        pastVisitors.get(st.t).add(String(b.userId));
    }
    const theatreReviewDocs = [];
    for (const t of theatres) {
        const visitors = [...(pastVisitors.get(String(t._id)) ?? [])];
        for (const uid of sample(visitors, Math.min(visitors.length, int(4, 9)))) {
            const rating = pick([5, 5, 4, 4, 4, 3, 5]);
            theatreReviewDocs.push({
                theatreId: t._id, userId: uid, rating,
                cleanliness: Math.max(1, Math.min(5, rating + pick([-1, 0, 0, 1]))), sound: Math.max(1, Math.min(5, rating + pick([-1, 0, 0, 1]))), seating: Math.max(1, Math.min(5, rating + pick([-1, 0, 0]))),
                comment: pick(THEATRE_REVIEWS), createdAt: daysAgo(int(0, 13)),
            });
        }
    }
    await TheatreReview.insertMany(theatreReviewDocs);
    const round1 = (x) => Math.round(x * 10) / 10;
    for (const t of theatres) {
        const rs = theatreReviewDocs.filter((r) => String(r.theatreId) === String(t._id));
        if (!rs.length) continue;
        const avg = (k) => round1(rs.reduce((a, r) => a + r[k], 0) / rs.length);
        await Theatre.updateOne({ _id: t._id }, { rating: { avg: avg("rating"), count: rs.length, cleanliness: avg("cleanliness"), sound: avg("sound"), seating: avg("seating") } });
    }

    // Watchlists & notify-me
    for (const u of customers) {
        const wl = sample(movies, int(0, 5)).map((m) => m._id);
        const notify = sample(upcoming, int(0, 2)).map((m) => m._id);
        await User.updateOne({ _id: u._id }, { watchlist: wl, notifyMovies: notify });
    }
    await User.updateOne({ _id: customers[0]._id }, { watchlist: upcoming.slice(0, 3).map((m) => m._id).concat(released.slice(0, 2).map((m) => m._id)), notifyMovies: upcoming.slice(0, 2).map((m) => m._id) });

    // Wallet: refunds credited to wallet for the demo user + a redeemed gift card
    const demoBalance = [{ amount: 500, reason: "GIFT_CARD", note: "Gift card from Ishita Verma" }, { amount: 412, reason: "REFUND", note: "Refund — Stree 2" }, { amount: 320, reason: "BOOKING", note: "Paid for Dune: Part Two", type: "DEBIT" }];
    let bal = 0;
    for (const [i, t] of demoBalance.entries()) {
        bal += t.type === "DEBIT" ? -t.amount : t.amount;
        await WalletTxn.create({ userId: customers[0]._id, type: t.type ?? "CREDIT", amount: t.amount, reason: t.reason, note: t.note, balanceAfter: bal, createdAt: daysAgo(20 - i * 6) });
    }
    await User.updateOne({ _id: customers[0]._id }, { walletBalance: bal });
    await GiftCard.create({ code: "GC-" + crypto.randomBytes(5).toString("hex").toUpperCase(), amount: 500, status: "REDEEMED", purchasedBy: customers[2]._id,
        recipientName: "Demo User", recipientEmail: "user@cineverse.in", message: "Happy birthday! Enjoy a movie on me 🎬", stripePaymentIntentId: "pi_demo_gift_1",
        redeemedBy: customers[0]._id, redeemedAt: daysAgo(20), expiresAt: daysFromNow(345), createdAt: daysAgo(21) });

    // Notifications for the demo user
    const demoBookings = bookingDocs.filter((b) => String(b.userId) === String(customers[0]._id)).sort((a, b) => b.createdAt - a.createdAt);
    const insertedDemo = await Booking.find({ userId: customers[0]._id }).sort({ createdAt: -1 }).limit(6).populate({ path: "showId", populate: { path: "movieId", select: "name posterUrl" } });
    await Notification.insertMany([
        ...insertedDemo.slice(0, 4).map((b, i) => ({
            userId: customers[0]._id, type: b.status === "CANCELLED" ? "BOOKING_CANCELLED" : "BOOKING_CONFIRMED",
            title: b.status === "CANCELLED" ? `Booking cancelled — ${b.showId.movieId.name}` : `You're all set for ${b.showId.movieId.name}!`,
            body: `${b.seats.length} ticket${b.seats.length > 1 ? "s" : ""} · Seats ${b.seats.join(", ")}`, link: `/ticket/${b._id}`, image: b.showId.movieId.posterUrl,
            readAt: i > 1 ? b.createdAt : null, createdAt: b.createdAt,
        })),
        { userId: customers[0]._id, type: "BOOKINGS_OPEN", title: `Bookings open: ${released.find((m) => m.name === "Avatar: Fire and Ash").name}`, body: "The movie you asked us to watch is now on sale near you.", link: `/movies/${released.find((m) => m.name === "Avatar: Fire and Ash")._id}`, image: released.find((m) => m.name === "Avatar: Fire and Ash").posterUrl, createdAt: daysAgo(2) },
    ]);
    void demoBookings;

    // Support tickets
    const supportSeed = [
        ["PAYMENT", "Money deducted but no ticket", "My card was charged ₹780 but I didn't get a ticket confirmation. Please help.", "RESOLVED", "Sorry for the trouble! The payment didn't complete on our side, and the amount has been reversed to your card. It should reflect in 5–7 working days."],
        ["REFUND", "Refund not received yet", "I cancelled my booking 4 days ago but haven't received the refund.", "IN_PROGRESS", "We've escalated this to our payments team. You'll receive an update within 48 hours."],
        ["ENTRY", "QR code not scanning at gate", "The QR code on my ticket wasn't scanning at the entrance. Staff let me in after checking the code manually, but please look into it.", "RESOLVED", "Thanks for flagging this — we've shared the feedback with the theatre team."],
        ["FOOD", "Wrong combo delivered", "I ordered the Couple Combo but received only one drink.", "OPEN", null],
        ["SHOW", "Show started 20 minutes late", "The 7:30 PM show started almost 20 minutes late without any announcement.", "OPEN", null],
        ["ACCOUNT", "Can't update phone number", "Getting an error when I try to change my phone number in the profile page.", "IN_PROGRESS", "Could you share a screenshot of the error? We're looking into it."],
        ["OTHER", "Request for wheelchair seat", "Can I reserve a wheelchair space for my father for the Sunday show?", "RESOLVED", "Absolutely — wheelchair spaces are marked in the seat map (row A). You can select them directly while booking."],
        ["PAYMENT", "Coupon not applying", "WEEKEND20 says invalid when I try it on Saturday's show.", "OPEN", null],
    ];
    await SupportTicket.insertMany(supportSeed.map(([category, subject, message, status, reply], i) => {
        const u = i < 2 ? customers[0] : customers[i + 3];
        const at = daysAgo(int(0, 10));
        return { userId: u._id, category, subject, message, status, createdAt: at, updatedAt: at,
            replies: reply ? [{ by: admin._id, name: admin.name, staff: true, message: reply, createdAt: new Date(at.getTime() + 3 * 3600 * 1000) }] : [] };
    }));

    // Audit log
    await AuditLog.insertMany([
        ...movies.map((m) => ({ actor: admin._id, actorName: admin.name, role: "ADMIN", action: "CREATE", entity: "Movie", entityId: String(m._id), summary: `Added movie “${m.name}”`, createdAt: m.createdAt })),
        ...theatres.map((t) => { const o = owners.find((x) => String(x._id) === String(t.owner)); return { actor: o._id, actorName: o.name, role: "CLIENT", action: "CREATE", entity: "Theatre", entityId: String(t._id), summary: `Added theatre “${t.name}”`, createdAt: t.createdAt }; }),
        ...coupons.map((c) => ({ actor: admin._id, actorName: admin.name, role: "ADMIN", action: "CREATE", entity: "Coupon", entityId: String(c._id), summary: `Created coupon ${c.code}`, createdAt: c.validFrom ?? daysAgo(10) })),
    ]);

    // Clear cached API responses so the site shows fresh data
    try {
        const { createClient } = await import("redis");
        const r = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
        await r.connect();
        let n = 0;
        for await (const keys of r.scanIterator({ MATCH: "cache:*", COUNT: 200 })) {
            const list = Array.isArray(keys) ? keys : [keys];
            if (list.length) { await r.del(list); n += list.length; }
        }
        await r.quit();
        console.log(`Cleared ${n} cached keys`);
    } catch (e) {
        console.log("Could not clear Redis cache:", e.message);
    }

    console.log(`\nDone: ${movies.length} movies, ${theatres.length} theatres, ${insertedShows.length} shows, ${bookingDocs.length} bookings, ${reviewDocs.length} reviews, ${theatreReviewDocs.length} theatre reviews, ${customers.length} customers.`);
    console.log("\nLogins:");
    console.log("  Admin     admin@cineverse.in / Admin@123");
    console.log("  Owner     rohan.mehta@cineverse.in / Owner@123");
    console.log("  Customer  user@cineverse.in / User@123");
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
