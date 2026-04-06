# Start in 5 minutes

Build a working store from scratch in under 5 minutes.

## 1. Install

```bash
npm install @ngstato/core @ngstato/angular
```

## 2. Create a store

```ts
import { createStore } from '@ngstato/core'

export const todoStore = createStore({
  // State
  todos:   [] as { id: number; text: string; done: boolean }[],
  filter:  'all' as 'all' | 'done' | 'pending',

  // Computed — recalculated on every access
  computed: {
    total: (state) => state.todos.length,
    doneCount: (state) => state.todos.filter(t => t.done).length
  },

  // Selectors — memoized, only recalculate when dependencies change
  selectors: {
    filtered: (state) => {
      if (state.filter === 'done')    return state.todos.filter(t => t.done)
      if (state.filter === 'pending') return state.todos.filter(t => !t.done)
      return state.todos
    }
  },

  // Actions — sync or async, mutate state directly
  actions: {
    addTodo(state, text: string) {
      state.todos = [...state.todos, { id: Date.now(), text, done: false }]
    },

    toggleTodo(state, id: number) {
      state.todos = state.todos.map(t =>
        t.id === id ? { ...t, done: !t.done } : t
      )
    },

    removeTodo(state, id: number) {
      state.todos = state.todos.filter(t => t.id !== id)
    },

    setFilter(state, filter: 'all' | 'done' | 'pending') {
      state.filter = filter
    }
  }
})
```

## 3. Use it

```ts
// Add todos
await todoStore.addTodo('Learn ngStato')
await todoStore.addTodo('Build an app')

// Read state
console.log(todoStore.todos)       // [{ id: ..., text: 'Learn ngStato', done: false }, ...]
console.log(todoStore.total)       // 2
console.log(todoStore.filtered)    // all todos (filter = 'all')

// Toggle and filter
await todoStore.toggleTodo(todoStore.todos[0].id)
await todoStore.setFilter('done')
console.log(todoStore.filtered)    // [{ ..., text: 'Learn ngStato', done: true }]
```

## 4. Add async

```ts
import { createStore, http } from '@ngstato/core'

const store = createStore({
  users: [] as User[],
  loading: false,
  error: null as string | null,

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
    }
  }
})
```

::: tip Compare with NgRx
The same `loadUsers` in NgRx requires `rxMethod`, `pipe`, `tap`, `switchMap`, `from`, `tapResponse`, and `patchState` — 9 concepts, 14 lines. In ngStato: 1 concept (`async/await`), 8 lines.
:::

## 5. Scale up

When your app grows, add:

| Need | Use |
|------|-----|
| Normalized collections | [`withEntities()`](/guide/entities) |
| Concurrency control | [`exclusive()`](/api/helpers#exclusive), [`queued()`](/api/helpers#queued) |
| Retry on failure | [`retryable()`](/api/helpers#retryable) |
| Optimistic updates | [`optimistic()`](/api/helpers#optimistic) |
| Reusable store features | [`mergeFeatures()`](/api/core#mergefeatures) |
| WebSocket / real-time | [`fromStream()`](/guide/streams) |
| Persistence | [`withPersist()`](/api/helpers#withpersist) |
| Unit testing | [`createMockStore()`](/guide/testing) |

## Next

- [Core Concepts](/guide/core-concepts) — understand every building block
- [CRUD Recipe](/recipes/crud) — full end-to-end feature store
- [NgRx Migration](/migration/ngrx-to-ngstato) — migrate incrementally
