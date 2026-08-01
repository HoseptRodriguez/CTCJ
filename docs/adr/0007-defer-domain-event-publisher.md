# ADR-0007: Defer introducing a DomainEventPublisher port

## Context

`Reservation.cancel()` computes a `withoutPenalty` fact (whether the cancellation happened inside the 12-hour penalty window). No billing module exists yet to consume this. The question: introduce an event-publishing mechanism now (the `outbox_events` table has existed, unwired, since Phase 1) so booking can announce "reservation cancelled" for a future consumer?

## Decision

No -- continue the direct-call pattern the identity module already established in Phase 1 (no event port there either, despite `outbox_events` existing as prepared-but-unwired groundwork). `cancelReservation` returns `{ withoutPenalty }` directly in its result for the immediate caller (surfaced in the HTTP response body); nothing is persisted or emitted beyond the normal status transition.

## Why this is safe to defer

The `withoutPenalty` fact is **fully recomputable later** from already-persisted columns: `status = 'CANCELLED'`, `updated_at` (the cancellation timestamp, since cancellation is the reservation's last mutation), and `period_start`, via `updated_at <= period_start - interval '12 hours'`. A future billing module can derive the exact same boolean at any later time purely by reading the `reservations` table -- there is nothing to lose by not emitting an event for it now, and persisting it redundantly via an event would just be duplicating already-derivable state.

## Consequences

- No consumer exists yet for any booking event, so a `DomainEventPublisher` port today would be speculative infrastructure -- introducing it now, while identity remained without one, would be an inconsistent one-off exception rather than a project-wide decision.
- When the billing module is actually built, decide the port's real shape then, informed by billing's actual consumption needs (does it need a discrete "reservation cancelled" event, or does it just query `reservations` directly?) -- guessing the shape now risks having to redesign it once a real consumer exists.
