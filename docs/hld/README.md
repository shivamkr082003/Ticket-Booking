# Cineverse — High-Level Design (HLD)

This folder documents the **existing** Cineverse ticket booking platform in this repository, as it was implemented on **21 October 2026** (commit `f8142b3`; see [01](01-repository-overview.md)).

Everything here was derived from the source code, configuration and a few measurements. Each statement is labelled where it matters:

| Label | Meaning |
|---|---|
| **Implemented** | Verified in the code (file paths are given). |
| **Partially implemented** | Some of the behaviour exists; the gap is described. |
| **Not implemented** / **Not found in repository** | Searched for and absent. |
| **Verified limitation** | A defect or risk confirmed by reading the code path or by a reproduction. |
| **Plausible risk** | Follows from the code but was not reproduced or load-tested. |
| **Proposed improvement** | A suggestion. It does not exist today. |
| **Hypothetical** | Interview-style numbers that are not measurements. |

## Contents

| # | Document | What it covers |
|---|---|---|
| 01 | [Repository overview](01-repository-overview.md) | Stack, layout, evidence inventory |
| 02 | [Requirements and implemented features](02-requirements-and-implemented-features.md) | Roles, features, what is missing |
| 03 | [Current system architecture](03-current-system-architecture.md) | Context, architecture, request flow |
| 04 | [Component and service responsibilities](04-component-and-service-responsibilities.md) | Modules on both sides and who owns what |
| 05 | [API inventory](05-api-inventory.md) | All 90 routes |
| 06 | [Database design](06-database-design.md) | 13 collections, ER diagram, indexes, transactions |
| 07 | [Major workflows](07-major-workflows.md) | Discovery, availability, auth, booking, tickets, notifications |
| 08 | [Booking and concurrency analysis](08-booking-and-concurrency-analysis.md) | Double-booking protection, races |
| 09 | [Payment and failure handling](09-payment-and-failure-handling.md) | Stripe flows, refunds, failure matrix |
| 10 | [State machines](10-state-machines.md) | Booking, seat, payment, refund, gift card, support |
| 11 | [Security review](11-security-review.md) | AuthN/AuthZ, findings by severity |
| 12 | [Reliability and scalability](12-reliability-and-scalability.md) | Bottlenecks, measurements, capacity (hypothetical) |
| 13 | [Deployment and infrastructure](13-deployment-and-infrastructure.md) | Vercel, Render, CI, configuration |
| 14 | [Design gaps and recommendations](14-design-gaps-and-recommendations.md) | Prioritised issue list, proposed architecture |
| 15 | System design interview guide | **Not created in this pass** (generation was interrupted) |

## Diagrams

Source files live in [`diagrams/`](diagrams/) (Mermaid). The same diagrams are embedded in the documents so they render on GitHub.

| File | Type | Status |
|---|---|---|
| [system-context.mmd](diagrams/system-context.mmd) | Context | Current |
| [current-architecture.mmd](diagrams/current-architecture.mmd) | Architecture | Current |
| [component-architecture.mmd](diagrams/component-architecture.mmd) | Components | Current |
| [database-erd.mmd](diagrams/database-erd.mmd) | ER diagram | Current |
| [booking-sequence.mmd](diagrams/booking-sequence.mmd) | Sequence | Current |
| [payment-sequence.mmd](diagrams/payment-sequence.mmd) | Sequence | Current (shows verified gaps) |
| [concurrency-sequence.mmd](diagrams/concurrency-sequence.mmd) | Sequence | Current |
| [cancellation-sequence.mmd](diagrams/cancellation-sequence.mmd) | Sequence | Current |
| [background-jobs.mmd](diagrams/background-jobs.mmd) | Sequence | Current |
| [booking-state-machine.mmd](diagrams/booking-state-machine.mmd) | State | Current |
| [seat-state-machine.mmd](diagrams/seat-state-machine.mmd) | State | Current |
| [payment-state-machine.mmd](diagrams/payment-state-machine.mmd) | State | Current |
| [deployment-architecture.mmd](diagrams/deployment-architecture.mmd) | Deployment | Current |
| [proposed-architecture.mmd](diagrams/proposed-architecture.mmd) | Architecture | **Proposed only** |

## The five things to know first

1. **It is a monolith.** One Node.js/Express process serves the REST API, the Socket.io server and two background timers ([03](03-current-system-architecture.md)).
2. **Double booking is prevented by MongoDB, not Redis.** A transaction plus a conditional `findOneAndUpdate` on `Show.bookedSeats` decides the winner; Redis seat locks only drive the live UI ([08](08-booking-and-concurrency-analysis.md)).
3. **Payments use Stripe PaymentIntents confirmed by a client call.** There is no webhook, which leaves a paid-but-expired gap ([09](09-payment-and-failure-handling.md)).
4. **There is a critical authorisation flaw.** Signup accepts `userRole`, `walletBalance` and `primeExpiresAt` from the request body, and a self-declared ADMIN can use admin routes. This was reproduced against an in-memory database ([11](11-security-review.md)).
5. **Some list endpoints do not scale.** `GET /shows` returns every matching show with full theatre and movie documents, with no pagination ([12](12-reliability-and-scalability.md)).
