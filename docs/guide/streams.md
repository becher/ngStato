# Streams (Optional)

RxJS is **completely optional** in ngStato. Most apps only need state + actions + selectors. Use streams at **boundaries** — WebSocket, Firebase, router events, or migration from existing RxJS code.

## Decision tree

```
Do you need real-time push data?
  ├── No  → Use plain actions + selectors
  └── Yes → Is it from a WebSocket/SSE/Observable?
              ├── No  → Use polling with retryable()
              └── Yes → Use fromStream() + stream operators
```

## `fromStream()`

Subscribe to an Observable-like source and project values into state:

```ts
import { createStore, fromStream } from '@ngstato/core'

const store = createStore({
  lastPrice: 0,
  priceHistory: [] as number[],

  actions: {
    // Subscribe to a WebSocket stream
    listenPrices: fromStream(
      () => webSocket('wss://api.example.com/prices'),
      (state, price: number) => {
        state.lastPrice = price
        state.priceHistory = [...state.priceHistory, price]
      }
    )
  }
})

// Start listening
await store.listenPrices()
```

`fromStream()` accepts any object with a `subscribe()` method — RxJS Observables, custom streams, or anything implementing the Observable protocol.

Cleanup happens automatically when the store is destroyed.

## `pipeStream()` + operators

Compose stream transformations without importing RxJS:

```ts
import {
  fromStream, pipeStream,
  mapStream, filterStream, debounceStream,
  distinctUntilChangedStream, catchErrorStream
} from '@ngstato/core'

actions: {
  listenFiltered: fromStream(
    () => pipeStream(
      rawEventSource$,
      filterStream((event) => event.type === 'price'),
      mapStream((event) => event.payload.value),
      debounceStream(200),
      distinctUntilChangedStream(),
      catchErrorStream((err) => {
        console.error('Stream error:', err)
        return { subscribe: (obs: any) => obs.next(0) }  // fallback
      })
    ),
    (state, value) => {
      state.latestValue = value
    }
  )
}
```

## All available operators

| Operator | RxJS equivalent | What it does |
|----------|-----------------|--------------|
| `mapStream(fn)` | `map` | Transform each value |
| `filterStream(fn)` | `filter` | Only pass matching values |
| `switchMapStream(fn)` | `switchMap` | Cancel previous, subscribe to new inner stream |
| `concatMapStream(fn)` | `concatMap` | Queue inner streams, execute in order |
| `exhaustMapStream(fn)` | `exhaustMap` | Ignore new while inner stream is active |
| `mergeMapStream(fn)` | `mergeMap` | Subscribe to all inner streams concurrently |
| `distinctUntilChangedStream(fn?)` | `distinctUntilChanged` | Skip consecutive duplicate values |
| `debounceStream(ms)` | `debounceTime` | Wait for silence before emitting |
| `throttleStream(ms)` | `throttleTime` | At most one emission per interval |
| `catchErrorStream(fn)` | `catchError` | Handle errors, optionally provide fallback stream |
| `retryStream(n)` | `retry` | Resubscribe on error, up to N times |

## `combineLatestStream()`

Combine multiple Observable-like sources:

```ts
import { createStore, combineLatestStream } from '@ngstato/core'

actions: {
  listenAll: combineLatestStream(
    {
      prices:  () => priceWebSocket$,
      orders:  () => orderWebSocket$,
      status:  () => statusBroadcast$
    },
    (state, { prices, orders, status }) => {
      state.latestPrice  = prices
      state.latestOrder  = orders
      state.systemStatus = status
    }
  )
}
```

## `combineLatest()` — state-first alternative

For combining **state dependencies** (not streams), use the state-first version:

```ts
import { combineLatest } from '@ngstato/core'

// No streams involved — just reading latest state from multiple stores
const deps = combineLatest({
  users:  () => userStore.users,
  filter: () => filterStore.activeFilter
})
```

::: info Two APIs, by design
- `combineLatest()` — for state deps (synchronous, no subscriptions)
- `combineLatestStream()` — for Observable sources (async, with subscriptions)

Keeping them separate avoids confusion about lifecycle and runtime costs.
:::

## When to use streams

✅ **Good use cases:**
- WebSocket / Server-Sent Events
- Firebase Realtime / Supabase subscriptions
- Browser events (resize, intersection observer)
- Migrating existing RxJS code incrementally

❌ **Don't use streams for:**
- Simple HTTP calls → use `async/await` in actions
- Timer-based polling → use `setInterval` + action
- State derivations → use selectors
- One-time data loading → use actions + `retryable()`

## Next steps

- [WebSockets guide](/guide/websockets) — full WebSocket pattern
- [fromStream API](/api/helpers#fromstream) — detailed reference
- [Stream operators API](/api/helpers#pipestream) — all 12 operators
