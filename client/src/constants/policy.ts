import type { CancellationPolicy } from "../types/movie.types.ts";

// Mirrors server/utils/constants.js CANCELLATION_POLICY
export const PLATFORM_POLICY: CancellationPolicy = { fullRefundHours: 24, cancelCutoffHours: 2, partialRefundPct: 50 };
