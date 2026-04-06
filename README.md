<div align="center">

# ngStato

### Stop writing 14 lines of NgRx for a 5-line API call.

**State management for Angular — async/await instead of RxJS, ~3 KB instead of ~50 KB.**

[![npm](https://img.shields.io/badge/npm-v0.3.0-blue)](https://www.npmjs.com/package/@ngstato/core)
[![gzip](https://img.shields.io/badge/gzip-~3KB-brightgreen)](#benchmarks)
[![tests](https://img.shields.io/badge/tests-149%2B-green)](#)
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
import { createStore, http }         from '@ngstato/core'
import { StatoStore, injectStore }   from '@ngstato/angular'

export const UsersStore = StatoStore(() => createStore({
  users:   [] as User[],
  loading: false,

  selectors: {
    total: (s) => s.users.length
  },

  actions: {
    async loadUsers(state) {
      state.loading = true
      state.users   = await http.get('/users')
      state.loading = false
    }
  },

  hooks: { onInit: (store) => store.loadUsers() }
}))
```

```ts
// users.component.ts — all state properties are Angular Signals
@Component({
  template: `
    <h2>Users ({{ store.total() }})</h2>
    @for (user of store.users(); track user.id) {
      <p>{{ user.name }}</p>
    }
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
| **State export/import** | Via extension | ✅ **JSON file for bug reports** |
| **Prod safety** | Manual `logOnly` | **Auto `isDevMode()`** |
| **Entity adapter** | ✅ | ✅ `createEntityAdapter` + `withEntities` |
| **Feature composition** | ✅ `signalStoreFeature` | ✅ `mergeFeatures()` |
| **Service injection** | ✅ `withProps` | ✅ `withProps()` + closures |
| **Concurrency control** | Via RxJS operators | ✅ Native helpers |
| **Testing** | `provideMockStore` | ✅ `createMockStore()` |
| **Persistence** | Custom meta-reducers | ✅ `withPersist()` built-in |
| **Schematics CLI** | ✅ `ng generate` | ✅ `ng generate @ngstato/schematics:store` |

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

**Plus:** `debounced` · `throttled` · `distinctUntilChanged` · `forkJoin` · `race` · `combineLatest` · `fromStream` · `pipeStream` + 12 stream operators · `createEntityAdapter` · `withEntities` · `withPersist` · `mergeFeatures` · `on()` inter-store reactions

→ [Full helpers API](https://becher.github.io/ngStato/api/helpers)

---

## DevTools — zero install

Built-in panel. Drag, resize, minimize. No Chrome extension.  
Auto-disabled in production via `isDevMode()`.

```ts
import { connectDevTools } from '@ngstato/core'
connectDevTools(store, 'UsersStore')
```

```html
<!-- app.component.html -->
<stato-devtools />
```

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

## Contributing

```bash
git clone https://github.com/becher/ngStato
cd ngStato && pnpm install && pnpm build && pnpm test
```

## License

MIT — Copyright © 2025 ngStato
