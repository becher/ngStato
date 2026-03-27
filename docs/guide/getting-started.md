# Getting Started

## Installation

```bash
npm install @ngstato/core @ngstato/angular
```

## Create your first store

```ts
import { createStore } from '@ngstato/core'

const store = createStore({
  count: 0 as number,
  loading: false,
  actions: {
    inc(state) {
      state.count++
    },
    async load(state) {
      state.loading = true
      await new Promise((r) => setTimeout(r, 300))
      state.loading = false
    }
  },
  selectors: {
    doubled: (state) => state.count * 2
  }
})

await store.inc()
console.log(store.count)
console.log(store.doubled)
```

## Angular integration

```ts
import { provideStato } from '@ngstato/angular'

provideStato({ devtools: true })
```

## Next steps

- Read [Core Concepts](/guide/core-concepts)
- Learn [Architecture](/guide/architecture)
- Scale with [Entities](/guide/entities)
- Explore [CRUD Recipe](/recipes/crud)

