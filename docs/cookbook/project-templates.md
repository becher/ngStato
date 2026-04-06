# Project Templates

Use these folder structures and starter code as copy-paste starting points for new features.

## Template A: CRUD Feature

For data-heavy features with list/detail/create/update/delete:

```
src/features/students/
  ├── students.store.ts          # Store with entity adapter
  ├── students.api.ts            # API service (optional)
  ├── students-list.component.ts # List view
  ├── student-detail.component.ts# Detail view
  └── __tests__/
      └── students.store.test.ts # Store tests
```

**Starter store:**

```ts
// students.store.ts
import { createStore, createEntityAdapter, http, retryable, optimistic } from '@ngstato/core'
import { StatoStore, injectStore, connectDevTools } from '@ngstato/angular'

type Student = { id: number; name: string; level: string }

const adapter = createEntityAdapter<Student>({ selectId: (s) => s.id })

function createStudentsStore() {
  const store = createStore({
    ...adapter.getInitialState(),
    loading: false,
    error: null as string | null,
    selectedId: null as number | null,

    selectors: {
      all:      (s) => adapter.selectAll(s),
      total:    (s) => adapter.selectTotal(s),
      selected: (s) => s.selectedId ? adapter.selectById(s, s.selectedId) : null
    },

    actions: {
      loadAll: retryable(async (state) => {
        state.loading = true
        state.error = null
        try {
          adapter.setAll(state, await http.get('/students'))
        } catch (e) { state.error = (e as Error).message; throw e }
        finally { state.loading = false }
      }, { attempts: 3, backoff: 'exponential', delay: 1000 }),

      async create(state, data: Omit<Student, 'id'>) {
        adapter.addOne(state, await http.post('/students', data))
      },

      async update(state, id: number, changes: Partial<Student>) {
        adapter.updateOne(state, { id, changes: await http.patch(`/students/${id}`, changes) })
      },

      delete: optimistic(
        (state, id: number) => adapter.removeOne(state, id),
        async (_, id) => { await http.delete(`/students/${id}`) }
      ),

      select(state, id: number | null) { state.selectedId = id }
    },

    hooks: {
      onInit: (s) => s.loadAll(),
      onError: (e, n) => console.error(`[Students] ${n}:`, e.message)
    }
  })

  connectDevTools(store, 'StudentsStore')
  return store
}

export const StudentsStore = StatoStore(() => createStudentsStore())
```

---

## Template B: Real-time Feature (WebSocket)

For push-based data sources:

```
src/features/notifications/
  ├── notifications.store.ts     # Store with fromStream
  ├── notifications.component.ts # UI
  └── __tests__/
      └── notifications.store.test.ts
```

**Starter store:**

```ts
import { createStore, fromStream, pipeStream, mapStream, filterStream } from '@ngstato/core'

export const notificationsStore = createStore({
  items:     [] as Notification[],
  connected: false,

  computed: {
    count: (s) => s.items.length
  },

  actions: {
    listen: fromStream(
      () => pipeStream(
        new WebSocket('wss://api.example.com/notifications'),
        mapStream((e: MessageEvent) => JSON.parse(e.data)),
        filterStream((n: any) => n.priority !== 'low')
      ),
      (state, notification) => {
        state.items = [notification, ...state.items].slice(0, 50)
      }
    ),

    dismiss(state, id: string) {
      state.items = state.items.filter(n => n.id !== id)
    },

    clearAll(state) { state.items = [] }
  },

  hooks: {
    onInit: (s) => s.listen()
  }
})
```

---

## Template C: Auth / Session

For login, logout, token refresh, and session persistence:

```
src/features/auth/
  ├── auth.store.ts     # Store with withPersist
  ├── auth.guard.ts     # Route guard
  └── __tests__/
      └── auth.store.test.ts
```

**Starter store:**

```ts
import { createStore, http, withPersist, exclusive } from '@ngstato/core'

export const authStore = createStore(
  withPersist({
    user:  null as { id: string; name: string } | null,
    token: null as string | null,
    loading: false,
    error: null as string | null,

    computed: {
      isAuthenticated: (s) => s.token !== null
    },

    actions: {
      login: exclusive(async (state, email: string, password: string) => {
        state.loading = true
        state.error = null
        try {
          const res = await http.post('/auth/login', { email, password })
          state.user  = res.user
          state.token = res.token
        } catch (e) { state.error = (e as Error).message }
        finally { state.loading = false }
      }),

      logout(state) {
        state.user = null
        state.token = null
      }
    }
  }, {
    key: 'auth',
    pick: ['user', 'token'],
    version: 1
  })
)
```

---

## Template D: Settings / Preferences

For user preferences with persistence:

```
src/features/settings/
  ├── settings.store.ts
  └── __tests__/
      └── settings.store.test.ts
```

```ts
import { createStore, withPersist } from '@ngstato/core'

export const settingsStore = createStore(
  withPersist({
    theme:      'system' as 'light' | 'dark' | 'system',
    language:   'en' as string,
    fontSize:   14,
    sidebarOpen: true,

    actions: {
      setTheme(state, theme: 'light' | 'dark' | 'system') { state.theme = theme },
      setLanguage(state, lang: string) { state.language = lang },
      setFontSize(state, size: number) { state.fontSize = Math.max(10, Math.min(24, size)) },
      toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen }
    }
  }, {
    key: 'app-settings',
    version: 1
  })
)
```

## Rules of thumb

- **One store per feature domain** — don't build a monolith store
- **Keep API calls in actions** — not in components or services
- **Keep tests next to the store** — `__tests__/store.test.ts`
- **Use `connectDevTools`** in development — helps debug complex flows
- **Start simple** — add entities, persistence, streams only when needed
