import { Component, OnInit }             from '@angular/core'
import { CommonModule }                  from '@angular/common'
import { FormsModule }                   from '@angular/forms'
import { Injectable, OnDestroy }         from '@angular/core'
import { createStore, optimistic, connectDevTools } from '@ngstato/core'
import { injectStore, StatoDevToolsComponent }      from '@ngstato/angular'


// ─── COMPOSANT ────────────────────────────────────────

@Component({
  selector:    'app-root',
  standalone:  true,
  imports:     [CommonModule, FormsModule, StatoDevToolsComponent],
  templateUrl: './app.component.html',
  styleUrl:    './app.component.css'
})
export class AppComponent implements OnInit {
  store   = injectStore(TodoStore)
  newTodo = ''

  async ngOnInit() {
    await this.store.loadTodos()
  }

  async onAdd() {
    const text = this.newTodo.trim()
    if (!text) return
    await this.store.addTodo(text)
    this.newTodo = ''
  }
}

// ─── INTERFACE ────────────────────────────────────────

interface Todo {
  id:   number
  text: string
  done: boolean
}

// ─── STORE ────────────────────────────────────────────

function createTodoStore() {
  const store = createStore({
    todos:   [] as Todo[],
    loading: false,

    computed: {
      total:     (s: any) => s.todos.length,
      remaining: (s: any) => s.todos.filter((t: Todo) => !t.done).length,
      completed: (s: any) => s.todos.filter((t: Todo) => t.done).length,
    },

    actions: {
      async loadTodos(state: any) {
        state.loading = true
        await new Promise(r => setTimeout(r, 500))
        state.todos = [
          { id: 1, text: 'Apprendre ngStato', done: true  },
          { id: 2, text: 'Remplacer NgRx',     done: false },
          { id: 3, text: 'Publier sur npm',    done: false },
        ]
        state.loading = false
      },

      addTodo(state: any, text: string) {
        state.todos = [...state.todos, { id: Date.now(), text, done: false }]
      },

      toggleTodo(state: any, id: number) {
        state.todos = state.todos.map((t: Todo) =>
          t.id === id ? { ...t, done: !t.done } : t
        )
      },

      deleteTodo: optimistic(
        (state: any, id: number) => {
          state.todos = state.todos.filter((t: Todo) => t.id !== id)
        },
        async (_: any, id: number) => {
          await new Promise(r => setTimeout(r, 300))
        }
      )
    },

    hooks: {
      onActionDone: (name: string, ms: number) => {
        console.log(`[TodoStore] ${name} — ${ms}ms`)
      }
    }
  })

  connectDevTools(store, 'TodoStore')
  return store
}

// ─── SERVICE ──────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TodoStore implements OnDestroy {
  private _store = createTodoStore()

  get todos()     { return this._store.todos     }
  get loading()   { return this._store.loading   }
  get total()     { return this._store.total     }
  get remaining() { return this._store.remaining }
  get completed() { return this._store.completed }

  loadTodos  = (...a: any[]) => this._store.loadTodos(...a)
  addTodo    = (...a: any[]) => this._store.addTodo(...a)
  toggleTodo = (...a: any[]) => this._store.toggleTodo(...a)
  deleteTodo = (...a: any[]) => this._store.deleteTodo(...a)

  ngOnDestroy() { this._store.__store__.destroy(this._store) }
}

