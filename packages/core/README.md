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

## Helpers

| Helper | Description |
|--------|-------------|
| `abortable()` | Annule la requête précédente si l'action est rappelée |
| `debounced()` | Debounce sans RxJS |
| `throttled()` | Throttle sans RxJS |
| `retryable()` | Retry avec backoff fixe ou exponentiel |
| `fromStream()` | Realtime — WebSocket, Firebase, Supabase |
| `optimistic()` | Optimistic update + rollback automatique |
| `withPersist()` | Persistance localStorage/sessionStorage + migration |

## Nouvautés v0.2

- `selectors` memoïzés (recalcul seulement quand les dépendances changent)
- `effects` réactifs explicites avec cleanup automatique
- `withPersist()` pour hydrater/persister le state

## Documentation

Voir [github.com/becher/ngstato](https://github.com/becher/ngstato)