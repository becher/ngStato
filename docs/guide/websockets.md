# WebSockets

## Goal

Consume real-time push events from a WebSocket and project them into state safely and cleanly.

## Basic pattern

```ts
import { createStore, fromStream, pipeStream, mapStream, filterStream } from '@ngstato/core'

type Notification = { id: string; text: string; type: 'info' | 'warning' | 'error' }

export const notificationsStore = createStore({
  notifications: [] as Notification[],
  connected:     false,
  lastReceived:  null as string | null,

  computed: {
    unreadCount: (state) => state.notifications.length,
    warnings:    (state) => state.notifications.filter(n => n.type === 'warning'),
    errors:      (state) => state.notifications.filter(n => n.type === 'error')
  },

  actions: {
    // Subscribe to WebSocket and project into state
    listen: fromStream(
      () => pipeStream(
        new WebSocket('wss://api.example.com/notifications'),
        mapStream((event: MessageEvent) => JSON.parse(event.data) as Notification),
        filterStream((n) => n.type !== 'info')   // only warnings and errors
      ),
      (state, notification) => {
        state.notifications = [notification, ...state.notifications].slice(0, 100)
        state.lastReceived = new Date().toISOString()
      }
    ),

    // Clear all
    clearAll(state) {
      state.notifications = []
    },

    // Dismiss one
    dismiss(state, id: string) {
      state.notifications = state.notifications.filter(n => n.id !== id)
    }
  },

  hooks: {
    onInit: (store) => store.listen()
  }
})
```

## With RxJS `webSocket`

If you already use RxJS, use its `webSocket` for a more robust connection:

```ts
import { webSocket } from 'rxjs/webSocket'

actions: {
  listen: fromStream(
    () => webSocket<ChatMessage>('wss://api.example.com/chat'),
    (state, message) => {
      state.messages = [...state.messages, message]
    }
  )
}
```

## Stream transformation

Process WebSocket messages before updating state:

```ts
import {
  fromStream, pipeStream,
  mapStream, filterStream, debounceStream,
  distinctUntilChangedStream, catchErrorStream, retryStream
} from '@ngstato/core'

actions: {
  listenPrices: fromStream(
    () => pipeStream(
      priceWebSocket$,

      // Parse raw messages
      mapStream((raw: any) => ({
        symbol: raw.s,
        price:  parseFloat(raw.p),
        time:   Date.now()
      })),

      // Only specific symbols
      filterStream((tick) => ['BTC', 'ETH'].includes(tick.symbol)),

      // Throttle updates
      debounceStream(100),

      // Skip duplicate prices
      distinctUntilChangedStream((a, b) => a.price === b.price),

      // Handle errors without killing the stream
      catchErrorStream((err) => {
        console.error('WebSocket error:', err)
        return priceWebSocket$   // reconnect
      }),

      // Auto-retry on disconnect
      retryStream(5)
    ),
    (state, tick) => {
      state.prices = {
        ...state.prices,
        [tick.symbol]: tick
      }
    }
  )
}
```

## Reconnection strategy

For production-grade WebSocket handling:

```ts
function createReconnectingSocket(url: string, maxRetries = 10) {
  let retries = 0

  return {
    subscribe(observer: { next: (v: any) => void; error?: (e: any) => void }) {
      let ws: WebSocket

      function connect() {
        ws = new WebSocket(url)
        ws.onmessage = (event) => {
          retries = 0
          observer.next(JSON.parse(event.data))
        }
        ws.onerror = (err) => observer.error?.(err)
        ws.onclose = () => {
          if (retries < maxRetries) {
            retries++
            const delay = Math.min(1000 * Math.pow(2, retries), 30000)
            setTimeout(connect, delay)
          }
        }
      }

      connect()

      return {
        unsubscribe() {
          ws?.close()
          retries = maxRetries  // prevent reconnection
        }
      }
    }
  }
}

// Use in store
actions: {
  listen: fromStream(
    () => createReconnectingSocket('wss://api.example.com/ws'),
    (state, data) => { state.latest = data }
  )
}
```

## Cleanup

Cleanup is automatic — when the store is destroyed, all `fromStream` subscriptions are unsubscribed:

```ts
// Happens automatically on store.destroy()
// 1. ws.close() is called
// 2. No more messages are processed
// 3. No memory leaks
```

## Best practices

| Practice | Why |
|----------|-----|
| Filter and transform **in the stream** | Keep state mutations minimal and predictable |
| Limit stored messages | `slice(0, 100)` prevents unbounded memory growth |
| Add `catchErrorStream` | Don't let one bad message kill the entire stream |
| Use `retryStream` for reconnection | Auto-reconnect on transient failures |
| Parse/validate at stream boundary | Don't put parsing logic in state mutations |
| Use `debounceStream` for high-frequency data | Prevent too many state updates per second |
