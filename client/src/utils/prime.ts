import type { User } from "../types/movie.types.ts";

// Mirrors the server's PRIME_PLAN.ticketDiscountPct — used only to preview
// the price before checkout. The server computes the real charge.
export const PRIME_DISCOUNT_PCT = 15;

// Expiry is the source of truth — a stored `isPrime: true` can go stale
export function isPrimeMember(user: User | null | undefined): boolean {
  return Boolean(user?.primeExpiresAt && new Date(user.primeExpiresAt) > new Date());
}

export function primeDiscountFor(subtotal: number): number {
  return Math.round(subtotal * PRIME_DISCOUNT_PCT / 100);
}
