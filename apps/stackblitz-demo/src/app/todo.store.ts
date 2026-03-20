import { Injectable, OnDestroy } from '@angular/core'
import { createStore, connectDevTools } from '@ngstato/core'

export type Todo = {
  id: string
  text: string
  done: boolean
}

type TodoCreate = {
  text: string
}

function uid(): string {
  // Simple ID generator for demo purposes.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createTodoCoreStore() {
  const store = createStore({
    // State
    todos: [] as Todo[],
    loading: false,

    // Computed
    computed: {
      total: (state: any) => state.todos.length,
      completed: (state: any) =>
        state.todos.filter((t: Todo) => t.done).length,
      remaining: (state: any) =>
        state.todos.filter((t: Todo) => !t.done).length
    },

    // Actions
    actions: {
      async addTodo(state: any, input: TodoCreate) {
        const text = input.text.trim()
        if (!text) return

        state.loading = true

        // No backend in this demo: update locally.
        state.todos = [
          ...state.todos,
          { id: uid(), text, done: false } satisfies Todo
        ]

        state.loading = false
      },

      toggleTodo(state: any, id: string) {
        state.todos = state.todos.map((t: Todo) =>
          t.id === id ? { ...t, done: !t.done } : t
        )
      },

      deleteTodo(state: any, id: string) {
        state.todos = state.todos.filter((t: Todo) => t.id !== id)
      }
    }
  })

  connectDevTools(store, 'TodoStore')
  return store
}

@Injectable({ providedIn: 'root' })
export class TodoStore implements OnDestroy {
  // Keep the core store instance private and expose signals-like getters.
  private _store = createTodoCoreStore()

  get todos() {
    return this._store.todos as Todo[]
  }
  get loading() {
    return this._store.loading as boolean
  }

  get total() {
    return this._store.total as number
  }
  get completed() {
    return this._store.completed as number
  }
  get remaining() {
    return this._store.remaining as number
  }

  addTodo = (...args: any[]) => this._store.addTodo(...args)
  toggleTodo = (...args: any[]) => this._store.toggleTodo(...args)
  deleteTodo = (...args: any[]) => this._store.deleteTodo(...args)

  ngOnDestroy() {
    this._store.__store__.destroy(this._store)
  }
}

