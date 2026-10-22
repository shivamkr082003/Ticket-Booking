# 10 · State machines

[← Back to index](README.md)

Only statuses that exist in the code are shown. Transition labels name the route or function that performs them.

## Booking (`Booking.status`)

```mermaid
stateDiagram-v2
    [*] --> IN_PROCESS: POST /bookings/initiate (cardAmount > 0)
    [*] --> SUCCESSFUL: POST /bookings/initiate (wallet covers total)
    IN_PROCESS --> SUCCESSFUL: POST /bookings/confirm (Stripe PI succeeded)
    IN_PROCESS --> CANCELLED: POST /bookings/cancel (user)
    IN_PROCESS --> CANCELLED: expireStaleBookingsService (older than 10 min, reason "Payment timeout")
    SUCCESSFUL --> CANCELLED: POST /bookings/cancel (before cutoff, refund per policy)
    SUCCESSFUL --> SUCCESSFUL: POST /bookings/check-in (sets checkedInAt, status unchanged)
    CANCELLED --> [*]
    SUCCESSFUL --> [*]
    note right of CANCELLED
        EXPIRED exists in BOOKING_STATUS and the schema enum
        but no code path ever sets it (verified).
    end note
```

*Source: [diagrams/booking-state-machine.mmd](diagrams/booking-state-machine.mmd)*

| From | To | Trigger | Guard |
|---|---|---|---|
| — | `IN_PROCESS` | `initiateBookingService` with `cardAmount > 0` | Seats free (conditional update) |
| — | `SUCCESSFUL` | `initiateBookingService` with wallet covering the total | Wallet balance ≥ total |
| `IN_PROCESS` | `SUCCESSFUL` | `confirmBookingService` | Stripe intent `succeeded`; filter `{status: IN_PROCESS, userId, stripePaymentIntentId}` |
| `IN_PROCESS` | `CANCELLED` | `cancelBookingService` (user, or expiry job after 10 min) | Filter on current status |
| `SUCCESSFUL` | `CANCELLED` | `cancelBookingService` | `refundQuote.cancellable` (≥ cutoff before show, not checked in) |
| `SUCCESSFUL` | `SUCCESSFUL` (+`checkedInAt`) | `checkInBookingService` | Owner/admin, time window, `checkedInAt: null` |

`EXPIRED` is declared but **never set** (verified). Expired bookings appear as `CANCELLED` with reason "Payment timeout — auto expired".

## Seat (derived, per show)

```mermaid
stateDiagram-v2
    state "Available (not in Show.bookedSeats, no Redis key)" as AVAILABLE
    state "Temp-locked (Redis seat-lock key, UI only)" as LOCKED
    state "Reserved (in bookedSeats, booking IN_PROCESS)" as RESERVED
    state "Sold (in bookedSeats, booking SUCCESSFUL)" as SOLD

    [*] --> AVAILABLE
    AVAILABLE --> LOCKED: socket seats:selecting (SET EX 600)
    LOCKED --> AVAILABLE: seats:deselecting / disconnect / TTL expiry
    AVAILABLE --> RESERVED: initiate (conditional $push in transaction)
    LOCKED --> RESERVED: initiate (lock not checked by server)
    RESERVED --> SOLD: confirm (status SUCCESSFUL)
    RESERVED --> AVAILABLE: cancel or expiry job ($pull bookedSeats)
    SOLD --> AVAILABLE: cancel before cutoff ($pull bookedSeats)
    SOLD --> [*]: show time passes
```

*Source: [diagrams/seat-state-machine.mmd](diagrams/seat-state-machine.mmd)*

There's no seat document. "Reserved" vs "Sold" is the status of the booking that holds the seat id in `Show.bookedSeats`. **Verified anomaly:** `PATCH /shows/:id` can jump any seat from Reserved/Sold back to Available ([08 §5](08-booking-and-concurrency-analysis.md#5-verified-break-show-edits-wipe-bookedseats)).

## Payment intent and refund

```mermaid
stateDiagram-v2
    state "Stripe PaymentIntent (as seen by this app)" as PI {
        [*] --> requires_payment_method: paymentIntents.create (initiate)
        requires_payment_method --> succeeded: stripe.confirmPayment (browser)
        requires_payment_method --> canceled: paymentIntents.cancel (cancel / expiry of IN_PROCESS booking)
        succeeded --> refunded_partially_or_fully: refunds.create (cancel of SUCCESSFUL booking)
    }
    state "Booking.refundStatus" as RF {
        [*] --> NONE
        NONE --> REFUNDED: wallet-only refund, or Stripe refund status succeeded
        NONE --> PENDING: Stripe refund status pending
        NONE --> FAILED: Stripe refund error / failed / canceled
        PENDING --> PENDING: no webhook or job updates it (verified gap)
    }
    note right of PI
        The app never stores the PaymentIntent status itself.
        It stores stripePaymentIntentId and re-reads status on confirm.
    end note
```

*Source: [diagrams/payment-state-machine.mmd](diagrams/payment-state-machine.mmd)*

Stripe statuses other than those shown (e.g. `requires_action`, `processing`) occur inside Stripe.js and aren't persisted by this app.

## Gift card (`GiftCard.status`)

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /gift-cards/purchase (PaymentIntent created, no code)
    PENDING --> ACTIVE: POST /gift-cards/confirm (intent succeeded, metadata matches) — code + expiresAt (365 d) set
    ACTIVE --> REDEEMED: POST /wallet/redeem (transaction, not expired) — wallet credited
    PENDING --> PENDING: browser never confirms (no webhook, no cleanup)
    REDEEMED --> [*]
```

## Support ticket (`SupportTicket.status`)

```mermaid
stateDiagram-v2
    [*] --> OPEN: POST /support
    OPEN --> IN_PROGRESS: PATCH /support/:id {status} (admin)
    OPEN --> RESOLVED: PATCH /support/:id {status} (admin)
    IN_PROGRESS --> RESOLVED: PATCH /support/:id {status} (admin)
    RESOLVED --> OPEN: customer replies (PATCH /support/:id {message})
    IN_PROGRESS --> OPEN: PATCH /support/:id {status} (admin)
```

## User account (`User.userStatus`, `isEmailVerified`)

```mermaid
stateDiagram-v2
    [*] --> Unverified_APPROVED: signup as CUSTOMER (or first ADMIN)
    [*] --> Unverified_PENDING: signup as CLIENT / ADMIN when an admin exists
    Unverified_APPROVED --> Verified_APPROVED: POST /auth/verify-otp
    Unverified_PENDING --> Verified_PENDING: POST /auth/verify-otp
    Verified_PENDING --> Verified_APPROVED: PATCH /users/:id {userStatus: APPROVED} (admin)
    Verified_PENDING --> REJECTED: PATCH /users/:id {userStatus: REJECTED} (admin)
    Verified_APPROVED --> REJECTED: admin
    REJECTED --> [*]: signin refused (403)
    note right of Verified_PENDING
        Can sign in and use role-guarded routes today,
        because nothing checks PENDING (verified).
    end note
```

`UNVERIFIED` exists in the enum but is unused; verification is tracked by the boolean `isEmailVerified`. An unverified account is deleted and recreated if the same email signs up again.

## Prime membership (derived)

```mermaid
stateDiagram-v2
    [*] --> NeverMember
    NeverMember --> Active: POST /prime/subscribe (trial, primeTrialUsed=false → true, +30 d)
    NeverMember --> Active: subscribe + confirm (paid, +30 d) if trial already used
    Active --> Active: confirm another payment (extends from current expiry)
    Active --> Lapsed: primeExpiresAt passes (computed by isPrimeActive)
    Lapsed --> Active: subscribe + confirm (paid)
```
