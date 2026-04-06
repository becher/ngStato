# CRUD Feature Store

A complete recipe for a CRUD feature store with entities, loading states, and error handling.

## Full example

```ts
import { createStore, createEntityAdapter, http, retryable, optimistic } from '@ngstato/core'

// ── Types ──
type Student = { id: number; name: string; level: string; active: boolean }
type CreateStudent = Omit<Student, 'id'>

// ── Entity Adapter ──
const adapter = createEntityAdapter<Student>({
  selectId: (s) => s.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
})

// ── Store ──
export const studentsStore = createStore({
  ...adapter.getInitialState(),
  loading:    false,
  error:      null as string | null,
  selectedId: null as number | null,

  // ── Selectors (memoized) ──
  selectors: {
    allStudents:    (state) => adapter.selectAll(state),
    totalStudents:  (state) => adapter.selectTotal(state),
    selectedStudent: (state) => {
      if (!state.selectedId) return null
      return adapter.selectById(state, state.selectedId) ?? null
    },
    activeStudents: (state) => adapter.selectAll(state).filter(s => s.active)
  },

  // ── Computed ──
  computed: {
    hasError:  (state) => state.error !== null,
    isEmpty:   (state) => adapter.selectTotal(state) === 0
  },

  // ── Actions ──
  actions: {
    // Load all — with retry
    loadAll: retryable(async (state) => {
      state.loading = true
      state.error = null
      try {
        const students = await http.get<Student[]>('/students')
        adapter.setAll(state, students)
      } catch (e) {
        state.error = (e as Error).message
        throw e   // rethrow so retryable can retry
      } finally {
        state.loading = false
      }
    }, { attempts: 3, backoff: 'exponential', delay: 1000 }),

    // Create
    async createStudent(state, data: CreateStudent) {
      state.loading = true
      try {
        const created = await http.post<Student>('/students', data)
        adapter.addOne(state, created)
      } catch (e) {
        state.error = (e as Error).message
      } finally {
        state.loading = false
      }
    },

    // Update
    async updateStudent(state, id: number, changes: Partial<Student>) {
      try {
        const updated = await http.patch<Student>(`/students/${id}`, changes)
        adapter.updateOne(state, { id, changes: updated })
      } catch (e) {
        state.error = (e as Error).message
      }
    },

    // Delete — optimistic with rollback
    deleteStudent: optimistic(
      (state, id: number) => {
        adapter.removeOne(state, id)
        if (state.selectedId === id) state.selectedId = null
      },
      async (state, id: number) => {
        await http.delete(`/students/${id}`)
      }
    ),

    // Selection
    selectStudent(state, id: number | null) {
      state.selectedId = id
    },

    // Clear error
    clearError(state) {
      state.error = null
    }
  },

  // ── Hooks ──
  hooks: {
    onInit:  (store) => store.loadAll(),
    onError: (err, name) => console.error(`[StudentsStore] ${name}:`, err.message)
  }
})
```

## Angular component

```ts
@Component({
  selector: 'app-students',
  template: `
    @if (store.loading()) {
      <div class="loading-bar"></div>
    }

    @if (store.hasError()) {
      <div class="error-banner">
        {{ store.error() }}
        <button (click)="store.clearError()">Dismiss</button>
      </div>
    }

    <header>
      <h1>Students ({{ store.totalStudents() }})</h1>
      <button (click)="openCreateDialog()">+ New Student</button>
    </header>

    @if (store.isEmpty()) {
      <p>No students yet.</p>
    } @else {
      <ul>
        @for (student of store.allStudents(); track student.id) {
          <li [class.selected]="student.id === store.selectedId()"
              (click)="store.selectStudent(student.id)">
            <span>{{ student.name }} — {{ student.level }}</span>
            <button (click)="store.deleteStudent(student.id); $event.stopPropagation()">
              Delete
            </button>
          </li>
        }
      </ul>
    }

    @if (store.selectedStudent()) {
      <aside>
        <h2>{{ store.selectedStudent()!.name }}</h2>
        <p>Level: {{ store.selectedStudent()!.level }}</p>
      </aside>
    }
  `
})
export class StudentsComponent {
  store = injectStore(StudentsStore)
}
```

## Action pattern summary

| Action | HTTP | Adapter | Error handling |
|--------|------|---------|----------------|
| `loadAll` | GET | `setAll` | `retryable()` |
| `createStudent` | POST | `addOne` | try/catch |
| `updateStudent` | PATCH | `updateOne` | try/catch |
| `deleteStudent` | DELETE | `removeOne` | `optimistic()` + auto-rollback |

## Why this works

- **Entities** keep state normalized — no duplicate data
- **Selectors** are memoized — no re-computation on unrelated changes
- **Optimistic delete** gives instant feedback, rollback on failure
- **Retryable load** handles flaky networks automatically
- **Hooks** auto-load on init, log errors consistently
