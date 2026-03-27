# Streams (Optional)

RxJS is optional in ngStato.

Use streams only at boundaries (WebSocket, Firebase, router events), then return to state-first logic.

## APIs

- `fromStream()`
- `combineLatestStream()`
- `pipeStream()` + operators

## Example

```ts
import { fromStream, pipeStream, mapStream } from '@ngstato/core'

actions: {
  listen: fromStream(
    () => pipeStream(source$, mapStream((x) => x.value)),
    (state, value) => {
      state.latest = value
    }
  )
}
```

## When to use streams

- External push-based systems (WebSocket, event bus)
- Complex event composition (switch/merge/concat/exhaust behaviors)
- Incremental migration from existing RxJS-heavy code

## When not to use streams

If plain actions + selectors solve the use case, keep it state-first and avoid unnecessary complexity.

