<div align="center">

# ngStato

### Stop writing 14 lines of NgRx for a 5-line API call.

**State management for Angular — async/await instead of RxJS, ~3 KB instead of ~50 KB.**

[![npm](https://img.shields.io/badge/npm-v0.4.0-blue)](https://www.npmjs.com/package/@ngstato/core)
[![gzip](https://img.shields.io/badge/gzip-~3KB-brightgreen)](#benchmarks)
[![tests](https://img.shields.io/badge/tests-169%2B-green)](#)
[![Angular](https://img.shields.io/badge/Angular-17%2B-dd0031)](https://angular.dev)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](./LICENSE)

[Start in 5 min](https://becher.github.io/ngStato/guide/start-in-5-min) · [Documentation](https://becher.github.io/ngStato/) · [API Reference](https://becher.github.io/ngStato/api/core) · [NgRx Migration](https://becher.github.io/ngStato/migration/ngrx-to-ngstato)

</div>

---

## NgRx vs ngStato — same result, different experience

**NgRx** — 9 concepts, 14 lines:

```ts
load: rxMethod<void>(pipe(
  tap(() => patchState(store, { loading: true })),
  switchMap(() => from(service.getAll()).pipe(
    tapResponse({
      next:  (users) => patchState(store, { users, loading: false }),
      error: (e)     => patchState(store, { error: e.message, loading: false })
    })
  ))
))
```

**ngStato** — 1 concept, 5 lines:

```ts
async load(state) {
  state.loading = true
  state.users   = await http.get('/users')
  state.loading = false
}
```

> Same behavior. Same Signals. Same Angular DI. **87% less code.**

---

## Get started in 60 seconds

```bash
npm install @ngstato/core @ngstato/angular
```

```ts
// app.config.ts
import { provideStato } from '@ngstato/angular'
import { isDevMode }    from '@angular/core'

export const appConfig = {
  providers: [
    provideStato({
      http: { baseUrl: 'https://api.example.com' },
      devtools: isDevMode()
    })
  ]
}
```

```ts
// users.store.ts
import { createStore, http, connectDevTools } from '@ngstato/core'
import { StatoStore, injectStore }            from '@ngstato/angular'

export const UsersStore = StatoStore(() => {
  const store = createStore({
    users:   [] as User[],
    loading: false,
    error:   null as string | null,

    selectors: {
      total:      (s) => s.users.length,
      activeUsers: (s) => s.users.filter(u => u.active)
    },

    actions: {
      async loadUsers(state) {
        state.loading = true
        state.error   = null
        try {
          state.users = await http.get('/users')
        } catch (e) {
          state.error = (e as Error).message
          throw e
        } finally {
          state.loading = false
        }
      },

      async createUser(state, payload: Omit<User, 'id'>) {
        const user = await http.post<User>('/users', payload)
        state.users = [...state.users, user]
      },

      async deleteUser(state, id: string) {
        await http.delete(`/users/${id}`)
        state.users = state.users.filter(u => u.id !== id)
      }
    },

    hooks: {
      onInit:  (store) => store.loadUsers(),
      onError: (err, action) => console.error(`[UsersStore] ${action}:`, err.message)
    }
  })

  connectDevTools(store, 'UsersStore')
  return store
})
```

```ts
// users.component.ts — all state properties are Angular Signals
@Component({
  template: `
    @if (store.loading()) {
      <div class="spinner">Loading...</div>
    }

    <h2>Users ({{ store.total() }})</h2>

    @for (user of store.users(); track user.id) {
      <div class="user-card">
        <span>{{ user.name }}</span>
        <button (click)="store.deleteUser(user.id)">Delete</button>
      </div>
    }

    <button (click)="store.loadUsers()">Refresh</button>
  `
})
export class UsersComponent {
  store = injectStore(UsersStore)
}
```

**Done.** State is Signals. Actions are functions. No boilerplate.

---

## Why teams switch

| | NgRx v21 | ngStato |
|:--|:--|:--|
| **Bundle** | ~50 KB gzip | **~3 KB** gzip |
| **Concepts for async action** | 9 (rxMethod, pipe, tap, switchMap…) | **1** (async/await) |
| **Lines for a CRUD store** | ~90 | **~45** |
| **RxJS required** | Yes | **No** |
| **DevTools** | Chrome extension only | **Built-in panel, all browsers, mobile** |
| **Time-travel** | ✅ via extension | ✅ **built-in with fork-on-dispatch** |
| **Action replay** | ❌ | ✅ **re-execute any action** |
| **State export/import** | Via extension | ✅ **JSON file for bug reports** |
| **Prod safety** | Manual `logOnly` | **Auto `isDevMode()`** |
| **Entity adapter** | ✅ | ✅ `createEntityAdapter` + `withEntities` |
| **Feature composition** | ✅ `signalStoreFeature` | ✅ `mergeFeatures()` |
| **Service injection** | ✅ `withProps` | ✅ `withProps()` + closures |
| **Concurrency control** | Via RxJS operators | ✅ Native helpers |
| **Testing** | `provideMockStore` | ✅ `createMockStore()` |
| **Persistence** | Custom meta-reducers | ✅ `withPersist()` built-in |
| **Schematics CLI** | ✅ `ng generate` | ✅ `ng generate @ngstato/schematics:store` |
| **ESLint plugin** | ✅ `@ngrx/eslint-plugin` | ✅ `@ngstato/eslint-plugin` |

---

## Built-in helpers — no RxJS needed

```ts
import { exclusive, retryable, optimistic, abortable, queued } from '@ngstato/core'

actions: {
  submit:  exclusive(async (s) => { ... }),           // ignore while running (exhaustMap)
  search:  abortable(async (s, q, { signal }) => {}), // cancel previous (switchMap)
  load:    retryable(async (s) => { ... }, { attempts: 3 }), // auto-retry
  delete:  optimistic((s, id) => { ... }, async () => { ... }), // instant + rollback
  send:    queued(async (s, msg) => { ... }),          // process in order (concatMap)
}
```

**Plus:** `debounced` · `throttled` · `distinctUntilChanged` · `forkJoin` · `race` · `combineLatest` · `fromStream` · `pipeStream` + 12 stream operators · `createEntityAdapter` · `withEntities` · `withPersist` · `mergeFeatures` · `withProps` · `on()` inter-store reactions

→ [Full helpers API](https://becher.github.io/ngStato/api/helpers)

---

## DevTools — zero install, built-in time-travel

Built-in panel. Drag, resize, minimize. No Chrome extension.
Auto-disabled in production via `isDevMode()`.

```ts
import { connectDevTools, devTools } from '@ngstato/core'
connectDevTools(store, 'UsersStore')

// Time-travel programmatically
devTools.undo()                    // step backward
devTools.redo()                    // step forward
devTools.travelTo(logId)           // jump to any action
devTools.replay(logId)             // re-execute an action
devTools.resume()                  // resume live mode

// Export/import for bug reports
const snapshot = devTools.exportSnapshot()
devTools.importSnapshot(snapshot)
```

```html
<!-- app.component.html -->
<stato-devtools />
```

---

## Schematics — scaffold in seconds

```bash
# Generate a full CRUD store with tests
ng generate @ngstato/schematics:store users --crud --entity

# Generate a reusable feature
ng generate @ngstato/schematics:feature loading
```

<details>
<summary>Example generated store</summary>

```ts
// users.store.ts (auto-generated)
import { createStore, http, createEntityAdapter, withEntities, connectDevTools } from '@ngstato/core'
import { StatoStore } from '@ngstato/angular'

export interface User { id: string; name: string }
const adapter = createEntityAdapter<User>()

function createUserStore() {
  const store = createStore({
    ...withEntities<User>(),
    loading: false,
    error: null as string | null,

    selectors: { total: (s) => s.ids.length },

    actions: {
      async loadUsers(state) { /* ... */ },
      async createUser(state, payload) { /* ... */ },
      async updateUser(state, id, changes) { /* ... */ },
      async deleteUser(state, id) { /* ... */ }
    },

    hooks: {
      onInit: (store) => store.loadUsers(),
      onError: (err, action) => console.error(`[UserStore] ${action}:`, err.message)
    }
  })
  connectDevTools(store, 'UserStore')
  return store
}

export const UserStore = StatoStore(() => createUserStore())
```

</details>

---

## ESLint — catch mistakes at dev time

```bash
npm install -D @ngstato/eslint-plugin
```

```js
// eslint.config.js
import ngstato from '@ngstato/eslint-plugin'
export default [ngstato.configs.recommended]
```

| Rule | Default | Description |
|------|---------|-------------|
| `ngstato/no-state-mutation-outside-action` | `error` | Prevent direct state mutation |
| `ngstato/no-async-without-error-handling` | `warn` | Require try/catch in async actions |
| `ngstato/require-devtools` | `warn` | Suggest `connectDevTools()` |

---

## Packages

| Package | Description | Size |
|---------|-------------|------|
| [`@ngstato/core`](./packages/core) | Framework-agnostic store engine + helpers | ~3 KB |
| [`@ngstato/angular`](./packages/angular) | Angular Signals + DI + DevTools | ~1 KB |
| [`@ngstato/testing`](./packages/testing) | `createMockStore()` test utilities | < 1 KB |
| [`@ngstato/schematics`](./packages/schematics) | `ng generate` — store & feature scaffolding | CLI |
| [`@ngstato/eslint-plugin`](./packages/eslint-plugin) | 3 ESLint rules for best practices | CLI |

## Documentation

📖 **[becher.github.io/ngStato](https://becher.github.io/ngStato/)**

| | |
|:--|:--|
| [Start in 5 min](https://becher.github.io/ngStato/guide/start-in-5-min) | [Core concepts](https://becher.github.io/ngStato/guide/core-concepts) |
| [Angular guide](https://becher.github.io/ngStato/guide/angular) | [Architecture](https://becher.github.io/ngStato/guide/architecture) |
| [Testing guide](https://becher.github.io/ngStato/guide/testing) | [NgRx migration](https://becher.github.io/ngStato/migration/ngrx-to-ngstato) |
| [CRUD recipe](https://becher.github.io/ngStato/recipes/crud) | [API reference](https://becher.github.io/ngStato/api/core) |
| [Entities](https://becher.github.io/ngStato/guide/entities) | [Benchmarks](https://becher.github.io/ngStato/benchmarks/overview) |

## Contributing

```bash
git clone https://github.com/becher/ngStato
cd ngStato && pnpm install && pnpm build && pnpm test
```

## License

MIT — Copyright © 2025-2026 ngStato
