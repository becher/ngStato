# Testing API

`@ngstato/testing` provides utilities for unit testing ngStato stores.

## Installation

```bash
npm install -D @ngstato/testing
```

## `createMockStore(config, options?)`

Creates a real store instance with additional test helpers.

### Signature

```ts
function createMockStore<S extends object>(
  config: S & StatoStoreConfig<S>,
  options?: MockStoreOptions<S>
): MockStore<S>
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `config` | `StatoStoreConfig<S>` | Same config as `createStore()` |
| `options` | `MockStoreOptions<S>` | Override initial state or mock actions |

### `MockStoreOptions<S>`

```ts
interface MockStoreOptions<S extends object> {
  /** Override the initial state */
  initialState?: Partial<S>
  /** Replace actions with mocks */
  actions?: Partial<Record<string, (...args: any[]) => any>>
}
```

### `MockStore<S>`

The returned mock store has all the properties of a regular store, plus:

| Method | Type | Description |
|--------|------|-------------|
| `__setState(partial)` | `(Partial<S>) => void` | Directly set state (bypasses actions) |
| `__dispatch(name, ...args)` | `(string, ...any[]) => Promise<void>` | Dispatch action by name |
| `getState()` | `() => S` | Get full state snapshot |
| `subscribe(fn)` | `(fn) => () => void` | Subscribe to state changes |
| `__store__` | internal | Access to internal store |

---

## Examples

### Basic store testing

```ts
import { describe, it, expect } from 'vitest'
import { createMockStore } from '@ngstato/testing'

const config = {
  count: 0,
  actions: {
    increment(state) { state.count++ },
    add(state, amount: number) { state.count += amount }
  },
  computed: {
    doubled: (state) => state.count * 2
  }
}

describe('CounterStore', () => {
  it('should increment', async () => {
    const store = createMockStore(config)
    expect(store.count).toBe(0)

    await store.increment()
    expect(store.count).toBe(1)
    expect(store.doubled).toBe(2)
  })

  it('should add amount', async () => {
    const store = createMockStore(config)
    await store.add(5)
    expect(store.count).toBe(5)
  })
})
```

### Override initial state

```ts
it('should start with custom state', () => {
  const store = createMockStore(config, {
    initialState: { count: 42 }
  })
  expect(store.count).toBe(42)
  expect(store.doubled).toBe(84)
})
```

### Use `__setState()` for direct state manipulation

```ts
it('should update state directly', () => {
  const store = createMockStore(config)

  store.__setState({ count: 100 })
  expect(store.count).toBe(100)
  expect(store.doubled).toBe(200)
})
```

### Use `__dispatch()` for string-based dispatch

```ts
it('should dispatch by name', async () => {
  const store = createMockStore(config)
  await store.__dispatch('add', 10)
  expect(store.count).toBe(10)
})
```

### Mock specific actions

```ts
import { vi } from 'vitest'

it('should use mocked actions', async () => {
  const mockLoad = vi.fn()
  const store = createMockStore(
    {
      users: [] as any[],
      loading: false,
      actions: {
        async loadUsers(state) {
          state.loading = true
          // real implementation that hits HTTP
        }
      }
    },
    {
      actions: { loadUsers: mockLoad }
    }
  )

  await store.loadUsers()
  expect(mockLoad).toHaveBeenCalled()
})
```

### Subscribe to state changes

```ts
it('should notify subscribers', async () => {
  const store = createMockStore(config)
  const states: number[] = []

  store.subscribe((state) => {
    states.push(state.count)
  })

  await store.increment()
  await store.increment()

  expect(states).toContain(1)
  expect(states).toContain(2)
})
```

### Test hooks

```ts
it('should call onError hook', async () => {
  const errors: string[] = []

  const store = createMockStore({
    data: null as any,
    actions: {
      async failingAction(state) {
        throw new Error('Network error')
      }
    },
    hooks: {
      onError: (err, name) => errors.push(`${name}: ${err.message}`)
    }
  })

  await expect(store.failingAction()).rejects.toThrow('Network error')
  expect(errors).toEqual(['failingAction: Network error'])
})
```

### Test with selectors

```ts
it('should test memoized selectors', async () => {
  const store = createMockStore({
    items: [1, 2, 3, 4, 5],
    selectors: {
      evenItems: (state) => state.items.filter(i => i % 2 === 0),
      total:     (state) => state.items.length
    },
    actions: {
      addItem(state, item: number) {
        state.items = [...state.items, item]
      }
    }
  })

  expect(store.evenItems).toEqual([2, 4])
  expect(store.total).toBe(5)

  await store.addItem(6)
  expect(store.evenItems).toEqual([2, 4, 6])
  expect(store.total).toBe(6)
})
```
