// Mirrors server/utils/constants.js BOOKING_FEE — the server's quote is authoritative
export const BOOKING_FEE = { perTicket: 25, gstPct: 18 };

export function bookingFeeFor(tickets: number, prime = false) {
  const gross = tickets * BOOKING_FEE.perTicket;
  const gst   = Math.round((gross * BOOKING_FEE.gstPct) / 100);
  return prime
    ? { bookingFee: 0, bookingFeeGst: 0, feeWaived: gross + gst }
    : { bookingFee: gross, bookingFeeGst: gst, feeWaived: 0 };
}
