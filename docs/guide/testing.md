# Testing

## Philosophy

- Test **behavior**, not implementation details
- Assert **state transitions** and **selector outputs**
- Keep tests **isolated** — no HTTP, no timers, no side effects

## Setup

Install the testing package:

```bash
npm install -D @ngstato/testing vitest
```

## `createMockStore()`

The main testing utility. Creates a real store with extra test helpers:

```ts
import { createMockStore } from '@ngstato/testing'

const store = createMockStore({
  users:    [] as User[],
  loading:  false,
  error:    null as string | null,

  computed: {
    total: (state) => state.users.length
  },

  selectors: {
    activeUsers: (state) => state.users.filter(u => u.active)
  },

  actions: {
    async loadUsers(state) {
      state.loading = true
      state.users = await http.get('/users')
      state.loading = false
    },
    addUser(state, user: User) {
      state.users = [...state.users, user]
    }
  }
})
```

## Testing patterns

### Test an action

```ts
import { describe, it, expect } from 'vitest'
import { createMockStore } from '@ngstato/testing'

describe('UserStore', () => {
  it('should add a user', async () => {
    const store = createMockStore({
      users: [] as User[],
      actions: {
        addUser(state, user: User) {
          state.users = [...state.users, user]
        }
      }
    })

    await store.addUser({ id: 1, name: 'Alice', active: true })

    expect(store.users).toHaveLength(1)
    expect(store.users[0].name).toBe('Alice')
  })
})
```

### Test computed and selectors

```ts
it('should compute derived values', async () => {
  const store = createMockStore({
    items: [1, 2, 3, 4, 5],

    computed: {
      total: (state) => state.items.length,
      sum:   (state) => state.items.reduce((a, b) => a + b, 0)
    },

    selectors: {
      evens: (state) => state.items.filter(i => i % 2 === 0)
    },

    actions: {
      addItem(state, item: number) {
        state.items = [...state.items, item]
      }
    }
  })

  expect(store.total).toBe(5)
  expect(store.sum).toBe(15)
  expect(store.evens).toEqual([2, 4])

  await store.addItem(6)

  expect(store.total).toBe(6)
  expect(store.sum).toBe(21)
  expect(store.evens).toEqual([2, 4, 6])
})
```

### Test error handling

```ts
it('should handle action errors', async () => {
  const errors: string[] = []

  const store = createMockStore({
    data: null as any,
    error: null as string | null,

    actions: {
      async loadData(state) {
        throw new Error('Network failed')
      }
    },

    hooks: {
      onError: (err, name) => errors.push(`${name}: ${err.message}`)
    }
  })

  await expect(store.loadData()).rejects.toThrow('Network failed')
  expect(errors).toEqual(['loadData: Network failed'])
})
```

### Use `__setState()` for setup

Skip actions when you just want to set up test conditions:

```ts
it('should filter active users from pre-set state', () => {
  const store = createMockStore({
    users: [] as User[],
    selectors: {
      activeUsers: (state) => state.users.filter(u => u.active)
    },
    actions: {}
  })

  // Set state directly — no action needed
  store.__setState({
    users: [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob',   active: false },
      { id: 3, name: 'Carol', active: true },
    ]
  })

  expect(store.activeUsers).toHaveLength(2)
  expect(store.activeUsers.map(u => u.name)).toEqual(['Alice', 'Carol'])
})
```

### Override initial state

```ts
it('should start with custom initial state', () => {
  const store = createMockStore(
    {
      count: 0,
      computed: { doubled: (s) => s.count * 2 },
      actions: {}
    },
    { initialState: { count: 100 } }
  )

  expect(store.count).toBe(100)
  expect(store.doubled).toBe(200)
})
```

### Mock actions

Replace real actions with spies to test components in isolation:

```ts
import { vi } from 'vitest'

it('should use mocked action', async () => {
  const mockLoad = vi.fn()

  const store = createMockStore(
    {
      users: [] as any[],
      loading: false,
      actions: {
        async loadUsers(state) {
          state.users = await http.get('/users')  // real HTTP
        }
      }
    },
    { actions: { loadUsers: mockLoad } }
  )

  await store.loadUsers()
  expect(mockLoad).toHaveBeenCalledTimes(1)
  // No HTTP call was made
})
```

### Test concurrency helpers

```ts
import { exclusive } from '@ngstato/core'

it('should ignore concurrent calls with exclusive', async () => {
  let callCount = 0

  const store = createMockStore({
    result: null as string | null,
    actions: {
      process: exclusive(async (state) => {
        callCount++
        await new Promise(r => setTimeout(r, 50))
        state.result = 'done'
      })
    }
  })

  // Fire two calls concurrently
  const p1 = store.process()
  const p2 = store.process()   // should be ignored
  await Promise.all([p1, p2])

  expect(callCount).toBe(1)
  expect(store.result).toBe('done')
})
```

### Test subscribe notifications

```ts
it('should notify on state changes', async () => {
  const store = createMockStore({
    count: 0,
    actions: { inc(state) { state.count++ } }
  })

  const snapshots: number[] = []
  store.subscribe(state => snapshots.push(state.count))

  await store.inc()
  await store.inc()
  await store.inc()

  expect(snapshots).toEqual([1, 2, 3])
})
```

## Tips

::: tip Don't test the framework
Don't test that `createStore` works — it's already tested with 136+ tests. Test **your business logic**: state transitions, selectors, error paths.
:::

::: tip One store per test
Create a fresh store in each `it()` block to avoid shared state between tests.
:::

::: tip Mock HTTP calls
If your actions use `http.get()`, either mock the action entirely or use a mocking library (like `msw` or `vi.mock`) to stub the HTTP layer.
:::

## API Reference

See the complete [Testing API Reference](/api/testing) for all types and methods.
