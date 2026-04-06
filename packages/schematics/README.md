<div align="center">

# @ngstato/schematics

### `ng generate @ngstato/schematics:store users` — done.

**Scaffold stores, features, and tests in seconds.**

[![npm](https://img.shields.io/badge/npm-v0.3.0-blue)](https://www.npmjs.com/package/@ngstato/schematics)
[![Angular CLI](https://img.shields.io/badge/Angular_CLI-17%2B-dd0031)](https://angular.dev)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](#)

</div>

---

## Install

```bash
npm install -D @ngstato/schematics
```

## Generate a store

```bash
ng generate @ngstato/schematics:store users
# or shorthand
ng g @ngstato/schematics:s users
```

Creates:
```
src/app/stores/users/
├── users.store.ts       # Store with CRUD actions, selectors, hooks, DevTools
└── users.store.spec.ts  # Test file with createMockStore
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--name` | (required) | Store name (e.g. `users`, `products`) |
| `--crud` | `true` | Generate CRUD actions (load, create, update, delete) |
| `--entity` | `false` | Use `createEntityAdapter` for normalized collections |
| `--devtools` | `true` | Connect to DevTools with `connectDevTools` |
| `--spec` | `true` | Generate test file |
| `--flat` | `false` | Create file directly in path (no subdirectory) |
| `--path` | `src/app/stores` | Target directory |

### Examples

```bash
# Basic CRUD store
ng g @ngstato/schematics:s products

# Entity-based store with adapter
ng g @ngstato/schematics:s orders --entity

# Flat file, no tests
ng g @ngstato/schematics:s settings --flat --no-spec

# Custom path
ng g @ngstato/schematics:s auth --path src/app/core/auth
```

## Generate a feature

```bash
ng generate @ngstato/schematics:feature loading
# or shorthand
ng g @ngstato/schematics:f pagination
```

Creates a reusable store feature:

```ts
// loading.feature.ts
export function withLoading(): FeatureConfig {
  return {
    state:    { loading: false, error: null },
    actions:  { /* ... */ },
    computed: { /* ... */ }
  }
}

// Usage in any store
const store = createStore({
  items: [],
  ...mergeFeatures(withLoading(), withPagination()),
  actions: { ... }
})
```

## License

MIT
