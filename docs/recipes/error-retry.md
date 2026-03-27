# Error + Retry Flows

## Goal

Implement robust error handling and retries for unstable network calls.

## Recommended pattern

- Keep `loading`, `error`, and `lastSuccessAt` in store state
- Use `retryable()` for transient failures
- Use `abortable()` for cancelable requests
- Use `exclusive()` or `queued()` depending on concurrency needs

## Decision guide

- `exclusive`: keep only one in-flight execution
- `queued`: process requests in order
- `retryable`: recover from temporary failures

## Example

```ts
import { createStore, retryable, exclusive } from '@ngstato/core'

export const profileStore = createStore({
  loading: false,
  error: null as string | null,
  profile: null as any,
  actions: {
    loadProfile: exclusive(
      retryable(async (state, userId: string) => {
        state.loading = true
        state.error = null
        try {
          state.profile = await api.getProfile(userId)
        } catch (e) {
          state.error = String(e)
          throw e
        } finally {
          state.loading = false
        }
      }, { retries: 2, delay: 250 })
    )
  }
})
```

## UX tips

- show user-friendly messages, not raw exceptions
- keep previous successful data visible when retrying

## Playground

- [Open StackBlitz demo](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

