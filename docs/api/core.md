# Core API

## `createStore(config)`

Creates a store instance with state, actions, computed, selectors, effects, and hooks.

### Signature

```ts
function createStore<S extends object>(
  config: S & StatoStoreConfig<S>,
  __internal?: { skipInit?: boolean }
): StatoStoreInstance<S>
```

### Config

The config object contains your state properties at the root level, plus optional reserved keys:

```ts
const store = createStore({
  // ── State (any key not listed below) ──
  count:    0,
  users:    [] as User[],
  loading:  false,

  // ── Actions ──
  actions?: {
    [name: string]: (state: S, ...args: any[]) => void | Promise<void>
  },

  // ── Computed (recalculated on every access) ──
  computed?: {
    [name: string]: (state: S) => any
  },

  // ── Selectors (memoized — recalculated only when deps change) ──
  selectors?: {
    [name: string]: (state: S) => any
  },

  // ── Effects (dependency-tracked side effects) ──
  effects?: [
    [(state: S) => any, (depsValue, ctx) => void | (() => void)]
  ],

  // ── Hooks (lifecycle callbacks) ──
  hooks?: StatoHooks<S>
})
```

### Return value

The returned store exposes:

| Property | Type | Description |
|----------|------|-------------|
| `store.x` | `readonly` | State values (read-only getters) |
| `store.myAction(args)` | `(...args) => Promise<void>` | Actions (without `state` param) |
| `store.myComputed` | `readonly` | Computed values |
| `store.mySelector` | `readonly` | Memoized selectors |
| `store.subscribe(fn)` | `(fn) => unsubscribe` | Subscribe to state changes |
| `store.getState()` | `() => S` | Get full state snapshot |
| `store.__store__` | internal | Internal store instance (for adapters) |

---

## `on(action, handler)`

React to actions dispatched on another store.

### Signature

```ts
function on<S extends object>(
  sourceAction: Function | Function[],
  handler: (store: S, event: OnEvent) => void | Promise<void>
): () => void
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `sourceAction` | `Function \| Function[]` | Action(s) to listen to |
| `handler` | `(store, event) => void` | Callback when action fires |

### `OnEvent` type

```ts
type OnEvent = {
  name:      string          // Action name
  args:      unknown[]       // Arguments passed to the action
  status:    'success' | 'error'
  duration:  number          // Execution time in ms
  error?:    Error           // Present when status = 'error'
}
```

### Examples

```ts
import { on } from '@ngstato/core'

// Single action
const unsub = on(authStore.logout, (store, event) => {
  console.log('Logged out')
})

// Multiple actions
const unsub = on(
  [userStore.create, userStore.update, userStore.delete],
  (store, event) => {
    if (event.status === 'success') {
      analyticsStore.track(event.name, event.duration)
    }
  }
)

// Cleanup
unsub()
```

---

## `mergeFeatures(...features)`

Compose reusable feature fragments into a single config object.

### Signature

```ts
function mergeFeatures(...features: FeatureConfig[]): MergedFeature
```

### `FeatureConfig`

```ts
interface FeatureConfig {
  state?:     Record<string, unknown>
  actions?:   Record<string, Function>
  computed?:  Record<string, Function>
  selectors?: Record<string, Function>
  effects?:   EffectEntry<any>[]
  hooks?:     Partial<StatoHooks<any>>
}
```

### Merge rules

| Key | Strategy |
|-----|----------|
| `state` | Spread at root level |
| `actions` | Merge object (last feature wins on conflict) |
| `computed` | Merge object |
| `selectors` | Merge object |
| `effects` | Concatenate arrays |
| `hooks` | Merge intelligently (all handlers for the same hook are called) |

### Example

```ts
function withLoading() {
  return {
    state:    { loading: false, error: null as string | null },
    actions:  { setLoading: (s, v: boolean) => { s.loading = v } },
    computed: { hasError: (s) => s.error !== null }
  }
}

const store = createStore({
  items: [] as Item[],
  ...mergeFeatures(withLoading(), withPagination())
})
```

---

## `connectDevTools(store, name)`

Connect a store instance to the built-in DevTools panel.

### Signature

```ts
function connectDevTools(store: any, name: string): void
```

### Example

```ts
import { connectDevTools } from '@ngstato/core'

const store = createStore({ ... })
connectDevTools(store, 'UserStore')
```

---

## HTTP Client

### `configureHttp(options)`

Configure the global HTTP client. Called internally by `provideStato()`.

```ts
import { configureHttp } from '@ngstato/core'

configureHttp({
  baseUrl: 'https://api.example.com',
  timeout: 8000,
  headers: { 'X-App-Version': '1.0' },
  auth:    () => localStorage.getItem('token')
})
```

### `http` methods

```ts
import { http } from '@ngstato/core'

// GET
const users = await http.get<User[]>('/users')
const user  = await http.get<User>('/users/1', {
  params: { include: 'posts' }
})

// POST
const created = await http.post<User>('/users', { name: 'Alice' })

// PUT
const updated = await http.put<User>('/users/1', { name: 'Bob' })

// PATCH
const patched = await http.patch<User>('/users/1', { active: false })

// DELETE
await http.delete('/users/1')
```

### `RequestOptions`

```ts
interface RequestOptions {
  params?:  Record<string, string | number | boolean>
  headers?: Record<string, string>
  signal?:  AbortSignal
}
```

### `StatoHttpError`

Thrown on non-2xx responses:

```ts
class StatoHttpError extends Error {
  status: number   // HTTP status code
  body:   string   // Response body
}
```

---

## `StatoHooks<S>`

```ts
interface StatoHooks<S> {
  onInit?:         (store: S) => void | Promise<void>
  onDestroy?:      (store: S) => void | Promise<void>
  onAction?:       (name: string, args: unknown[]) => void
  onActionDone?:   (name: string, duration: number) => void
  onError?:        (error: Error, actionName: string) => void
  onStateChange?:  (prev: S, next: S) => void
}
```

---

## Types

### `StatoStoreConfig<S>`

```ts
interface StatoStoreConfig<S extends object> {
  actions?:   Record<string, Action<StateSlice<S>>>
  computed?:  Record<string, ComputedFn<StateSlice<S>>>
  selectors?: Record<string, SelectorFn<StateSlice<S>>>
  effects?:   EffectEntry<StateSlice<S>>[]
  hooks?:     StatoHooks<any>
  [key: string]: unknown    // state properties
}
```

### `StatoConfig` (HTTP)

```ts
interface StatoConfig {
  baseUrl?: string
  timeout?: number
  headers?: Record<string, string>
  auth?:    () => string | null | undefined
}
```

---

## DevTools

### `connectDevTools(store, name)`

Connect a store to the DevTools panel. Registers it in the store registry for time-travel support.

```ts
import { connectDevTools } from '@ngstato/core'

const store = createStore({ count: 0, actions: { inc(s) { s.count++ } } })
connectDevTools(store, 'CounterStore')
```

### `devTools` (singleton)

The global DevTools instance. Available for programmatic control.

```ts
import { devTools } from '@ngstato/core'
```

#### Time-travel

```ts
// Jump to a specific action's resulting state
devTools.travelTo(logId: number)

// Step backward — restore previous action's state
devTools.undo()

// Step forward — restore next action's state, or resume live
devTools.redo()

// Resume live state (latest action's nextState)
devTools.resume()

// Re-execute an action from history
devTools.replay(logId: number)
```

::: tip Fork-on-dispatch
If a new action is dispatched during time-travel, ngStato **forks**: future actions are truncated and live mode resumes. This is the same behavior as Git—you went back, changed something, and the future is now different.
:::

#### State export/import

```ts
// Export full snapshot — all store states + action log
const snapshot = devTools.exportSnapshot()
// Returns: { version: 1, timestamp, stores: {...}, logs: [...] }

// Import a previously exported snapshot
devTools.importSnapshot(snapshot)
```

::: tip Bug reports
Export snapshots when reporting bugs — they contain the exact application state and the sequence of actions that led to it. Share the JSON file with your team for instant reproduction.
:::

#### Basic controls

```ts
devTools.open()       // Show panel
devTools.close()      // Hide panel
devTools.toggle()     // Toggle visibility
devTools.clear()      // Clear action log (resumes live if time-traveling)
devTools.subscribe(cb) // Listen to DevTools state changes
```

### `DevToolsSnapshot` type

```ts
interface DevToolsSnapshot {
  version:   number                      // Always 1
  timestamp: string                      // ISO timestamp
  stores:    Record<string, unknown>     // Store name → state snapshot
  logs:      ActionLog[]                 // Full action history
}
```

### `ActionLog` type

```ts
interface ActionLog {
  id:        number
  name:      string                      // "[StoreName] actionName"
  storeName: string
  args:      unknown[]
  duration:  number                      // ms
  status:    'success' | 'error'
  error?:    string
  prevState: Record<string, unknown>
  nextState: Record<string, unknown>
  at:        string                      // ISO timestamp
}
```
