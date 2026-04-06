# Optimistic Update

## Goal

Update the UI **immediately** on user action, then confirm with the server. If the server call fails, **rollback** automatically.

## Using `optimistic()`

The `optimistic()` helper handles this pattern with two functions:

1. **apply** — sync function that mutates state immediately
2. **confirm** — async function that calls the server

If `confirm` throws, the state is automatically restored to its pre-apply snapshot using `structuredClone`.

```ts
import { createStore, http, optimistic } from '@ngstato/core'

export const taskStore = createStore({
  tasks: [] as Task[],
  error: null as string | null,

  actions: {
    // Delete — instant removal, rollback if server fails
    deleteTask: optimistic(
      (state, id: number) => {
        state.tasks = state.tasks.filter(t => t.id !== id)
      },
      async (state, id: number) => {
        await http.delete(`/tasks/${id}`)
      }
    ),

    // Toggle complete — instant flip, rollback if server fails
    toggleComplete: optimistic(
      (state, id: number) => {
        state.tasks = state.tasks.map(t =>
          t.id === id ? { ...t, done: !t.done } : t
        )
      },
      async (state, id: number) => {
        const task = state.tasks.find(t => t.id === id)
        await http.patch(`/tasks/${id}`, { done: task?.done })
      }
    ),

    // Reorder — instant reorder, rollback if server fails
    moveTask: optimistic(
      (state, fromIndex: number, toIndex: number) => {
        const tasks = [...state.tasks]
        const [moved] = tasks.splice(fromIndex, 1)
        tasks.splice(toIndex, 0, moved)
        state.tasks = tasks
      },
      async (state, fromIndex: number, toIndex: number) => {
        await http.put('/tasks/reorder', {
          ids: state.tasks.map(t => t.id)
        })
      }
    )
  },

  hooks: {
    onError: (err, name) => {
      console.warn(`[TaskStore] ${name} rolled back:`, err.message)
    }
  }
})
```

## How rollback works

```
User clicks "Delete"
  │
  ├── 1. structuredClone(state) → deep snapshot saved
  ├── 2. apply(state, id) → task removed from UI instantly
  ├── 3. confirm(state, id) → http.delete('/tasks/123')
  │
  ├── Success? → done, snapshot discarded
  └── Failure? → Object.assign(state, snapshot) → state restored
                  → onError hook fires
```

::: tip Deep copy
`optimistic()` uses `structuredClone` for the snapshot, which handles nested objects and arrays correctly. Regular spread (`{ ...state }`) would only copy the first level.
:::

## With entity adapter

```ts
const adapter = createEntityAdapter<Task>({ selectId: (t) => t.id })

actions: {
  deleteTask: optimistic(
    (state, id: number) => {
      adapter.removeOne(state, id)
    },
    async (state, id: number) => {
      await http.delete(`/tasks/${id}`)
    }
  )
}
```

## Error feedback

Show a temporary "undo" message when rollback happens:

```ts
@Component({
  template: `
    @if (store.error()) {
      <div class="rollback-toast">
        Action failed — changes reverted.
        <button (click)="store.clearError()">Dismiss</button>
      </div>
    }
  `
})
```

## When to use optimistic updates

| Scenario | Recommended? |
|----------|-------------|
| Delete item from list | ✅ Yes — instant feedback |
| Toggle boolean (like/done) | ✅ Yes — instant toggle |
| Drag-and-drop reorder | ✅ Yes — smooth UX |
| Create new item | ⚠️ Maybe — need server-generated ID |
| Complex multi-field edit | ❌ No — wait for server response |
| Financial transactions | ❌ No — must confirm first |
