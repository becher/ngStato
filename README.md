# ngStato

> Stato est une librairie de gestion d'état Angular moderne pour remplacer NgRx complètement, avec une API plus simple, Signals-first, sans RxJS obligatoire.

![version](https://img.shields.io/badge/version-0.2.0-blue)
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
import { createStore, http, optimistic, retryable, connectDevTools } from '@ngstato/core'
import { StatoStore, injectStore } from '@ngstato/angular'

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

// Injection auto + API classe sans boilerplate
export const UserStore = StatoStore(() => {
  return createUserStore()
})

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
| `exclusive()` | Ignore les nouveaux appels pendant qu'une exécution est en cours | exhaustMap |
| `retryable()` | Retry avec backoff fixe ou exponentiel | retryWhen |
| `queued()` | Met en file et exécute les appels dans l'ordre d'arrivée | concatMap |
| `fromStream()` | Écoute Observable/WebSocket/Firebase/Supabase | rxMethod + Effect |
| `optimistic()` | Update immédiat + rollback automatique si échec | Manuel en NgRx |
| `withPersist()` | Persistance state (localStorage/sessionStorage) + migration | Meta-reducers custom |

```ts
import { abortable, debounced, throttled, exclusive, retryable, queued, fromStream, optimistic } from '@ngstato/core'

actions: {
  // Annulation auto — comme switchMap
  search: abortable(async (state, q: string, { signal }) => {
    state.results = await fetch(`/api/search?q=${q}`, { signal }).then(r => r.json())
  }),

  // exclusive — ignore les nouveaux appels pendant la requête en cours
  searchExclusive: exclusive(async (state, q: string) => {
    state.results   = await fetch(`/api/search?q=${q}`).then(r => r.json())
  }),

  // queued — met en file et exécute dans l'ordre d'arrivée
  searchQueued: queued(async (state, q: string) => {
    state.results   = await fetch(`/api/search?q=${q}`).then(r => r.json())
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

## Nouveautés v0.2

- `selectors` memoïzés avec recalcul ciblé
- `effects` réactifs explicites avec cleanup
- `withPersist()` pour hydrate/persist avec versioning

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

<a href="https://stackblitz.com/github/becher/ngstato-demo" target="_blank" rel="noopener">
  <img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz">
</a>

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

### v0.2 — Selectors / Effects / Persist ✅
- `selectors` memoïzés
- `effects` réactifs avec cleanup
- `withPersist()` — localStorage / sessionStorage + migration

### v0.3 — Helpers avancés
- `exclusive()` — = exhaustMap NgRx
- `queued()` — = concatMap NgRx
- `on()` — réactions inter-stores
- `forkJoin()` / `race()` — patterns async (Promise-first)
- `distinctUntilChanged()` — éviter les exécutions inutiles
- `combineLatest()` / `combineLatestStream()` — state deps + streams externes (RxJS optionnel)
- Unification `init()` multi-framework (core/Angular/React/Vue)
- Testing utilities
- DevTools time-travel

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
