# Core Concepts

## State-first by default

Use state, actions, selectors, and effects without requiring RxJS.

## Actions and selectors

Actions mutate state and can be sync or async. Selectors derive data from current state.

```ts
const store = createStore({
  items: [] as string[],
  actions: {
    add(state, item: string) {
      state.items.push(item)
    }
  },
  selectors: {
    total: (state) => state.items.length
  }
})
```

## Effects for orchestration

Effects react to dependencies and run side effects while keeping action code focused.

## Optional stream integration

Use `fromStream()` and stream operators when you need external event orchestration.

## Inter-store reactions

Use `on()` to react to actions from another store without tight coupling.

## Multi-framework core

`@ngstato/core` is the source of truth. Framework adapters stay thin.

