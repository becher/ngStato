<div align="center">

# @ngstato/testing

### Unit test your stores without HTTP, timers, or side effects.

**`createMockStore()` — real store mechanics, full test control.**

[![npm](https://img.shields.io/badge/npm-v0.3.0-blue)](https://www.npmjs.com/package/@ngstato/testing)
[![gzip](https://img.shields.io/badge/gzip-<%201KB-brightgreen)](#)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](#)

[Documentation](https://becher.github.io/ngStato/guide/testing) · [API Reference](https://becher.github.io/ngStato/api/testing)

</div>

---

## Install

```bash
npm install -D @ngstato/testing
```

## Usage

```ts
import { createMockStore } from '@ngstato/testing'

const store = createMockStore({
  count: 0,
  actions: {
    inc(state)             { state.count++ },
    add(state, n: number)  { state.count += n }
  },
  selectors: {
    doubled: (s) => s.count * 2
  }
})

// Test actions
await store.inc()
expect(store.count).toBe(1)
expect(store.doubled).toBe(2)

// Set state directly — skip actions
store.__setState({ count: 100 })
expect(store.doubled).toBe(200)

// Dispatch by name
await store.__dispatch('add', 5)
expect(store.count).toBe(105)
```

## Mock actions for isolation

```ts
import { vi } from 'vitest'

const store = createMockStore(config, {
  initialState: { users: [{ id: 1 }] },
  actions: { loadUsers: vi.fn() }    // no HTTP call
})

await store.loadUsers()
expect(store.loadUsers).toHaveBeenCalled()
```

## API

| Method | Description |
|:--|:--|
| `createMockStore(config, opts?)` | Create a real store with test helpers |
| `store.__setState(partial)` | Set state directly (bypass actions) |
| `store.__dispatch(name, ...args)` | Dispatch action by string name |
| `store.getState()` | Get full state snapshot |
| `store.subscribe(fn)` | Subscribe to state changes |

## 📖 [Full documentation →](https://becher.github.io/ngStato/guide/testing)

## License

MIT
