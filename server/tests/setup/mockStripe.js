import { vi } from "vitest";

// A fake Stripe client. Every test file that touches booking.service.js
// should vi.mock("stripe", ...) using this, so no real network calls happen
// and payment behavior is fully predictable/controllable in tests.
export const createMockStripe = () => {
    let counter = 0;

    const paymentIntents = {
        create: vi.fn(async ({ amount, currency, metadata }) => {
            counter += 1;
            return {
                id: `pi_test_${counter}`,
                client_secret: `pi_test_${counter}_secret`,
                amount,
                currency,
                metadata,
                status: "requires_payment_method",
            };
        }),

        retrieve: vi.fn(async (id) => ({
            id,
            status: "succeeded", // tests can override this per-case, see below
        })),

        cancel: vi.fn(async (id) => ({
            id,
            status: "canceled",
        })),
    };

    const refunds = {
        create: vi.fn(async ({ payment_intent, amount }) => {
            counter += 1;
            return { id: `re_test_${counter}`, payment_intent, amount, status: "succeeded" };
        }),
    };

    return { paymentIntents, refunds };
};

// IMPORTANT: booking.service.js caches its Stripe client in a module-level
// singleton (`_stripe`), created only once on the first call to getStripe().
// If a test file creates a BRAND NEW mockStripe object in every beforeEach,
// the service keeps using its old cached reference forever — any per-test
// override (e.g. mockResolvedValueOnce) on the new object is silently
// invisible to the code under test.
//
// The fix: create mockStripe ONCE at module scope, and between tests only
// reset its mock functions' call history / one-off overrides IN PLACE,
// preserving object identity so the service's cached singleton stays valid.
export const resetMockStripe = (mockStripe) => {
    mockStripe.paymentIntents.create.mockClear();
    mockStripe.paymentIntents.cancel.mockClear();
    mockStripe.refunds.create.mockClear();

    // mockClear() alone does NOT remove a mockResolvedValueOnce queued by a
    // previous test — mockReset() does, but it also wipes the default
    // implementation. So we reset fully, then restore the default behavior.
    mockStripe.paymentIntents.retrieve.mockReset();
    mockStripe.paymentIntents.retrieve.mockImplementation(async (id) => ({
        id,
        status: "succeeded",
    }));
};

