# Getting Started

## Installation

```bash
npm install @ngstato/core @ngstato/angular
```

## Core usage

```ts
import { createStore } from '@ngstato/core'

const store = createStore({
  count: 0,
  actions: {
    inc(state) {
      state.count++
    }
  }
})

await store.inc()
console.log(store.count)
```

## Next

- [Core Concepts](/guide/core-concepts)
- [Streams (Optional)](/guide/streams)
- [Entities](/guide/entities)

