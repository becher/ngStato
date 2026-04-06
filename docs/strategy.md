# Strategy

## Product goal

Match NgRx capabilities for real apps, with simpler API and less code.

## Principles

1. **State-first by default** — actions + selectors + effects handle 90% of use cases without RxJS.
2. **Streams optional at boundaries** — use `fromStream()` and stream operators only for WebSocket, Firebase, and external event sources.
3. **Core-first architecture** — `@ngstato/core` is framework-agnostic. Angular, React, and Vue adapters stay thin.
4. **Strong semantics via tests** — every feature has semantic tests before documentation or marketing claims.
5. **Incremental adoption** — ngStato can coexist with NgRx during migration.

## Architecture

- `@ngstato/core` — store engine, 18+ helpers, HTTP client, entity adapter, stream toolkit
- `@ngstato/angular` — Angular Signals integration, DI, DevTools component
- `@ngstato/testing` — `createMockStore()` for isolated unit tests

## Documentation direction

Build a complete, modern documentation experience:

- **Concept-driven guides** — explain every building block with code
- **Practical recipes** — CRUD, pagination, error handling, optimistic updates
- **Migration playbook** — step-by-step NgRx → ngStato with API mapping
- **API reference** — complete function signatures with types and examples
- **Benchmark methodology** — transparent, reproducible comparisons

## Current version: v0.3

See the [full roadmap](/guide/getting-started) and [README-SPECD.md](https://github.com/becher/ngStato/blob/main/README-SPECD.md) for detailed implementation notes.
