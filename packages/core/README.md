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

  computed: {
    total: (state) => state.users.length
  }
})

await store.loadUsers()
console.log(store.users)   // User[]
console.log(store.total)   // number
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

## Documentation

Voir [github.com/becher/ngstato](https://github.com/becher/ngstato)