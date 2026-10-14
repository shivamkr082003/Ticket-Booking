// Answers mirror the real rules in the app (refund policy, fees, wallet, check-in)
export const FAQ: { q: string; a: string; topic: string }[] = [
  { topic: "Bookings", q: "Where's my ticket?", a: "Every confirmed booking is in My Bookings, and we email it too. Open it to see the QR code — that's all you need at the entrance. You can also add it to your calendar or save it as a PDF." },
  { topic: "Bookings", q: "How many seats can I book at once?", a: "Up to 10 per booking. Use “Pick seats for me” on the seat map to grab the best adjacent seats in one tap." },
  { topic: "Refunds", q: "Can I cancel, and how much do I get back?", a: "From My Bookings: 100% back up to 24 hours before the show and 50% until 2 hours before (some cinemas set their own windows — the cancel dialog always shows the exact amount). Prime members get 100% right up to the cut-off. The booking fee isn't refundable." },
  { topic: "Refunds", q: "How long do refunds take?", a: "Choose “Cineverse wallet” when cancelling and it's instant. Refunds to your card or UPI take 5–7 business days, depending on your bank." },
  { topic: "Payments", q: "What is the booking fee?", a: "₹25 per ticket plus 18% GST on that fee. Prime Pass members never pay it. Coupons apply to tickets and food, not the fee." },
  { topic: "Payments", q: "My money was deducted but there's no ticket", a: "If payment doesn't complete within 10 minutes the seats are released and nothing is charged — any wallet money used comes straight back. If your bank shows a charge without a ticket, raise a request below with the booking and we'll sort it out." },
  { topic: "Wallet", q: "How do gift cards work?", a: "Buy one in Wallet & Gift Cards and we'll email the code to your friend (or you can share it). They redeem it in their wallet and spend it at checkout. Cards are valid for 12 months." },
  { topic: "At the cinema", q: "What happens at the entrance?", a: "Staff scan your ticket QR. Each ticket admits once, from 3 hours before the show. Pre-booked food is listed on your ticket — collect it at the counter." },
  { topic: "At the cinema", q: "Do you have wheelchair-accessible seats?", a: "Yes, where the cinema has them — they're marked ♿ on the seat map. Look for “Wheelchair Accessible”, “Subtitled” or “Audio Description” tags on showtimes." },
  { topic: "Account", q: "How do I get notified when a movie opens for booking?", a: "Tap “Notify me” on any Coming Soon movie. You'll get an alert in the bell menu the moment its first show is scheduled." },
];
