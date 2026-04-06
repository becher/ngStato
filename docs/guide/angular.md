# Angular Integration

## Setup

### 1. Configure the provider

```ts
// app.config.ts
import { ApplicationConfig, isDevMode } from '@angular/core'
import { provideRouter }                from '@angular/router'
import { provideStato }                 from '@ngstato/angular'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideStato({
      http: {
        baseUrl: 'https://api.example.com',
        timeout: 8000,
        headers: { 'X-App-Version': '1.0' },
        auth:    () => localStorage.getItem('token')
      },
      devtools: isDevMode()
    })
  ]
}
```

### 2. Create a store

```ts
// users.store.ts
import { createStore, http, connectDevTools } from '@ngstato/core'
import { StatoStore, injectStore }            from '@ngstato/angular'

function createUsersStore() {
  const store = createStore({
    users:     [] as User[],
    loading:   false,
    error:     null as string | null,

    computed: {
      total: (state) => state.users.length,
    },

    selectors: {
      admins: (state) => state.users.filter(u => u.role === 'admin'),
    },

    actions: {
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

      async deleteUser(state, id: string) {
        await http.delete(`/users/${id}`)
        state.users = state.users.filter(u => u.id !== id)
      }
    },

    hooks: {
      onInit:  (store) => store.loadUsers(),
      onError: (err, name) => console.error(`[UsersStore] ${name}:`, err.message)
    }
  })

  connectDevTools(store, 'UsersStore')
  return store
}

// Angular DI wrapper
export const UsersStore = StatoStore(() => createUsersStore())
```

### 3. Use in a component

```ts
// users.component.ts
import { Component }      from '@angular/core'
import { injectStore }    from '@ngstato/angular'
import { UsersStore }     from './users.store'

@Component({
  selector: 'app-users',
  template: `
    @if (store.loading()) {
      <div class="spinner">Loading...</div>
    }

    @if (store.error()) {
      <div class="error">{{ store.error() }}</div>
    }

    <h2>Users ({{ store.total() }})</h2>

    <ul>
      @for (user of store.users(); track user.id) {
        <li>
          {{ user.name }}
          <button (click)="store.deleteUser(user.id)">Delete</button>
        </li>
      }
    </ul>

    <h3>Admins: {{ store.admins().length }}</h3>
  `
})
export class UsersComponent {
  store = injectStore(UsersStore)
}
```

## How Signals work

When you use `injectStore()`, all state properties, computed values, and selectors become **Angular Signals**:

| Core | Angular (in template) |
|------|-----------------------|
| `store.users` (plain value) | `store.users()` (Signal) |
| `store.total` (computed) | `store.total()` (computed Signal) |
| `store.admins` (selector) | `store.admins()` (computed Signal) |
| `store.loadUsers()` (action) | `store.loadUsers()` (same) |

Actions remain regular functions — they don't become Signals.

### Under the hood

The Angular adapter:

1. Creates a `WritableSignal` for each state property
2. Subscribes to core store changes via `subscribe()`
3. On change: compares each key with `Object.is`, updates only changed Signals
4. Wraps `computed`/`selectors` in Angular `computed()` that read the Signals

```ts
// Simplified internal flow
const signals = {
  users:   signal(coreStore.users),
  loading: signal(coreStore.loading),
  error:   signal(coreStore.error),
}

// Subscribe to core changes
coreStore.subscribe((newState) => {
  for (const key of Object.keys(signals)) {
    if (!Object.is(newState[key], signals[key]())) {
      signals[key].set(newState[key])
    }
  }
})

// Computed Signals
const totalSignal = computed(() => {
  const snapshot = {}
  for (const key of Object.keys(signals)) {
    snapshot[key] = signals[key]()   // read Angular Signal → register dep
  }
  return computedFn(snapshot)
})
```

## `provideStato()` options

```ts
provideStato({
  http: {
    baseUrl: string,                          // Base URL for all requests
    timeout?: number,                         // Request timeout in ms
    headers?: Record<string, string>,         // Default headers
    auth?:    () => string | null | undefined  // Auth token provider
  },
  devtools?: boolean   // Enable DevTools panel (use isDevMode())
})
```

## `StatoStore()` — DI factory

`StatoStore()` creates an Angular injectable that wraps your core store:

```ts
import { StatoStore } from '@ngstato/angular'

// Option 1: inline factory
export const CounterStore = StatoStore(() => {
  return createStore({ count: 0, actions: { inc(s) { s.count++ } } })
})

// Option 2: separate function
function createMyStore() { return createStore({ ... }) }
export const MyStore = StatoStore(() => createMyStore())
```

## `injectStore()` — component injection

```ts
import { injectStore } from '@ngstato/angular'

@Component({ ... })
export class MyComponent {
  // Provides the Angular-wrapped store with Signals
  store = injectStore(MyStore)
}
```

::: tip
`injectStore()` can only be called in injection context (constructor, field initializer, or `inject()` function).
:::

## DevTools

### Setup

```ts
// app.component.ts
import { StatoDevToolsComponent } from '@ngstato/angular'

@Component({
  imports:  [RouterOutlet, StatoDevToolsComponent],
  template: `<router-outlet /><stato-devtools />`
})
export class AppComponent {}
```

### Connect stores

```ts
import { connectDevTools } from '@ngstato/core'

const store = createStore({ ... })
connectDevTools(store, 'MyStoreName')
```

### Features

- **Draggable panel** — move anywhere on screen
- **Resizable** — drag the bottom-right corner
- **Minimizable** — toggle with ▼/▲ button
- **Action history** — timestamps, durations, arguments
- **State diffs** — before/after comparison for each action
- **State tab** — current complete state explorer
- **⏪ Time-travel** — undo/redo through action history, jump to any point
- **🔄 Action replay** — re-execute any action from history
- **📤 State export** — download full state + action log as JSON (for bug reports)
- **📥 State import** — restore a previously exported snapshot
- **Fork-on-dispatch** — dispatching during time-travel truncates future, resumes live
- **Auto-disabled in production** — impossible to activate when `isDevMode()` returns `false`

| | NgRx DevTools | ngStato DevTools |
|---|---|---|
| Installation | Chrome extension | Zero install |
| Browser support | Chrome/Firefox | All browsers |
| Mobile | ❌ | ✅ |
| Time-travel | ✅ via extension | ✅ **built-in** |
| Action replay | ❌ | ✅ re-execute any action |
| State export/import | Via extension | ✅ **JSON file** (bug reports) |
| Fork-on-dispatch | ❌ | ✅ |
| Prod protection | Manual `logOnly` | Automatic `isDevMode()` |
| State visible in prod | Yes if forgotten | Never |

## Lifecycle

### Initialization order

1. `StatoStore()` factory is called
2. `createStore(config, { skipInit: true })` — core store created, init deferred
3. Angular Signals are set up, subscriptions connected
4. `init(angularStore)` called once — effects and `onInit` run with the Angular store

### Destruction

When the Angular injector is destroyed:
1. `onDestroy` hook fires
2. Effect cleanups run
3. Stream cleanups run (`fromStream`)
4. Subscribers cleared

## Next steps

- [Testing](/guide/testing) — unit test your stores
- [Entities](/guide/entities) — normalized collections
- [Core Concepts](/guide/core-concepts) — deep dive into the engine
