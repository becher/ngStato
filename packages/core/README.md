# @ngstato/core

State management framework-agnostic — Signals-first, sans RxJS obligatoire.

## Installation
```bash
npm install @ngstato/core
```

## Usage
```ts
import { createStore, http } from '@ngstato/core'

const store = createStore({
  users:     [] as User[],
  isLoading: false,

  actions: {
    async loadUsers(state) {
      state.isLoading = true
      state.users     = await http.get('/users')
      state.isLoading = false
    }
  },

  selectors: {
    total: (state) => state.users.length
  },

  effects: [
    [
      (state) => state.users.length,
      (count) => console.log('Total users:', count)
    ]
  ]
})

await store.loadUsers()
console.log(store.users)   // User[]
console.log(store.total)   // number (selector memoïzé)
```

## Réactions inter-stores (`on`)

Écouter la fin d’exécution d’une action précise (success **ou** error) et réagir ailleurs (toast, analytics, déclencher une autre action, etc.).

```ts
import { createStore, on } from '@ngstato/core'

const userStore = createStore({
  users: [] as { id: string; name: string }[],
  actions: {
    async loadUsers(state) {
      state.users = await fetch('/api/users').then(r => r.json())
    }
  }
})

const unsubscribe = on(userStore.loadUsers, (_store, event) => {
  if (event?.status === 'success') {
    console.log(`[users] loaded in ${event.duration}ms`)
  } else {
    console.error('[users] load failed:', event?.error)
  }
})

// Plus tard…
unsubscribe()
```

## Helpers

| Helper | Description |
|--------|-------------|
| `abortable()` | Annule la requête précédente si l'action est rappelée |
| `debounced()` | Debounce sans RxJS |
| `throttled()` | Throttle sans RxJS |
| `exclusive()` | Ignore les nouveaux appels pendant qu'une exécution est en cours |
| `retryable()` | Retry avec backoff fixe ou exponentiel |
| `queued()` | Met en file et exécute les appels dans l'ordre d'arrivée |
| `distinctUntilChanged()` | Ignore les appels si l’entrée ne change pas |
| `forkJoin()` | Lance des tâches en parallèle, attend tout |
| `race()` | Retourne la première tâche terminée |
| `combineLatest()` | Compose plusieurs deps pour `effects` |
| `combineLatestStream()` | Combine plusieurs flux externes (compatible RxJS) |
| `pipeStream()` + operators | Composable streams (`map`, `filter`, `distinctUntilChanged`, `debounce`, `throttle`, `switchMap`, `concatMap`, `exhaustMap`, `mergeMap`, `catchError`, `retry`) |
| `fromStream()` | Realtime — WebSocket, Firebase, Supabase |
| `optimistic()` | Optimistic update + rollback automatique |
| `withPersist()` | Persistance localStorage/sessionStorage + migration |

## Nouvautés v0.2

- `selectors` memoïzés (recalcul seulement quand les dépendances changent)
- `effects` réactifs explicites avec cleanup automatique
- `withPersist()` pour hydrater/persister le state

## Documentation

Voir [github.com/becher/ngstato](https://github.com/becher/ngstato)