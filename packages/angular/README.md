<div align="center">

# @ngstato/angular

### NgRx requires 9 concepts for an async action. ngStato requires 1.

**Angular Signals. Dependency injection. Built-in DevTools. ~1 KB.**

[![npm](https://img.shields.io/badge/npm-v0.3.1-blue)](https://www.npmjs.com/package/@ngstato/angular)
[![Angular](https://img.shields.io/badge/Angular-17%2B-dd0031)](https://angular.dev)
[![gzip](https://img.shields.io/badge/gzip-~1KB-brightgreen)](#)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](#)

[Documentation](https://becher.github.io/ngStato/) · [Angular Guide](https://becher.github.io/ngStato/guide/angular) · [API Reference](https://becher.github.io/ngStato/api/core)

</div>

---

## Install

```bash
npm install @ngstato/core @ngstato/angular
```

## Full working example — 3 files

**1. Config** — one-time setup:

```ts
// app.config.ts
provideStato({
  http: { baseUrl: 'https://api.example.com' },
  devtools: isDevMode()
})
```

**2. Store** — state + actions + selectors in one object:

```ts
// users.store.ts
import { createStore, http, connectDevTools }  from '@ngstato/core'
import { StatoStore }                          from '@ngstato/angular'

export const UsersStore = StatoStore(() => {
  const store = createStore({
    users:   [] as User[],
    loading: false,
    error:   null as string | null,

    selectors: {
      total:  (s) => s.users.length,
      admins: (s) => s.users.filter(u => u.role === 'admin')
    },

    actions: {
      async loadUsers(state) {
        state.loading = true
        state.users   = await http.get('/users')
        state.loading = false
      },

      async deleteUser(state, id: string) {
        await http.delete(`/users/${id}`)
        state.users = state.users.filter(u => u.id !== id)
      }
    },

    hooks: { onInit: (s) => s.loadUsers() }
  })

  connectDevTools(store, 'Users')
  return store
})
```

**3. Component** — everything is a Signal:

```ts
// users.component.ts
@Component({
  template: `
    @if (store.loading()) { <spinner /> }
    
    <h2>Users ({{ store.total() }})</h2>
    
    @for (user of store.users(); track user.id) {
      <div>
        {{ user.name }}
        <button (click)="store.deleteUser(user.id)">×</button>
      </div>
    }
  `
})
export class UsersComponent {
  store = injectStore(UsersStore)
}
```

**That's the entire pattern.** No reducers, no effects class, no action creators, no selectors file.

---

## What you get

| What you define | What Angular gets |
|:--|:--|
| `users: []` (state) | `store.users()` → `WritableSignal` |
| `total: (s) => s.users.length` (selector) | `store.total()` → `computed Signal` (memoized) |
| `async loadUsers(state) { ... }` (action) | `store.loadUsers()` → `Promise<void>` |

All Signals **update automatically**. Zero manual subscriptions.

---

## DevTools — zero install, all browsers

```html
<stato-devtools />
```

- Draggable, resizable, minimizable panel
- Action history with timestamps and duration
- State diffs — before/after for every action
- Current state explorer
- **Works on mobile**
- **Impossible to enable in production** (`isDevMode()`)

| | NgRx | ngStato |
|:--|:--|:--|
| Setup | Chrome extension | `<stato-devtools />` |
| Mobile | ❌ | ✅ |
| Prod safety | Manual | **Automatic** |

---

## Why teams switch

| | NgRx v21 | @ngstato |
|:--|:--|:--|
| **Bundle** | ~50 KB gzip | **~4 KB** (core + angular) |
| **Async action** | `rxMethod` + `pipe` + `tap` + `switchMap` + `from` + `tapResponse` + `patchState` | **`async/await`** |
| **CRUD store** | ~90 lines, 3+ files | **~45 lines, 1 file** |
| **DevTools** | Chrome only | **All browsers + mobile** |
| **Entity adapter** | ✅ | ✅ |
| **Feature composition** | ✅ | ✅ `mergeFeatures()` |
| **Concurrency** | RxJS operators | ✅ `exclusive` `queued` `abortable` |
| **Testing** | `provideMockStore` | ✅ `createMockStore()` |
| **Persistence** | Custom meta-reducers | ✅ `withPersist()` |

---

## 📖 Documentation

**[becher.github.io/ngStato](https://becher.github.io/ngStato/)**

[Start in 5 min](https://becher.github.io/ngStato/guide/start-in-5-min) · [Angular guide](https://becher.github.io/ngStato/guide/angular) · [Testing](https://becher.github.io/ngStato/guide/testing) · [CRUD recipe](https://becher.github.io/ngStato/recipes/crud) · [NgRx migration](https://becher.github.io/ngStato/migration/ngrx-to-ngstato) · [API](https://becher.github.io/ngStato/api/core)

## License

MIT
