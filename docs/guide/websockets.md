# WebSockets

## Goal

Consume push events from a WebSocket and project them into state safely.

## Pattern

1. Connect once.
2. Parse incoming messages.
3. Update state in small actions.
4. Cleanup on disconnect/destroy.

## Example

```ts
import { createStore, fromStream, pipeStream, mapStream } from '@ngstato/core'

export const notificationsStore = createStore({
  latest: null as string | null,
  actions: {
    listen: fromStream(
      () => pipeStream(socketMessage$, mapStream((m: any) => m.text as string)),
      (state, text) => {
        state.latest = text
      }
    )
  }
})
```

## Best practices

- Keep decoding/validation close to stream boundary.
- Keep store mutations minimal and deterministic.
- Add reconnect strategy outside mutation logic.

## Playground

- [StackBlitz demo app](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

