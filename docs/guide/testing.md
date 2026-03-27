# Testing

## Principles

- Test store behavior, not implementation details
- Assert state transitions and selector outputs
- Cover async semantics (`exclusive`, `queued`, retries) with deterministic tests

## What to test

- action success and error paths
- selector correctness
- entity operations (add/update/remove)
- stream-related behavior when used

## Tooling

Use Vitest for fast feedback and simple setup across monorepo packages and demos.

