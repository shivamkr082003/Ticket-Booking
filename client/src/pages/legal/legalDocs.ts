// Plain-language policies that match how the platform actually behaves.
export interface LegalDoc { title: string; intro: string; sections: { h: string; p: string[] }[] }

export const LEGAL_UPDATED = "14 October 2026";

export const LEGAL: Record<string, LegalDoc> = {
  refunds: {
    title: "Cancellation & Refund Policy",
    intro: "You can cancel most bookings yourself from My Bookings. The cancel dialog always shows the exact amount you'll get back before you confirm.",
    sections: [
      { h: "Standard windows", p: [
        "More than 24 hours before the show: 100% of the ticket and food amount.",
        "Between 24 and 2 hours before the show: 50%.",
        "Within 2 hours of the show, or after your ticket has been scanned at the entrance: cancellation isn't available.",
      ] },
      { h: "Cinema-specific policies", p: ["Some cinemas set their own windows. Where they do, the theatre page and the cancel dialog show that cinema's policy, and it applies instead of the standard one."] },
      { h: "Prime Pass", p: ["Prime members get a 100% refund at any point before the cancellation cut-off."] },
      { h: "Booking fee", p: ["The booking fee (₹25 per ticket plus 18% GST) covers payment processing and isn't refunded when you cancel. If a show is cancelled by the cinema, everything — including the fee — is refunded."] },
      { h: "How refunds are paid", p: [
        "Cineverse wallet: instant, and usable on your next booking.",
        "Original payment method: 5–7 business days depending on your bank. Any part paid from your wallet goes back to your wallet straight away.",
        "Bookings paid entirely from your wallet are refunded to the wallet.",
      ] },
      { h: "Unfinished payments", p: ["If payment isn't completed within 10 minutes the seats are released. You aren't charged, and any wallet balance used is returned automatically."] },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro: "These terms cover using Cineverse to discover films and book tickets, food and gift cards.",
    sections: [
      { h: "Your account", p: ["Keep your login details private. You're responsible for bookings made from your account."] },
      { h: "Tickets", p: ["A ticket admits the listed number of guests once, from 3 hours before the show. Show the QR code at the entrance. Cinemas may refuse entry for age-restricted (A) films without valid ID."] },
      { h: "Prices & fees", p: ["Ticket prices are set by each cinema and can vary by seat tier, day and time (for example weekend or morning pricing). A booking fee applies per ticket unless you're a Prime member. The total is shown before you pay."] },
      { h: "Offers & coupons", p: ["Coupons have their own conditions (minimum order, validity, uses per customer) shown at checkout. One coupon per booking. Coupons never reduce the booking fee."] },
      { h: "Wallet & gift cards", p: ["Wallet balance can be used for bookings on Cineverse and can't be withdrawn as cash. Gift cards are valid for 12 months from purchase and can be redeemed once."] },
      { h: "Reviews", p: ["Reviews must be honest and about your own experience. Cinema reviews are limited to guests who've watched a show there. We may remove reviews that are abusive or off-topic."] },
      { h: "Cinema partners", p: ["Theatre owners manage their own listings, schedules, menus and policies. Payouts to owners are made after refunds and the platform commission."] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "We collect only what we need to sell you tickets and run your account.",
    sections: [
      { h: "What we collect", p: ["Your name, email and phone; your bookings, watchlist and wallet activity; and support requests you send us. Card details are handled by Stripe and never stored on our servers."] },
      { h: "Location", p: ["Your city choice is saved in your browser. If you tap “Near me”, your device location is used on your device to sort cinemas by distance — it isn't sent to or stored on our servers."] },
      { h: "How we use it", p: ["To issue tickets, process refunds, send booking confirmations and show reminders, notify you when watchlisted movies open for booking, and answer support requests."] },
      { h: "Sharing", p: ["The cinema you book with sees your name, seats and any food you ordered so they can admit you and prepare your order. We don't sell your data."] },
      { h: "Your choices", p: ["You can edit your profile at any time, remove movies from your watchlist, and turn off “Notify me” alerts per movie. Contact support to delete your account."] },
    ],
  },
};
