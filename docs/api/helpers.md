# Helpers API

All helpers are imported from `@ngstato/core`:

```ts
import { abortable, debounced, throttled, /* ... */ } from '@ngstato/core'
```

---

## Action Wrappers

### `abortable()` {#abortable}

Cancels the previous execution when a new call arrives. Equivalent to RxJS `switchMap`.

```ts
function abortable<S, A extends any[]>(
  fn: (state: S, ...args: A, ctx: { signal: AbortSignal }) => Promise<void>
): (state: S, ...args: A) => Promise<void>
```

```ts
actions: {
  search: abortable(async (state, query: string, { signal }) => {
    state.results = await fetch(`/api/search?q=${query}`, { signal })
      .then(r => r.json())
  })
}

// Rapid calls: only the last one completes
await store.search('a')    // ← cancelled
await store.search('ab')   // ← cancelled
await store.search('abc')  // ← completes
```

---

### `debounced()` {#debounced}

Delays execution until no new calls arrive within the specified delay.

```ts
function debounced<S, A extends any[]>(
  fn: (state: S, ...args: A) => void | Promise<void>,
  delay?: number   // default: 300ms
): (state: S, ...args: A) => Promise<void>
```

```ts
actions: {
  updateFilter: debounced((state, query: string) => {
    state.query = query
  }, 300)
}
```

::: info
The debounced function uses the **latest state** from the most recent call, not the state from the first call.
:::

---

### `throttled()` {#throttled}

Executes at most once per interval. First call executes immediately, subsequent calls within the interval are deferred.

```ts
function throttled<S, A extends any[]>(
  fn: (state: S, ...args: A) => void | Promise<void>,
  interval?: number   // default: 300ms
): (state: S, ...args: A) => Promise<void>
```

```ts
actions: {
  trackScroll: throttled((state, position: number) => {
    state.scrollPosition = position
  }, 100)
}
```

---

### `exclusive()` {#exclusive}

Ignores new calls while an execution is in progress. Equivalent to RxJS `exhaustMap`.

```ts
function exclusive<S, A extends any[]>(
  fn: (state: S, ...args: A) => Promise<void>
): (state: S, ...args: A) => Promise<void>
```

```ts
actions: {
  submit: exclusive(async (state) => {
    state.submitting = true
    await http.post('/orders', state.cart)
    state.submitting = false
  })
}

// Double-click protection: second call is silently ignored
await store.submit()   // ← executes
await store.submit()   // ← ignored (first still running)
```

---

### `queued()` {#queued}

Queues calls and executes them in order. Equivalent to RxJS `concatMap`.

```ts
function queued<S, A extends any[]>(
  fn: (state: S, ...args: A) => Promise<void>
): (state: S, ...args: A) => Promise<void>
```

```ts
actions: {
  sendMessage: queued(async (state, text: string) => {
    const msg = await http.post('/messages', { text })
    state.messages = [...state.messages, msg]
  })
}

// Messages are sent in order, never concurrently
store.sendMessage('Hello')   // executes immediately
store.sendMessage('World')   // queued, runs after 'Hello' completes
```

---

### `retryable()` {#retryable}

Retries on failure with configurable backoff strategy.

```ts
function retryable<S, A extends any[]>(
  fn: (state: S, ...args: A) => Promise<void>,
  options?: {
    attempts?: number       // default: 3
    delay?:    number       // default: 1000ms
    backoff?:  'fixed' | 'exponential'   // default: 'fixed'
  }
): (state: S, ...args: A) => Promise<void>
```

```ts
actions: {
  loadData: retryable(async (state) => {
    state.data = await http.get('/data')
  }, {
    attempts: 3,
    backoff: 'exponential',
    delay: 1000   // 1s, 2s, 4s
  })
}
```

---

### `optimistic()` {#optimistic}

Applies a local mutation immediately, then confirms with an async operation. Rolls back automatically on failure using `structuredClone`.

```ts
function optimistic<S, A extends any[]>(
  apply:   (state: S, ...args: A) => void,
  confirm: (state: S, ...args: A) => Promise<void>
): (state: S, ...args: A) => Promise<void>
```

```ts
actions: {
  deleteUser: optimistic(
    // Apply immediately (optimistic)
    (state, id: string) => {
      state.users = state.users.filter(u => u.id !== id)
    },
    // Confirm with server (rollback if this fails)
    async (state, id: string) => {
      await http.delete(`/users/${id}`)
    }
  )
}
```

::: warning
The rollback uses `structuredClone` for a deep copy. State should not contain functions, DOM nodes, or Symbols.
:::

---

### `distinctUntilChanged()` {#distinctuntilchanged}

Skips execution if the arguments haven't changed since the last call.

```ts
function distinctUntilChanged<S, A extends any[]>(
  fn: (state: S, ...args: A) => void | Promise<void>,
  comparator?: (prev: A, next: A) => boolean
): (state: S, ...args: A) => void | Promise<void>
```

```ts
actions: {
  selectTab: distinctUntilChanged((state, tabId: string) => {
    state.activeTab = tabId
    state.tabData = null  // reset
  })
}

await store.selectTab('users')   // executes
await store.selectTab('users')   // skipped — same argument
await store.selectTab('orders')  // executes
```

---

## Async Composition

### `forkJoin()` {#forkjoin}

Execute multiple async operations in parallel. Resolves when **all** complete.

```ts
function forkJoin<T extends Record<string, () => Promise<any>>>(
  tasks: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>
```

```ts
actions: {
  async loadDashboard(state) {
    const data = await forkJoin({
      users:    () => http.get('/users'),
      orders:   () => http.get('/orders'),
      stats:    () => http.get('/stats')
    })
    state.users  = data.users
    state.orders = data.orders
    state.stats  = data.stats
  }
}
```

---

### `race()` {#race}

Execute multiple async operations in parallel. Resolves with the **first** to complete.

```ts
function race<T extends Record<string, () => Promise<any>>>(
  tasks: T
): Promise<{ key: keyof T; value: any }>
```

```ts
actions: {
  async loadFastest(state) {
    const { key, value } = await race({
      primary:  () => http.get('/api-primary/data'),
      fallback: () => http.get('/api-fallback/data')
    })
    state.data = value
    state.source = key   // 'primary' or 'fallback'
  }
}
```

---

### `combineLatest()` {#combinelatest}

Combine dependencies from multiple state sources. Returns the latest value from each.

```ts
function combineLatest<T extends Record<string, () => any>>(
  deps: T
): { [K in keyof T]: ReturnType<T[K]> }
```

```ts
const combined = combineLatest({
  users:  () => userStore.users,
  filter: () => filterStore.activeFilter
})
// combined.users, combined.filter
```

---

## Entity Helpers

### `createEntityAdapter()` {#createentityadapter}

Creates an adapter for normalized collections with CRUD operations and selectors.

```ts
function createEntityAdapter<T>(options?: {
  selectId?:     (entity: T) => EntityId
  sortComparer?: (a: T, b: T) => number
}): EntityAdapter<T>
```

#### EntityAdapter methods

| Method | Description |
|--------|-------------|
| `getInitialState()` | Returns `{ ids: [], entities: {} }` |
| `addOne(state, entity)` | Add a single entity |
| `addMany(state, entities)` | Add multiple entities |
| `setAll(state, entities)` | Replace all entities |
| `setOne(state, entity)` | Add or replace one entity |
| `updateOne(state, { id, changes })` | Partial update one entity |
| `updateMany(state, updates[])` | Partial update multiple entities |
| `removeOne(state, id)` | Remove one entity |
| `removeMany(state, ids)` | Remove multiple entities |
| `removeAll(state)` | Remove all entities |

#### EntityAdapter selectors

| Selector | Description |
|----------|-------------|
| `selectAll(state)` | Array of all entities (sorted if comparer provided) |
| `selectById(state, id)` | Single entity or `undefined` |
| `selectIds(state)` | Array of all IDs |
| `selectTotal(state)` | Total count |

```ts
const adapter = createEntityAdapter<User>({
  selectId:     (u) => u.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
})

const initial = adapter.getInitialState()
// { ids: [], entities: {} }

adapter.addOne(state.users, { id: 1, name: 'Alice' })
adapter.selectAll(state.users)   // [{ id: 1, name: 'Alice' }]
```

---

### `withEntities()` {#withentities}

Config wrapper that injects entity state, actions, and selectors into a store.

```ts
function withEntities<S, T>(
  config: S & StatoStoreConfig<S>,
  options: {
    key:      string
    adapter:  EntityAdapter<T>
  }
): S & StatoStoreConfig<S>
```

```ts
const adapter = createEntityAdapter<Student>({ selectId: (s) => s.id })

const store = createStore(
  withEntities(
    {
      loading: false,
      actions: {
        async loadAll(state) { /* ... */ }
      }
    },
    { key: 'students', adapter }
  )
)

// Generated state: store.studentsIds, store.studentsEntities
// Generated actions: store.addStudents, store.setStudents, etc.
// Generated selectors: store.allStudents, store.totalStudents, etc.
```

---

## Persistence

### `withPersist()` {#withpersist}

Add automatic state persistence to localStorage or sessionStorage.

```ts
function withPersist<S extends object>(
  config: S & StatoStoreConfig<S>,
  options: PersistOptions
): S & StatoStoreConfig<S>

interface PersistOptions {
  key:       string
  storage?:  PersistStorage         // default: localStorage
  pick?:     string[]               // persist only these keys
  version?:  number                 // schema version
  migrate?:  (persisted: any, version: number) => any
}
```

```ts
const store = createStore(
  withPersist(
    { theme: 'dark', lang: 'en', actions: { /* ... */ } },
    {
      key: 'app-settings',
      pick: ['theme', 'lang'],
      version: 2,
      migrate: (data, v) => {
        if (v < 2) data.lang = data.lang ?? 'en'
        return data
      }
    }
  )
)
```

---

## Stream Helpers

### `fromStream()` {#fromstream}

Subscribe to an Observable-like source and project values into state.

```ts
function fromStream<S>(
  source:   () => { subscribe: (observer: any) => { unsubscribe: () => void } },
  handler:  (state: S, value: any) => void
): (state: S) => () => void
```

```ts
actions: {
  listen: fromStream(
    () => webSocket('wss://api.example.com/ws'),
    (state, message) => {
      state.messages = [...state.messages, message]
    }
  )
}
```

---

### `combineLatestStream()` {#combinelateststream}

Combine multiple Observable-like sources into a single stream.

```ts
function combineLatestStream<T extends Record<string, Observable>>(
  sources: T,
  handler: (state: S, values: { [K in keyof T]: any }) => void
): (state: S) => () => void
```

---

### `pipeStream()` + operators {#pipestream}

Compose stream transformations without RxJS.

```ts
import {
  pipeStream, mapStream, filterStream,
  switchMapStream, concatMapStream, exhaustMapStream, mergeMapStream,
  distinctUntilChangedStream, debounceStream, throttleStream,
  catchErrorStream, retryStream
} from '@ngstato/core'
```

| Operator | RxJS equivalent | Description |
|----------|-----------------|-------------|
| `mapStream(fn)` | `map` | Transform values |
| `filterStream(fn)` | `filter` | Filter values |
| `switchMapStream(fn)` | `switchMap` | Cancel previous, subscribe to new |
| `concatMapStream(fn)` | `concatMap` | Queue inner subscriptions |
| `exhaustMapStream(fn)` | `exhaustMap` | Ignore new while inner active |
| `mergeMapStream(fn)` | `mergeMap` | Subscribe to all concurrently |
| `distinctUntilChangedStream(fn?)` | `distinctUntilChanged` | Skip duplicate values |
| `debounceStream(ms)` | `debounceTime` | Delay emissions |
| `throttleStream(ms)` | `throttleTime` | Rate-limit emissions |
| `catchErrorStream(fn)` | `catchError` | Handle errors |
| `retryStream(n)` | `retry` | Retry on error |

```ts
const transformed = pipeStream(
  source$,
  filterStream((x) => x > 0),
  mapStream((x) => x * 2),
  debounceStream(300),
  distinctUntilChangedStream()
)

actions: {
  listen: fromStream(
    () => transformed,
    (state, value) => { state.latest = value }
  )
}
```

---

## Composition

### `withProps()` {#with-props}

Attach read-only properties (services, configs) to a store instance. Properties are **not** part of the state.

```ts
function withProps<S, P>(store: S, props: P): S & Readonly<P>
```

```ts
import { createStore, withProps } from '@ngstato/core'

// In an Angular StatoStore factory:
export const UsersStore = StatoStore(() => {
  const api      = inject(ApiService)
  const notifier = inject(NotificationService)

  const store = createStore({
    users: [] as User[],
    loading: false,

    actions: {
      async loadUsers(state) {
        state.loading = true
        state.users = await api.getUsers()   // closure over injected service
        state.loading = false
      }
    }
  })

  return withProps(store, { api, notifier })
})

// Usage in component:
store = injectStore(UsersStore)
store.users()          // Signal<User[]>
store.loadUsers()      // action
store.api              // ApiService (read-only, not in state)
```

::: tip
Actions already have access to injected services via closures. `withProps` is for when you also want to **expose** those services on the store instance for external access.
:::

### `mergeFeatures()` {#merge-features}

Compose reusable store features. Equivalent to NgRx's `signalStoreFeature()`.

```ts
function mergeFeatures(...features: FeatureConfig[]): MergedFeature
```

```ts
import { createStore, mergeFeatures } from '@ngstato/core'

// Reusable features
function withLoading() {
  return {
    state:    { loading: false, error: null as string | null },
    actions:  { setLoading: (s, v: boolean) => { s.loading = v } },
    computed: { hasError: (s) => s.error !== null }
  }
}

function withPagination(pageSize = 20) {
  return {
    state:    { page: 1, pageSize },
    actions:  { nextPage: (s) => { s.page++ } },
    computed: { offset: (s) => (s.page - 1) * s.pageSize }
  }
}

// Compose into a store
const store = createStore({
  items: [] as Item[],
  ...mergeFeatures(withLoading(), withPagination(10)),
  actions: {
    async loadItems(state) {
      state.loading = true
      state.items = await http.get('/items', { params: { page: state.page } })
      state.loading = false
    }
  }
})

store.loading     // false  (from withLoading)
store.page        // 1      (from withPagination)
store.hasError    // false  (computed from withLoading)
store.offset      // 0      (computed from withPagination)
```
