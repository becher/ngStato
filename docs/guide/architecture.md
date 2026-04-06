# Architecture

## Design principles

1. **State-first** — use plain state + actions for 90% of use cases
2. **Streams optional** — add RxJS-compatible streams only at boundaries
3. **Core-first** — `@ngstato/core` is framework-agnostic; adapters stay thin
4. **No magic** — Proxy-based mutations, explicit lifecycle, zero decorators

## Package layers

```
┌─────────────────────────────────────────────────┐
│                  Your App                       │
├─────────────────────────────────────────────────┤
│            @ngstato/angular                     │
│  ┌─────────────┬───────────┬──────────────┐     │
│  │ StatoStore() │ injectStore│ DevTools     │     │
│  │ (DI factory)│ (inject)  │ (component)  │     │
│  └─────────────┴───────────┴──────────────┘     │
│         Signals ← subscribe() → Core           │
├─────────────────────────────────────────────────┤
│            @ngstato/core                        │
│  ┌──────────┬──────────┬──────────┬──────────┐  │
│  │  Store   │ Helpers  │ HTTP     │ DevTools │  │
│  │ engine   │ 18+      │ client   │ runtime  │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────┤
│            @ngstato/testing                     │
│  ┌──────────────────────────────────────────┐   │
│  │       createMockStore()                  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## How the store engine works

### 1. `createStore(config)` boot sequence

```
createStore(config)
  │
  ├── 1. Extract state (everything except actions/computed/selectors/hooks/effects)
  ├── 2. Register actions
  ├── 3. Register computed (live recalculation)
  ├── 4. Register selectors (memoized with Proxy-based dep tracking)
  ├── 5. Register effects
  │
  ├── 6. Build public store object
  │     ├── State properties → Object.defineProperty (getter → getState()[key])
  │     ├── Actions → wrapper functions (hide `state` param, call dispatch())
  │     ├── Computed → Object.defineProperty (getter → getComputed())
  │     └── Selectors → Object.defineProperty (getter → getSelector())
  │
  └── 7. init(publicStore)    ← unless skipInit: true
        ├── Call onInit hook
        └── Run effects (force = true)
```

### 2. Action dispatch flow

When you call `store.loadUsers()`:

```
store.loadUsers(arg1, arg2)
  │
  ├── 1. onAction hook fires ('loadUsers', [arg1, arg2])
  ├── 2. Capture prevState = { ...state }
  ├── 3. Create state Proxy
  │     └── set trap: state.x = y → _setState({ x: y }) → notify + effects
  ├── 4. Execute action(stateProxy, arg1, arg2)
  │     └── Every mutation triggers subscribers immediately
  ├── 5. On success:
  │     ├── onActionDone('loadUsers', duration)
  │     ├── onStateChange(prev, next) — only if state actually changed
  │     └── Emit action event to action bus (for on() reactions)
  └── 6. On error:
        ├── onError(error, 'loadUsers')
        ├── Emit error event to action bus
        └── Re-throw the error
```

### 3. Memoized selectors — Proxy-based dependency tracking

```
selector: sortedUsers(state) => [...state.users].sort(...)

First read:
  1. Create tracking Proxy around state
  2. Execute function → proxy records: reads = ['users']
  3. Cache: trackedKeys = ['users'], cachedResult = [sorted array]

Subsequent reads:
  1. Check: Object.is(state.users, trackedValues[0]) ?
  2. Same reference → return cachedResult (no re-sort)
  3. Different reference → re-execute, re-track, re-cache
```

### 4. Effects — dependency-driven side effects

```
effects: [
  [(state) => state.selectedId, (id, { store }) => { ... }]
]

On every _setState():
  1. Evaluate deps: state.selectedId → current value
  2. Compare with previous value via Object.is
  3. Changed? → run effect(newValue, { state, store, prevDepsValue })
  4. Effect returns cleanup? → store it, call before next run
```

## Angular adapter — thin layer

The Angular adapter does 3 things:

1. **Creates Angular Signals** for each state property
2. **Subscribes** to core store changes → updates Signals
3. **Wraps computed/selectors** as Angular `computed()` Signals

Key implementation detail — the **`skipInit` pattern**:

```ts
// Angular adapter uses skipInit to control init timing
const coreStore = createStore(config, { skipInit: true })

// ... setup Signals, subscribe, build angularStore ...

// Init ONCE with the fully-built Angular store
coreStore.__store__.init(angularStore)
```

This ensures:
- Effects see the Angular store (with Signals) from their very first run
- `onInit` receives the Angular store, not the raw core store
- No double-init, no duplicate effect execution

## Action bus — inter-store communication

```
Store A                     Store B
  │                           │
  ├── dispatch('save')        │
  │     └── emitActionEvent   │
  │           └─── action bus ──── on(storeA.save, handler)
  │                           │     └── handler(storeB, event)
  │                           │
```

`on()` uses a WeakMap-based subscriber system keyed by action function references. This means:
- No string-based coupling between stores
- Type-safe action references
- Automatic cleanup when actions are garbage-collected

## File map

### Core engine
| File | Purpose |
|------|---------|
| `store.ts` | `createStore()`, `StatoStore` class, `on()` |
| `types.ts` | All TypeScript interfaces and types |
| `http.ts` | `StatoHttp` client |
| `action-bus.ts` | Inter-store event system |
| `devtools.ts` | DevTools runtime |

### Helpers (18 files)
| File | Purpose |
|------|---------|
| `abortable.ts` | Cancel previous execution |
| `debounced.ts` | Debounce action calls |
| `throttled.ts` | Throttle action calls |
| `retryable.ts` | Retry with backoff |
| `exclusive.ts` | Ignore new calls while running |
| `queued.ts` | Execute in order |
| `optimistic.ts` | Optimistic update + rollback |
| `distinct-until-changed.ts` | Skip duplicate calls |
| `fork-join.ts` | Parallel execution (all) |
| `race.ts` | Parallel execution (first wins) |
| `combine-latest.ts` | Combine state dependencies |
| `combine-latest-stream.ts` | Combine external streams |
| `from-stream.ts` | Subscribe to Observable-like |
| `stream-operators.ts` | 12 pipe operators |
| `entity-adapter.ts` | Normalized collections |
| `with-entities.ts` | Entity config wrapper |
| `with-feature.ts` | `mergeFeatures()` composition |
| `with-persist.ts` | State persistence |

### Angular adapter
| File | Purpose |
|------|---------|
| `create-angular-store.ts` | Core → Signals bridge |
| `inject-store.ts` | `injectStore()` helper |
| `provide-ngstato.ts` | `provideStato()` provider |
| `devtools.component.ts` | `<stato-devtools>` component |
