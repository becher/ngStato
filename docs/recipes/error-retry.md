# Error + Retry Flows

## Goal

Build robust error handling with configurable retry strategies for unreliable networks.

## Pattern 1: `retryable()` — automatic retry with backoff

```ts
import { createStore, http, retryable } from '@ngstato/core'

export const dataStore = createStore({
  data:    null as any,
  loading: false,
  error:   null as string | null,

  actions: {
    loadData: retryable(async (state) => {
      state.loading = true
      state.error = null
      try {
        state.data = await http.get('/data')
      } catch (e) {
        state.error = (e as Error).message
        throw e   // must rethrow for retryable to retry
      } finally {
        state.loading = false
      }
    }, {
      attempts: 3,               // 3 attempts total
      backoff: 'exponential',    // 1s → 2s → 4s
      delay: 1000
    })
  }
})
```

::: warning
You **must rethrow** the error inside the action for `retryable()` to trigger retries. If the error is caught and swallowed, `retryable` considers the action successful.
:::

## Pattern 2: `exclusive()` + `retryable()` — no concurrent retries

Compose helpers to prevent multiple retry chains from running simultaneously:

```ts
actions: {
  loadProfile: exclusive(
    retryable(async (state, userId: string) => {
      state.loading = true
      state.error = null
      try {
        state.profile = await http.get(`/users/${userId}`)
      } catch (e) {
        state.error = (e as Error).message
        throw e
      } finally {
        state.loading = false
      }
    }, { attempts: 2, delay: 500 })
  )
}
```

This ensures:
- `exclusive()` → if called during an ongoing retry chain, the new call is ignored
- `retryable()` → if the request fails, it retries up to 2 times with 500ms delay

## Pattern 3: Manual retry with error state

For full control over retry UX:

```ts
export const reportStore = createStore({
  report:      null as any,
  loading:     false,
  error:       null as string | null,
  retryCount:  0,

  computed: {
    canRetry:   (state) => state.error !== null && state.retryCount < 3,
    hasError:   (state) => state.error !== null
  },

  actions: {
    async loadReport(state, reportId: string) {
      state.loading = true
      state.error = null
      try {
        state.report = await http.get(`/reports/${reportId}`)
        state.retryCount = 0   // reset on success
      } catch (e) {
        state.error = (e as Error).message
        state.retryCount = state.retryCount + 1
      } finally {
        state.loading = false
      }
    },

    clearError(state) {
      state.error = null
    }
  }
})
```

```html
<!-- Angular template -->
@if (store.hasError()) {
  <div class="error-panel">
    <p>{{ store.error() }}</p>
    @if (store.canRetry()) {
      <button (click)="store.loadReport(reportId)">
        Retry ({{ 3 - store.retryCount() }} attempts left)
      </button>
    } @else {
      <p>Max retries reached. Please try again later.</p>
    }
  </div>
}
```

## Pattern 4: Global error handling with hooks

```ts
const store = createStore({
  // ...state and actions...

  hooks: {
    onError: (error, actionName) => {
      // Log to monitoring service
      errorTracker.capture(error, { action: actionName })

      // Show toast notification
      toastService.show(`Action ${actionName} failed: ${error.message}`)
    }
  }
})
```

## Pattern 5: Inter-store error reactions with `on()`

```ts
import { on } from '@ngstato/core'

// React to errors from any user action
on(
  [userStore.loadUsers, userStore.createUser, userStore.deleteUser],
  (_, event) => {
    if (event.status === 'error') {
      notificationStore.showError(`${event.name} failed: ${event.error?.message}`)
    }
  }
)
```

## Backoff strategies

| Strategy | Behavior | Example (delay: 1000ms) |
|----------|----------|------------------------|
| `'fixed'` | Same delay every retry | 1s → 1s → 1s |
| `'exponential'` | Doubling delay | 1s → 2s → 4s |

## Decision guide

| Scenario | Use |
|----------|-----|
| Transient network errors | `retryable({ attempts: 3, backoff: 'exponential' })` |
| Prevent double-submit | `exclusive()` |
| Queue retry attempts | `queued()` + manual retry |
| User-controlled retry | Manual retry count in state |
| Cross-store error handling | `on()` + error hooks |
