# Start in 5 min

This page is for first-time users who want a working mental model in minutes.

## 1) Install

```bash
npm install @ngstato/core @ngstato/angular
```

## 2) Create a store

```ts
import { createStore } from '@ngstato/core'

export const counterStore = createStore({
  count: 0,
  loading: false,
  actions: {
    inc(state) {
      state.count++
    },
    async loadValue(state) {
      state.loading = true
      const next = await Promise.resolve(42)
      state.count = next
      state.loading = false
    }
  },
  selectors: {
    doubled: (state) => state.count * 2
  }
})
```

## 3) Use it

```ts
await counterStore.inc()
await counterStore.loadValue()
console.log(counterStore.count)
console.log(counterStore.doubled)
```

## 4) Scale pattern

- Add `withEntities()` for lists and CRUD.
- Add helpers like `exclusive()` and `queued()` for async control.
- Use streams only for external event sources.

## 5) Next pages

- [CRUD recipe](/recipes/crud)
- [NgRx migration](/migration/ngrx-to-ngstato)
- [Core API](/api/core)

## Playground

- [Open StackBlitz demo](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

