# ngStato

> Stato est une librairie de gestion d'état Angular moderne pour remplacer NgRx complètement, avec une API plus simple, Signals-first, sans RxJS obligatoire.

![version](https://img.shields.io/badge/version-0.1.0-blue)
![tests](https://img.shields.io/badge/tests-144%20%E2%9C%85-green)
![bundle](https://img.shields.io/badge/bundle-~3KB-yellow)
![angular](https://img.shields.io/badge/Angular-17%2B-red)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## La même action. Deux approches.

| ❌ NgRx v20 (officiel, MIT) | ✅ ngStato |
|---|---|
| `loadStudents: rxMethod<void>(` | `async loadStudents(state) {` |
| `  pipe(` | `  state.isLoading = true` |
| `    tap(() => patchState(store, { isLoading: true })),` | `  state.students = await service.getAll()` |
| `    switchMap(() =>` | `  state.isLoading = false` |
| `      from(service.getAll()).pipe(` | `}` |
| `        tapResponse({` | |
| `          next: (s) => patchState(store, { students: s, isLoading: false }),` | **1 concept : async/await** |
| `          error: (e) => patchState(store, { error: e.message, isLoading: false })` | **5 lignes** |
| `        })` | |
| `      )` | |
| `    )` | |
| `  )` | |
| `)` | |
| **9 concepts RxJS/NgRx — 14 lignes** | |

---

## Pourquoi switcher vers ngStato ?

**1 concept au lieu de 9 pour écrire une action async**
NgRx nécessite rxMethod, pipe, tap, switchMap, from, tapResponse, patchState... ngStato nécessite uniquement async/await — natif JavaScript.

**2x moins de code pour le même résultat**
Sur un store CRUD complet (5 actions), NgRx v20 nécessite ~90 lignes. ngStato nécessite ~45 lignes.

**DevTools sans extension browser**
NgRx DevTools nécessite l'extension Chrome Redux DevTools. ngStato intègre ses DevTools directement dans l'app — fonctionnels sur tous les browsers et mobile.

**Protection production automatique**
ngStato utilise `isDevMode()` d'Angular — les DevTools sont physiquement impossibles à activer en prod.

**38x plus léger — ~3 KB vs ~50 KB gzip**

---

## Installation

```bash
npm install @ngstato/core @ngstato/angular
```

```ts
// app.config.ts
import { provideStato } from '@ngstato/angular'
import { isDevMode }    from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideStato({
      http:     { baseUrl: 'https://api.monapp.com', timeout: 8000 },
      devtools: isDevMode()
    })
  ]
}
```

---

## Créer un store

```ts
// user.store.ts
import { Injectable, OnDestroy, inject } from '@angular/core'
import { createStore, http, optimistic, retryable, connectDevTools } from '@ngstato/core'
import { injectStore } from '@ngstato/angular'

function createUserStore() {
  const store = createStore({

    // State
    users:     [] as User[],
    isLoading: false,
    error:     null as string | null,

    // Computed — recalculés automatiquement
    computed: {
      total:  (state) => state.users.length,
      admins: (state) => state.users.filter(u => u.role === 'admin')
    },

    // Actions
    actions: {

      // Chargement avec retry automatique
      loadUsers: retryable(
        async (state) => {
          state.isLoading = true
          state.users     = await http.get('/users')
          state.isLoading = false
        },
        { attempts: 3, backoff: 'exponential', delay: 1000 }
      ),

      // Suppression avec rollback automatique
      deleteUser: optimistic(
        (state, id: string) => {
          state.users = state.users.filter(u => u.id !== id)
        },
        async (_, id: string) => {
          await http.delete(`/users/${id}`)
        }
      ),

      // Action simple
      async addUser(state, user: UserCreate) {
        const created  = await http.post('/users', user)
        state.users    = [...state.users, created]
      }
    },

    // Hooks lifecycle
    hooks: {
      onError: (err, name) => console.error(`[UserStore] ${name}:`, err.message)
    }
  })

  connectDevTools(store, 'UserStore')  // ← une seule ligne
  return store
}

@Injectable({ providedIn: 'root' })
export class UserStore implements OnDestroy {
  private _store = createUserStore()

  get users()     { return this._store.users     }
  get isLoading() { return this._store.isLoading }
  get total()     { return this._store.total     }

  loadUsers  = (...a: any[]) => this._store.loadUsers(...a)
  deleteUser = (...a: any[]) => this._store.deleteUser(...a)
  addUser    = (...a: any[]) => this._store.addUser(...a)

  ngOnDestroy() { this._store.__store__.destroy(this._store) }
}

// Dans un composant
@Component({ ... })
export class UserListComponent {
  store = injectStore(UserStore)  // ou inject(UserStore)
}
```

---

## Helpers

| Helper | Description | Équivalent NgRx |
|--------|-------------|-----------------|
| `abortable()` | Annule la requête précédente automatiquement | switchMap |
| `debounced()` | Debounce sans RxJS — défaut 300ms | debounceTime |
| `throttled()` | Throttle sans RxJS | throttleTime |
| `retryable()` | Retry avec backoff fixe ou exponentiel | retryWhen |
| `fromStream()` | Écoute Observable/WebSocket/Firebase/Supabase | rxMethod + Effect |
| `optimistic()` | Update immédiat + rollback automatique si échec | Manuel en NgRx |

```ts
import { abortable, debounced, throttled, retryable, fromStream, optimistic } from '@ngstato/core'

actions: {
  // Annulation auto — comme switchMap
  search: abortable(async (state, q: string, { signal }) => {
    state.results = await fetch(`/api/search?q=${q}`, { signal }).then(r => r.json())
  }),

  // Debounce 300ms
  filter: debounced((state, q: string) => { state.query = q }, 300),

  // Retry x3 avec backoff exponentiel
  load: retryable(async (state) => {
    state.data = await http.get('/data')
  }, { attempts: 3, backoff: 'exponential' }),

  // Realtime WebSocket
  listen: fromStream(
    () => webSocket('wss://api.monapp.com/ws'),
    (state, msg) => { state.messages = [...state.messages, msg] }
  ),

  // Optimistic + rollback auto
  delete: optimistic(
    (state, id) => { state.items = state.items.filter(i => i.id !== id) },
    async (_, id) => { await http.delete(`/items/${id}`) }
  )
}
```

---

## Client HTTP

```ts
import { http } from '@ngstato/core'

// Configurer via provideStato() — une seule fois
provideStato({
  http: {
    baseUrl: 'https://api.monapp.com',
    timeout: 8000,
    headers: { 'X-App-Version': '1.0' },
    auth:    () => localStorage.getItem('token')
  }
})

// Utiliser partout dans les actions
await http.get('/users')
await http.get('/users', { params: { page: 1, limit: 10 } })
await http.post('/users', { name: 'Alice' })
await http.put('/users/1', { name: 'Bob' })
await http.patch('/users/1', { active: false })
await http.delete('/users/1')
```

---

## DevTools

Panel intégré dans l'app — sans extension browser, sans installation supplémentaire.

- Panel déplaçable à la souris
- Redimensionnable — coin bas-droite
- Minimisable — bouton ▼/▲
- Historique des actions avec durées et timestamps
- Diff Avant/Après pour chaque action
- Onglet State — state actuel complet
- **Désactivé automatiquement en production via `isDevMode()`**

```ts
// app.config.ts
provideStato({ devtools: isDevMode() })

// app.component.ts
import { StatoDevToolsComponent } from '@ngstato/angular'

@Component({
  imports:  [RouterOutlet, StatoDevToolsComponent],
  template: `<router-outlet /><stato-devtools />`
})
export class AppComponent {}

// mon-store.ts
connectDevTools(store, 'MonStore')  // une seule ligne
```

| | NgRx DevTools | ngStato DevTools |
|---|---|---|
| Installation | Extension Chrome | Zéro installation |
| Browser support | Chrome/Firefox | Tous browsers |
| Mobile | ❌ | ✅ |
| Désactivé en prod | Manuel | `isDevMode()` auto |
| State visible en prod | Oui si oubli | Jamais |

---

## Guide de migration NgRx → ngStato

La migration est progressive — store par store.

```ts
// withState → state initial
// NgRx
withState({ users: [] as User[], isLoading: false })
// ngStato
users: [] as User[], isLoading: false,

// withMethods + rxMethod → actions
// NgRx
withMethods((store) => ({
  load: rxMethod<void>(pipe(
    tap(() => patchState(store, { isLoading: true })),
    switchMap(() => from(service.get()).pipe(
      tapResponse({
        next:  (d) => patchState(store, { data: d, isLoading: false }),
        error: (e) => patchState(store, { error: e.message })
      })
    ))
  ))
}))
// ngStato
actions: {
  async load(state) {
    state.isLoading = true
    state.data      = await service.get()
    state.isLoading = false
  }
}

// withComputed → computed
// NgRx
withComputed((store) => ({
  total: computed(() => store.users().length)
}))
// ngStato
computed: {
  total: (state) => state.users.length
}
```

---

## Comparaison NgRx SignalStore v20 vs ngStato

| Feature | NgRx SignalStore v20 | ngStato v0.1 |
|---------|---------------------|--------------|
| withState | ✅ | ✅ |
| withMethods / actions | ✅ rxMethod requis | ✅ async/await |
| withComputed | ✅ | ✅ |
| patchState | ✅ obligatoire | ✅ state.x = y |
| provideStore | ✅ | ✅ provideStato() |
| inject() | ✅ | ✅ injectStore() |
| onInit / onDestroy | ✅ | ✅ |
| DevTools | ✅ extension Chrome | ✅ panel intégré |
| DevTools mobile | ❌ | ✅ |
| Protection prod | ⚠️ logOnly manuel | ✅ isDevMode() auto |
| RxJS requis | ✅ obligatoire | ❌ optionnel |
| Bundle size | ~50 KB gzip | ~3 KB gzip |
| withProps | ✅ | 🔜 v0.2 |
| withEntities | ✅ | 🔜 v1.0 |
| signalStoreFeature() | ✅ | 🔜 v0.4 |
| Schematics CLI | ✅ | 🔜 v1.0 |
| ESLint plugin | ✅ | 🔜 v1.0 |

---

## Demo live

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/becher/ngstato/tree/main/apps/stackblitz-demo)

---

## Roadmap

### v0.1 ✅ TERMINÉ
- `createStore()` — state, actions, computed, hooks
- `StatoHttp` — GET POST PUT PATCH DELETE avec auth, timeout, params
- `abortable()`, `debounced()`, `throttled()`, `retryable()`, `fromStream()`, `optimistic()`
- `@ngstato/angular` — Signals natifs, `provideStato()`, `injectStore()`
- DevTools — panel déplaçable, redimensionnable, minimisable
- `connectDevTools()` — connexion automatique store → DevTools
- Protection prod automatique via `isDevMode()`
- **144 tests — 100% passing**

### v0.2 — Helpers avancés
- `exclusive()` — = exhaustMap NgRx
- `queued()` — = concatMap NgRx
- `store.on()` — réactions inter-stores
- Testing utilities
- DevTools time-travel

### v0.3 — Persistance
- `withPersist()` — localStorage / sessionStorage / IndexedDB
- `withHistory()` — undo/redo
- SSR ready

### v1.0 — Production ready
- `withEntities()`, Schematics CLI, ESLint plugin
- Documentation VitePress complète
- Benchmarks comparatifs

---

## Contribuer

```bash
git clone https://github.com/becher/ngstato
cd ngstato
pnpm install   # Node >= 18, pnpm >= 8
pnpm build
pnpm test      # 144 tests
```

Convention commits : `feat` / `fix` / `docs` / `test` / `refactor` / `chore`

---

## License

MIT — Copyright (c) 2025 ngStato
