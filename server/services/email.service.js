import nodemailer from "nodemailer";

// ── Transporter ───────────────────────────────────────────
let _transporter = null;
const getTransporter = () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return _transporter;
};

// "Cineverse <hello@x.com>" → { name, email }
const parseFrom = (from) => {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return m ? { name: m[1] || "Cineverse", email: m[2] } : { name: "Cineverse", email: from.trim() };
};

// Brevo's HTTP API — for hosts that block outbound SMTP (e.g. Render's free tier)
const sendViaBrevo = async ({ from, to, subject, html }) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: parseFrom(from), to: [{ email: to }], subject, htmlContent: html }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
};

// ── Shared sender ─────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  try {
    const from = process.env.EMAIL_FROM ?? `Cineverse <${process.env.EMAIL_USER}>`;
    if (process.env.BREVO_API_KEY) await sendViaBrevo({ from, to, subject, html });
    else await getTransporter().sendMail({ from, to, subject, html });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
};

// ── Shared styles ─────────────────────────────────────────
const wrap = (body) => `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#0a0a0a;color:#e8e4dc;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
    ${body}
  </div>
</div>`;

const header = (icon, title, sub, bg = "#9b5cff") => `
<div style="background:linear-gradient(135deg,${bg},#6d28d9);padding:32px 36px;text-align:center;">
  <div style="font-size:48px;margin-bottom:8px;">${icon}</div>
  <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:2px;">${title}</h1>
  ${sub ? `<p style="color:rgba(255,255,255,0.8);margin-top:8px;font-size:14px;">${sub}</p>` : ""}
</div>`;

const footer = () => `
<div style="padding:20px 36px;border-top:1px solid #2a2a2a;text-align:center;font-size:12px;color:#666;">
  <p>© ${new Date().getFullYear()} Cineverse. All rights reserved.</p>
</div>`;

const btn = (href, text) =>
  `<div style="text-align:center;margin-top:24px;">
     <a href="${href}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#9b5cff,#6d28d9);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;">${text}</a>
   </div>`;

const CLIENT = process.env.CLIENT_URL ?? "http://localhost:5173";

// ── 1. OTP EMAIL ──────────────────────────────────────────
export const sendOtpEmail = async ({ email, name, otp }) => {
  const html = wrap(`
        ${header("🔐", "VERIFY YOUR EMAIL", "One-time password for Cineverse signup")}
        <div style="padding:28px 36px;">
          <p style="font-size:16px;margin-bottom:24px;">Hi <strong>${name}</strong>! Use the OTP below to verify your email.</p>
          <div style="text-align:center;margin:28px 0;">
            <div style="background:#111;border:2px solid #b98bff;border-radius:12px;padding:24px 20px;max-width:280px;margin:0 auto;">
              <p style="margin:0 0 10px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;">Your OTP</p>
              <p style="margin:0;font-size:36px;font-weight:900;letter-spacing:8px;color:#b98bff;font-family:monospace;">${otp}</p>
            </div>
          </div>
          <p style="color:#888;font-size:13px;text-align:center;line-height:1.7;">
            ⏰ Expires in <strong style="color:#e8e4dc;">10 minutes</strong>.<br/>
            🚫 Do not share this OTP with anyone.
          </p>
        </div>
        ${footer()}
    `);
  await sendEmail({
    to: email,
    subject: `🔐 Your Cineverse OTP: ${otp}`,
    html,
  });
};

// ── 2. BOOKING CONFIRMED ──────────────────────────────────
export const sendBookingConfirmEmail = async ({
  booking,
  user,
  show,
  movie,
  theatre,
}) => {
  const showTime = new Date(show.showTime).toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const lbl = `color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:8px 0;`;
  const val = `color:#e8e4dc;font-weight:600;padding:8px 0;text-align:right;`;
  const row = (l, v) =>
    `<tr><td style="${lbl}">${l}</td><td style="${val}">${v}</td></tr>`;

  const html = wrap(`
        ${header("🎟", "BOOKING CONFIRMED!", "Your tickets are ready")}
        <div style="padding:28px 36px;">
          <p style="font-size:16px;margin-bottom:24px;">Hi <strong>${user.name}</strong>, your booking is confirmed! 🎬</p>
          <div style="background:#111;border-radius:10px;padding:20px;margin-bottom:20px;">
            <h2 style="margin:0 0 16px;font-size:22px;color:#b98bff;">${movie.name}</h2>
            <table style="width:100%;border-collapse:collapse;">
              ${row("Theatre", theatre.name)}
              ${row("Location", theatre.city)}
              ${row("Show Time", showTime)}
              ${row("Screen", show.screen ?? "—")}
              ${row("Format", `${show.format} · ${show.language}`)}
              ${row("Seats", booking.seats.join(", "))}
              <tr><td style="${lbl}">Amount Paid</td><td style="color:#22c55e;font-weight:800;font-size:18px;padding:8px 0;text-align:right;">₹${booking.totalAmount}</td></tr>
            </table>
          </div>
          <div style="background:#111;border:1px dashed #333;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;">
            <p style="margin:0 0 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;">Ticket Code</p>
            <p style="margin:0;font-size:24px;font-weight:800;letter-spacing:4px;color:#b98bff;">${booking.ticketCode}</p>
          </div>
          <p style="color:#888;font-size:13px;line-height:1.6;">
            📍 Please arrive 15 minutes early.<br/>↩️ Full refund up to 24 hours before the show, 50% until 2 hours before (booking fee non-refundable).
          </p>
          ${btn(`${CLIENT}/my-bookings`, "View My Tickets")}
        </div>
        ${footer()}
    `);
  await sendEmail({
    to: user.email,
    subject: `🎟 Booking Confirmed — ${movie.name} | ${booking.ticketCode}`,
    html,
  });
};

// ── 3. BOOKING CANCELLED ──────────────────────────────────
export const sendBookingCancelEmail = async ({ booking, user, movie }) => {
  const lbl = `color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:8px 0;`;
  const val = `color:#e8e4dc;font-weight:600;padding:8px 0;text-align:right;`;
  const row = (l, v) =>
    `<tr><td style="${lbl}">${l}</td><td style="${val}">${v}</td></tr>`;

  const html = wrap(`
        ${header("❌", "BOOKING CANCELLED", "")}
        <div style="padding:28px 36px;">
          <p style="font-size:16px;margin-bottom:20px;">Hi <strong>${user.name}</strong>, your booking has been cancelled.</p>
          <div style="background:#111;border-radius:10px;padding:20px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              ${row("Movie", movie?.name ?? "—")}
              ${row("Seats", booking.seats?.join(", ") ?? "—")}
              ${row("Amount", `₹${booking.totalAmount}`)}
              ${row("Reason", booking.cancellationReason ?? "Cancelled by user")}
            </table>
          </div>
          <div style="background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">
            <p style="color:#eab308;margin:0;font-size:14px;font-weight:600;">💰 Refund Information</p>
            <p style="color:#888;margin:8px 0 0;font-size:13px;line-height:1.6;">
              Refund of <strong style="color:#e8e4dc;">₹${booking.totalAmount}</strong> will be processed within 5–7 business days.
            </p>
          </div>
          ${btn(`${CLIENT}/movies`, "Browse Movies")}
        </div>
        ${footer()}
    `);
  await sendEmail({
    to: user.email,
    subject: `❌ Booking Cancelled — ${movie?.name ?? "Movie"}`,
    html,
  });
};

// ── 4. NEW MOVIE NOTIFICATION ─────────────────────────────
export const sendNewMovieEmail = async ({ users, movie }) => {
  const releaseDate = movie.releaseDate
    ? new Date(movie.releaseDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Coming Soon";

  const html = wrap(`
        ${header("🎬", "NEW MOVIE ALERT!", "Now available on Cineverse")}
        <div style="padding:28px 36px;">
          <div style="display:flex;gap:20px;margin-bottom:24px;">
            ${movie.posterUrl ? `<img src="${movie.posterUrl}" alt="${movie.name}" style="width:100px;height:148px;object-fit:cover;border-radius:8px;flex-shrink:0;"/>` : ""}
            <div>
              <h2 style="margin:0 0 8px;font-size:24px;color:#b98bff;">${movie.name}</h2>
              <p style="color:#888;font-size:13px;margin:0 0 6px;">🎥 ${movie.director ?? ""}</p>
              <p style="color:#888;font-size:13px;margin:0 0 6px;">⏱ ${movie.duration}m · ${movie.certificate ?? ""}</p>
              <p style="color:#888;font-size:13px;margin:0 0 12px;">📅 ${releaseDate}</p>
              <div>${(movie.genre ?? []).map((g) => `<span style="display:inline-block;padding:3px 10px;margin:2px;background:rgba(155,92,255,0.15);border:1px solid rgba(155,92,255,0.3);border-radius:20px;font-size:11px;color:#b98bff;">${g}</span>`).join("")}</div>
            </div>
          </div>
          ${movie.description ? `<p style="color:#aaa;font-size:14px;line-height:1.7;font-style:italic;border-left:3px solid #b98bff;padding-left:16px;margin-bottom:24px;">${movie.description.slice(0, 200)}${movie.description.length > 200 ? "…" : ""}</p>` : ""}
          ${btn(`${CLIENT}/movies`, "Book Tickets Now")}
        </div>
        <div style="padding:20px 36px;border-top:1px solid #2a2a2a;text-align:center;font-size:12px;color:#666;">
          <p>© ${new Date().getFullYear()} Cineverse. You received this because you have an account on Cineverse.</p>
        </div>
    `);

  const BATCH = 10;
  for (let i = 0; i < users.length; i += BATCH) {
    await Promise.allSettled(
      users.slice(i, i + BATCH).map((u) =>
        sendEmail({
          to: u.email,
          subject: `🎬 New Movie — ${movie.name} | Now on Cineverse`,
          html,
        }),
      ),
    );
    if (i + BATCH < users.length) await new Promise((r) => setTimeout(r, 1000));
  }
};

// ── SHOW REMINDER (~3 hours before) ───────────────────────
export const sendShowReminderEmail = async ({ booking, user, show, movie, theatre }) => {
  const when = new Date(show.showTime).toLocaleString("en-IN", {
    weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${theatre?.name ?? ""} ${theatre?.address ?? ""} ${theatre?.city ?? ""}`)}`;
  const food = (booking.addOns ?? []).length
    ? `<p style="color:#bbb;font-size:13px;margin:12px 0 0;">🍿 Food to collect: ${booking.addOns.map((a) => `${a.qty}× ${a.name}`).join(", ")}</p>`
    : "";
  const html = wrap(`
        ${header("⏰", "SHOWTIME SOON", `${movie?.name ?? "Your movie"} · ${when}`)}
        <div style="padding:28px 36px;">
          <p style="font-size:16px;margin-bottom:18px;">Hi <strong>${user.name}</strong>, your show starts in about 3 hours.</p>
          <div style="background:#111;border-radius:10px;padding:18px 20px;">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#b98bff;">${movie?.name ?? ""}</p>
            <p style="margin:0;color:#ccc;font-size:14px;">${theatre?.name ?? ""} · ${show.screen ?? ""}</p>
            <p style="margin:6px 0 0;color:#ccc;font-size:14px;">Seats <strong>${booking.seats.join(", ")}</strong> · Ticket <strong>${booking.ticketCode}</strong></p>
            ${food}
          </div>
          <p style="color:#888;font-size:13px;line-height:1.6;margin-top:16px;">Show the QR on your ticket at the entrance. Please arrive 15 minutes early.</p>
          ${btn(`${CLIENT}/ticket/${booking._id}`, "Open Ticket")}
          <p style="text-align:center;margin-top:12px;"><a href="${maps}" style="color:#b98bff;font-size:13px;">Get directions</a></p>
        </div>
        ${footer()}
    `);
  await sendEmail({ to: user.email, subject: `⏰ ${movie?.name ?? "Your show"} starts at ${when.split(", ").pop()} — ${theatre?.name ?? ""}`, html });
};

// ── GIFT CARD ─────────────────────────────────────────────
export const sendGiftCardEmail = async ({ card, fromName }) => {
  const html = wrap(`
        ${header("🎁", "YOU'VE GOT A GIFT", `${fromName} sent you ₹${card.amount} to spend on movies`)}
        <div style="padding:28px 36px;">
          <p style="font-size:16px;margin-bottom:18px;">Hi <strong>${card.recipientName || "there"}</strong>,</p>
          ${card.message ? `<p style="color:#ccc;font-size:15px;font-style:italic;border-left:3px solid #b98bff;padding-left:14px;margin-bottom:20px;">“${card.message}”</p>` : ""}
          <div style="background:#111;border:1px dashed #333;border-radius:10px;padding:18px;text-align:center;margin-bottom:18px;">
            <p style="margin:0 0 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;">Gift card code · ₹${card.amount}</p>
            <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:3px;color:#b98bff;font-family:monospace;">${card.code}</p>
          </div>
          <p style="color:#888;font-size:13px;line-height:1.6;">Redeem it in <b>Wallet</b> on Cineverse — the balance pays for tickets and snacks at checkout.</p>
          ${btn(`${CLIENT}/wallet`, "Redeem now")}
        </div>
        ${footer()}
    `);
  await sendEmail({ to: card.recipientEmail, subject: `🎁 ${fromName} sent you a ₹${card.amount} Cineverse gift card`, html });
};
