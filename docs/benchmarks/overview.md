# Benchmarks Overview

## Objective

Compare ngStato against NgRx v21+ on realistic workloads with transparent methodology.

## Known metrics

### Bundle size

| Package | Gzipped | Raw |
|---------|---------|-----|
| `@ngstato/core` | **~3 KB** | ~12 KB |
| `@ngstato/angular` | **~1 KB** | ~4 KB |
| `@ngstato/testing` | **< 1 KB** | ~3 KB |
| **ngStato total** | **~4 KB** | ~19 KB |
| `@ngrx/store` | ~8 KB | ~30 KB |
| `@ngrx/signals` | ~12 KB | ~45 KB |
| `@ngrx/effects` | ~5 KB | ~18 KB |
| `@ngrx/entity` | ~4 KB | ~15 KB |
| `rxjs` (required) | ~25 KB | ~90 KB |
| **NgRx typical total** | **~50 KB** | ~200 KB |

**ngStato is ~12x lighter** when comparing equivalent feature sets.

### Lines of code (CRUD store)

A complete CRUD feature store with 5 actions (load, create, update, delete, select), loading/error states, and entity management:

| | NgRx SignalStore v20 | ngStato |
|---|---|---|
| State definition | 8 lines | 5 lines |
| Actions (5 CRUD) | ~55 lines | ~30 lines |
| Selectors | 12 lines | 8 lines |
| Effects/hooks | 15 lines | 5 lines |
| **Total** | **~90 lines** | **~48 lines** |
| Concepts required | 9+ (rxMethod, pipe, tap, switchMap, from, tapResponse, patchState, withState, withMethods) | 1 (async/await) |

### Feature comparison

| Feature | NgRx v21 | ngStato v0.3 |
|---------|----------|--------------|
| State management | ✅ | ✅ |
| Actions (methods) | ✅ rxMethod | ✅ async/await |
| Computed/Selectors | ✅ | ✅ (memoized) |
| Entity adapter | ✅ | ✅ |
| Concurrency helpers | ✅ via RxJS | ✅ native |
| Stream integration | ✅ RxJS required | ✅ RxJS optional |
| DevTools | ✅ Chrome extension | ✅ Built-in panel |
| Mobile DevTools | ❌ | ✅ |
| Production safety | ⚠️ Manual | ✅ Automatic |
| Testing utilities | ✅ | ✅ |
| Feature composition | ✅ signalStoreFeature | ✅ mergeFeatures |
| Inter-store reactions | ✅ via Effects | ✅ on() |
| Persistence | ❌ (meta-reducers) | ✅ withPersist |
| Schematics CLI | ✅ | 🔜 v1.0 |
| ESLint plugin | ✅ | 🔜 v1.0 |

## Benchmark scenarios (planned)

### Scenario 1: CRUD Feature Store

- Create entity adapter with 1000 items
- Perform: load all → create 50 → update 20 → delete 10
- Measure: action latency, memory usage, selector recomputation count

### Scenario 2: Search with debounce + cancellation

- Type-ahead search with 300ms debounce
- 50 rapid keystrokes
- Measure: cancelled requests, final result latency, bundle cost

### Scenario 3: Concurrent async requests

- 10 concurrent API calls with different strategies
- Compare: `exclusive` vs NgRx `exhaustMap`, `queued` vs `concatMap`
- Measure: correct behavior, timing, memory

### Scenario 4: Large entity updates

- 10,000 entities in normalized state
- Batch update 500 entities
- Measure: update latency, selector recomputation, memory delta

## Methodology

- **Same backend** — identical API contracts
- **Same UI behavior** — identical acceptance criteria
- **Same tooling** — Vitest for benchmarks, Chrome DevTools for profiling
- **Reproducible** — scripts and fixtures in `benchmarks/` directory
- **Transparent** — raw data published alongside results

## Status

> Initial benchmark suite is in preparation. Results will be published with full methodology and raw data.
>
> For now, the known metrics above (bundle size, lines of code, feature comparison) provide a solid basis for evaluation.
