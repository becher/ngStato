<div align="center">

# @ngstato/eslint-plugin

### Catch mistakes before they reach production.

**3 rules for ngStato best practices. Zero config with `recommended` preset.**

[![npm](https://img.shields.io/badge/npm-v0.3.0-blue)](https://www.npmjs.com/package/@ngstato/eslint-plugin)
[![ESLint](https://img.shields.io/badge/ESLint-8%2B-4B32C3)](https://eslint.org)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](#)

</div>

---

## Install

```bash
npm install -D @ngstato/eslint-plugin
```

## Setup (flat config)

```js
// eslint.config.js
import ngstato from '@ngstato/eslint-plugin'

export default [
  ngstato.configs.recommended
]
```

## Rules

| Rule | Default | Description |
|------|---------|-------------|
| `ngstato/no-state-mutation-outside-action` | `error` | Prevent direct state mutation outside actions |
| `ngstato/no-async-without-error-handling` | `warn` | Require try/catch in async actions |
| `ngstato/require-devtools` | `warn` | Suggest `connectDevTools()` after `createStore()` |

### `no-state-mutation-outside-action`

```ts
// ❌ Error
this.store.count = 5

// ✅ OK
actions: {
  setCount(state, n: number) { state.count = n }
}
```

### `no-async-without-error-handling`

```ts
// ⚠️ Warning
actions: {
  async loadUsers(state) {
    state.users = await http.get('/users')  // no try/catch
  }
}

// ✅ OK — try/catch
actions: {
  async loadUsers(state) {
    try {
      state.users = await http.get('/users')
    } catch (e) {
      state.error = (e as Error).message
    }
  }
}

// ✅ OK — wrapped in retryable
actions: {
  loadUsers: retryable(async (state) => {
    state.users = await http.get('/users')
  }, { attempts: 3 })
}
```

### `require-devtools`

```ts
// ⚠️ Warning
const store = createStore({ count: 0 })
// missing: connectDevTools(store, 'Counter')

// ✅ OK
const store = createStore({ count: 0 })
connectDevTools(store, 'Counter')
```

## License

MIT
