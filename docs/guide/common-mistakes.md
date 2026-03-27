# Common Mistakes

## 1) Overusing streams for simple cases

Use plain actions/selectors first. Add streams only for boundary events.

## 2) Mixing UI state and domain state without structure

Keep flags (`loading`, `error`, `selectedId`) explicit and consistent.

## 3) Missing concurrency semantics

Pick one intentionally:

- `exclusive` for single in-flight behavior
- `queued` for ordered processing
- `retryable` for transient failures

## 4) Large actions with too many responsibilities

Split one big action into focused actions and selectors.

## 5) Migrating all NgRx features at once

Migrate feature-by-feature, keep existing API contracts, and measure results.

## Quick checklist before merge

- states and selectors are typed
- async behavior is explicit
- error path is tested
- no unnecessary stream complexity

