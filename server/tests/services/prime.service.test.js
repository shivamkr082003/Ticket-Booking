import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/testDb.js";
import { createMockStripe, resetMockStripe } from "../setup/mockStripe.js";

// Same singleton-safe Stripe mock as booking.service.test.js
const mockStripe = createMockStripe();
vi.mock("stripe", () => ({
    default: vi.fn(function () {
        return mockStripe;
    }),
}));

const {
    subscribePrimeService,
    confirmPrimeService,
    getPrimeStatusService,
} = await import("../../services/prime.service.js");

const User    = (await import("../../models/user.model.js")).default;
const Booking = (await import("../../models/bookings.model.js")).default;

const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_tests";
    await connectTestDb();
});

afterAll(async () => {
    await disconnectTestDb();
});

beforeEach(async () => {
    await clearTestDb();
    resetMockStripe(mockStripe);
});

let counter = 0;
const createUser = (overrides = {}) => {
    counter += 1;
    return User.create({
        name: `Prime Tester ${counter}`,
        email: `prime${counter}@example.com`,
        password: "secret123",
        ...overrides,
    });
};

// Stripe's retrieve() for a Prime payment owned by `user`
const succeededPrimePayment = (id, user) => ({
    id,
    status: "succeeded",
    metadata: { type: "prime_pass", userId: user._id.toString() },
});

describe("subscribePrimeService", () => {
    it("activates the free trial instantly for a first-time member", async () => {
        const user = await createUser();

        const result = await subscribePrimeService(user._id);

        expect(result.activated).toBe(true);
        expect(result.trial).toBe(true);
        expect(result.membership.active).toBe(true);
        expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();

        const updated = await User.findById(user._id);
        expect(updated.primeTrialUsed).toBe(true);
        expect(updated.primeExpiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY_MS);
    });

    it("never grants the trial twice, even to parallel requests", async () => {
        const user = await createUser();

        const results = await Promise.all([
            subscribePrimeService(user._id),
            subscribePrimeService(user._id),
        ]);

        expect(results.filter((r) => r.trial)).toHaveLength(1);
        expect(results.filter((r) => r.clientSecret)).toHaveLength(1);
    });

    it("creates a Stripe payment once the trial has been used", async () => {
        const user = await createUser({ primeTrialUsed: true });

        const result = await subscribePrimeService(user._id);

        expect(result.activated).toBe(false);
        expect(result.clientSecret).toMatch(/_secret$/);
        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 799 * 100,
                metadata: { type: "prime_pass", userId: user._id.toString() },
            })
        );
    });
});

describe("confirmPrimeService", () => {
    it("adds a 30-day period on top of an active membership", async () => {
        const currentExpiry = new Date(Date.now() + 10 * DAY_MS);
        const user = await createUser({ primeTrialUsed: true, primeExpiresAt: currentExpiry });
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce(succeededPrimePayment("pi_prime_1", user));

        const membership = await confirmPrimeService({ userId: user._id, paymentIntentId: "pi_prime_1" });

        expect(membership.active).toBe(true);
        expect(new Date(membership.expiresAt).getTime()).toBe(currentExpiry.getTime() + 30 * DAY_MS);
    });

    it("is idempotent — the same payment never extends twice", async () => {
        const user = await createUser({ primeTrialUsed: true });
        mockStripe.paymentIntents.retrieve.mockImplementation(async (id) => succeededPrimePayment(id, user));

        const first  = await confirmPrimeService({ userId: user._id, paymentIntentId: "pi_prime_2" });
        const second = await confirmPrimeService({ userId: user._id, paymentIntentId: "pi_prime_2" });

        expect(new Date(second.expiresAt).getTime()).toBe(new Date(first.expiresAt).getTime());
    });

    it("rejects an unpaid payment", async () => {
        const user = await createUser({ primeTrialUsed: true });
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
            ...succeededPrimePayment("pi_prime_3", user),
            status: "requires_payment_method",
        });

        await expect(
            confirmPrimeService({ userId: user._id, paymentIntentId: "pi_prime_3" })
        ).rejects.toMatchObject({ code: 400 });
    });

    it("rejects a payment that belongs to someone else", async () => {
        const owner    = await createUser({ primeTrialUsed: true });
        const attacker = await createUser({ primeTrialUsed: true });
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce(succeededPrimePayment("pi_prime_4", owner));

        await expect(
            confirmPrimeService({ userId: attacker._id, paymentIntentId: "pi_prime_4" })
        ).rejects.toMatchObject({ code: 403 });

        const unchanged = await User.findById(attacker._id);
        expect(unchanged.primeExpiresAt).toBeNull();
    });

    it("rejects a regular booking payment", async () => {
        const user = await createUser({ primeTrialUsed: true });
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
            id: "pi_booking_1",
            status: "succeeded",
            metadata: { showId: "x", userId: user._id.toString(), seats: "A1" },
        });

        await expect(
            confirmPrimeService({ userId: user._id, paymentIntentId: "pi_booking_1" })
        ).rejects.toMatchObject({ code: 403 });
    });
});

describe("getPrimeStatusService", () => {
    it("totals savings from successful discounted bookings only", async () => {
        const user = await createUser({ primeTrialUsed: true, primeExpiresAt: new Date(Date.now() + DAY_MS) });
        const base = { showId: user._id, userId: user._id, seats: ["A1"], primeApplied: true };

        await Booking.create([
            { ...base, totalAmount: 170, subtotal: 200, discount: 30, status: "SUCCESSFUL" },
            { ...base, totalAmount: 340, subtotal: 400, discount: 60, status: "SUCCESSFUL" },
            { ...base, totalAmount: 170, subtotal: 200, discount: 30, status: "CANCELLED" },
        ]);

        const status = await getPrimeStatusService(user._id);

        expect(status.active).toBe(true);
        expect(status.trialAvailable).toBe(false);
        expect(status.totalSaved).toBe(90);
        expect(status.discountedBookings).toBe(2);
    });
});
