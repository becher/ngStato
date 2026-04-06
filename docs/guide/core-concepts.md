# Core Concepts

ngStato is built around 6 core concepts: **State**, **Actions**, **Computed**, **Selectors**, **Effects**, and **Hooks**.

## State

State is the single source of truth. Define it as plain properties in your `createStore()` config:

```ts
const store = createStore({
  users:     [] as User[],
  loading:   false,
  error:     null as string | null,
  selectedId: null as number | null,
  // ...
})
```

State is **read-only** outside of actions — you access it via `store.users`, `store.loading`, etc.

::: warning
Never mutate state directly. Always use actions.
```ts
// ❌ Wrong — will not trigger subscribers or effects
store.users = []

// ✅ Correct — use an action
await store.clearUsers()
```
:::

## Actions

Actions are the **only way** to modify state. They receive a `state` proxy as their first argument. They can be sync or async:

```ts
actions: {
  // Sync action
  selectUser(state, id: number) {
    state.selectedId = id
  },

  // Async action
  async loadUsers(state) {
    state.loading = true
    state.error = null
    try {
      state.users = await http.get('/users')
    } catch (e) {
      state.error = (e as Error).message
    } finally {
      state.loading = false
    }
  },

  // Action with multiple parameters
  async updateUser(state, id: number, data: Partial<User>) {
    const updated = await http.patch(`/users/${id}`, data)
    state.users = state.users.map(u => u.id === id ? updated : u)
  }
}
```

Call actions without the `state` parameter — it's injected automatically:

```ts
await store.selectUser(42)
await store.loadUsers()
await store.updateUser(42, { name: 'Alice' })
```

::: tip How mutations work
The `state` parameter is a **Proxy**. When you write `state.users = [...]`, the Proxy intercepts the write, updates the internal state, notifies subscribers, and triggers effects.
:::

## Computed

Computed values derive from state and are **recalculated on every access**. Use them for simple derivations:

```ts
computed: {
  total:     (state) => state.users.length,
  hasError:  (state) => state.error !== null,
  admins:    (state) => state.users.filter(u => u.role === 'admin')
}
```

Access them as simple properties:

```ts
console.log(store.total)     // 5
console.log(store.hasError)  // false
console.log(store.admins)    // [{ id: 1, role: 'admin', ... }]
```

## Selectors

Selectors are **memoized** computed values — they only recalculate when their dependencies actually change. Use them for expensive derivations:

```ts
selectors: {
  sortedUsers: (state) => {
    // This sort only runs when state.users changes
    return [...state.users].sort((a, b) => a.name.localeCompare(b.name))
  },
  userCount: (state) => state.users.length
}
```

::: info Computed vs Selectors
| | `computed` | `selectors` |
|---|---|---|
| Recalculation | Every access | Only when deps change |
| Memoized | No | Yes (automatic dep tracking) |
| Use case | Simple, cheap derivations | Expensive computations |
:::

Selectors use a **Proxy-based dependency tracking** system. On the first read, a tracking Proxy records which state keys the selector function accesses. On subsequent reads, it checks if those keys changed via `Object.is` — if not, it returns the cached result.

## Effects

Effects react to **state changes** and run side effects. They are dependency-tracked: the effect only re-runs when its dependencies change.

```ts
effects: [
  // [deps, runner]
  [
    (state) => state.selectedId,       // dependency
    (selectedId, { state, store }) => { // runner — receives the deps value
      if (selectedId) {
        console.log('Selected user:', selectedId)
      }
    }
  ],

  // Effect with cleanup
  [
    (state) => state.filter,
    (filter) => {
      const timer = setInterval(() => console.log('Filter:', filter), 1000)
      return () => clearInterval(timer)  // cleanup — called before next run
    }
  ],

  // Effect with multiple dependencies
  [
    (state) => [state.page, state.pageSize],
    ([page, pageSize], { store }) => {
      store.loadPage(page, pageSize)
    }
  ]
]
```

Effects run:
- **Once** on init (with `force = true`)
- **On every state change** where the dependency value changed

## Hooks

Hooks are lifecycle callbacks that let you observe store behavior:

```ts
hooks: {
  // Called once when the store initializes
  onInit: (store) => {
    console.log('Store initialized')
    store.loadUsers()   // load data on startup
  },

  // Called when the store is destroyed
  onDestroy: (store) => {
    console.log('Store destroyed')
  },

  // Called before every action
  onAction: (actionName, args) => {
    console.log(`→ ${actionName}`, args)
  },

  // Called after every successful action
  onActionDone: (actionName, duration) => {
    console.log(`✓ ${actionName} (${duration}ms)`)
  },

  // Called when an action throws
  onError: (error, actionName) => {
    console.error(`✗ ${actionName}:`, error.message)
  },

  // Called when state actually changed (shallow diff)
  onStateChange: (prev, next) => {
    console.log('State changed', { prev, next })
  }
}
```

## Inter-store reactions with `on()`

React to actions from **another store** without tight coupling:

```ts
import { on } from '@ngstato/core'

// React to a single action
const unsub = on(authStore.logout, (store, event) => {
  console.log('User logged out — clearing data')
})

// React to multiple actions
const unsub2 = on(
  [userStore.deleteUser, userStore.updateUser],
  (store, event) => {
    console.log(`${event.name} completed in ${event.duration}ms`)
    if (event.status === 'error') {
      console.error('Error:', event.error?.message)
    }
  }
)

// Unsubscribe when done
unsub()
unsub2()
```

The `event` object contains:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Action name |
| `args` | `unknown[]` | Arguments passed to the action |
| `status` | `'success' \| 'error'` | Outcome |
| `duration` | `number` | Execution time in ms |
| `error?` | `Error` | Error if status is `'error'` |

## Feature composition with `mergeFeatures()`

Build reusable store features and compose them:

```ts
import { createStore, mergeFeatures } from '@ngstato/core'

// Define reusable features
function withLoading() {
  return {
    state:   { loading: false, error: null as string | null },
    actions: {
      setLoading: (s: any, v: boolean) => { s.loading = v },
      setError:   (s: any, e: string | null) => { s.error = e }
    },
    computed: { hasError: (s: any) => s.error !== null }
  }
}

function withPagination() {
  return {
    state:   { page: 1, pageSize: 20 },
    actions: {
      setPage:     (s: any, p: number) => { s.page = p },
      setPageSize: (s: any, ps: number) => { s.pageSize = ps }
    }
  }
}

// Compose features into a store
const store = createStore({
  users: [] as User[],
  ...mergeFeatures(withLoading(), withPagination()),
  actions: {
    async loadUsers(state) { /* ... */ }
  }
})

// All merged state + actions + computed are available
store.loading      // false
store.page         // 1
store.hasError     // false
store.setLoading(true)
store.setPage(2)
```

## Next steps

- [Architecture](/guide/architecture) — how the engine works internally
- [Angular](/guide/angular) — Signals, DI, and component integration
- [API Reference](/api/core) — complete function signatures
