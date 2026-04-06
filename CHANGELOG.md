# Changelog

All notable changes to ngStato are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] — 2026-04-06

### 🚀 Major Release — Full NgRx Feature Parity

#### Added — `@ngstato/core`
- **Time-travel DevTools engine** — `travelTo()`, `undo()`, `redo()`, `resume()` for navigating action history
- **Action replay** — `replay(logId)` to re-execute any logged action
- **Fork-on-dispatch** — dispatching during time-travel truncates future and resumes live mode
- **State export/import** — `exportSnapshot()` / `importSnapshot()` for bug reports (JSON files)
- **Store registry** — multi-store support for DevTools (register with `connectDevTools()`)
- **`withProps()`** — attach read-only properties (services, configs) to stores without polluting state
- **`mergeFeatures()`** — compose reusable store features (equivalent to NgRx `signalStoreFeature()`)
- **`on()` multi-action** — listen to multiple actions at once with `on([action1, action2], handler)`
- **`_timeTraveling` flag** — effects are automatically skipped during state restoration
- **`hydrateForTimeTravel()`** — internal method for pure state restoration

#### Added — `@ngstato/angular`
- **Time-travel UI** — ⏪ Undo, ⏩ Redo, ▶ Live buttons in the DevTools panel
- **Replay button** — 🔄 re-execute any action from history
- **Export/Import** — 📤 Export snapshot as JSON, 📥 Import from file
- **TIME-TRAVEL badge** — pulsing visual indicator when time-traveling
- **Active log highlighting** — blue highlight on current action
- **Future log dimming** — dimmed logs after the current position

#### Added — `@ngstato/testing` (NEW PACKAGE)
- **`createMockStore()`** — create isolated test stores with state overrides and action spies
- **`__setState()`** — directly set state in tests
- **`__dispatch()`** — manually trigger actions in tests
- 13 unit tests

#### Added — `@ngstato/schematics` (NEW PACKAGE)
- **`ng generate @ngstato/schematics:store`** — scaffold a full store with CRUD actions, entity adapter, DevTools, and tests
- **`ng generate @ngstato/schematics:feature`** — scaffold reusable store features
- Options: `--crud`, `--entity`, `--devtools`, `--spec`, `--flat`, `--path`

#### Added — `@ngstato/eslint-plugin` (NEW PACKAGE)
- **`no-state-mutation-outside-action`** (`error`) — prevent direct state mutation
- **`no-async-without-error-handling`** (`warn`) — require try/catch in async actions
- **`require-devtools`** (`warn`) — suggest `connectDevTools()` after `createStore()`
- **`recommended`** preset — one-line setup

#### Added — Documentation
- 23 VitePress documentation pages (~3,400 lines)
- Complete API reference for core, helpers, and testing
- NgRx migration guide with side-by-side code comparisons
- 4 recipes: CRUD, pagination+cache, error+retry, optimistic update
- Benchmark comparison page

#### Added — CI/CD
- GitHub Actions CI — build & test on Node 18, 20, 22
- GitHub Actions deploy — VitePress → GitHub Pages

#### Changed
- All package READMEs rewritten with comparison tables and rich examples
- Root README expanded with time-travel, schematics, and ESLint sections

#### Tests
- **169 total tests** (156 core + 13 testing), all passing

---

## [0.3.0] — 2026-03-27

### Added
- **`createEntityAdapter()`** — normalized entity collections with `addOne`, `addMany`, `updateOne`, `removeOne`, `setAll`
- **`withEntities()`** — config wrapper for entity state
- **`withPersist()`** — automatic state persistence to localStorage/sessionStorage
- **Stream operators** — `fromStream`, `pipeStream`, `mapStream`, `filterStream`, `switchMapStream`, `concatMapStream`, `exhaustMapStream`, `mergeMapStream`, `distinctUntilChangedStream`, `debounceStream`, `throttleStream`, `catchErrorStream`, `retryStream`
- **`combineLatestStream()`** — combine multiple streams
- VitePress documentation scaffold

---

## [0.2.0] — 2026-03-15

### Added
- **Concurrency helpers** — `exclusive()`, `queued()`, `abortable()`, `retryable()`, `optimistic()`, `debounced()`, `throttled()`
- **HTTP client** — `http.get()`, `http.post()`, `http.put()`, `http.patch()`, `http.delete()` with interceptors
- **Angular DevTools component** — `<stato-devtools />` with drag, resize, minimize
- **`connectDevTools()`** — action logging with state snapshots
- `provideStato()` — Angular module configuration

---

## [0.1.0] — 2026-02-20

### Added
- **Core store engine** — `createStore()` with state, actions, computed, selectors, effects, hooks
- **Angular adapter** — `StatoStore()`, `injectStore()`, `createAngularStore()`
- **Angular Signals integration** — all state properties as reactive Signals
- **Lifecycle hooks** — `onInit`, `onDestroy`, `onAction`, `onActionDone`, `onError`, `onStateChange`
- **Proxy-based DI** — automatic property forwarding from core store to Angular service
- Production safety — auto-disable DevTools via `isDevMode()`

---

[0.4.0]: https://github.com/becher/ngStato/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/becher/ngStato/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/becher/ngStato/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/becher/ngStato/releases/tag/v0.1.0
