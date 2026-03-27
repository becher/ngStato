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

