# Auth & Session

## Goal

Manage authentication state (login, logout, token refresh) with predictable transitions and optional persistence.

## Complete auth store

```ts
import { createStore, http, withPersist, exclusive } from '@ngstato/core'

type User = { id: string; name: string; email: string; role: string }

type AuthState = {
  user:        User | null
  token:       string | null
  refreshToken: string | null
  loading:     boolean
  error:       string | null
}

export const authStore = createStore(
  withPersist(
    {
      user:         null as User | null,
      token:        null as string | null,
      refreshToken: null as string | null,
      loading:      false,
      error:        null as string | null,

      computed: {
        isAuthenticated: (state) => state.token !== null,
        isAdmin:         (state) => state.user?.role === 'admin',
        userName:        (state) => state.user?.name ?? 'Guest'
      },

      actions: {
        // Login — exclusive prevents double-submit
        login: exclusive(async (state, email: string, password: string) => {
          state.loading = true
          state.error = null
          try {
            const session = await http.post<{
              user: User; token: string; refreshToken: string
            }>('/auth/login', { email, password })

            state.user         = session.user
            state.token        = session.token
            state.refreshToken = session.refreshToken
          } catch (e) {
            state.error = (e as Error).message
          } finally {
            state.loading = false
          }
        }),

        // Logout
        logout(state) {
          state.user         = null
          state.token        = null
          state.refreshToken = null
          state.error        = null
        },

        // Token refresh
        async refreshSession(state) {
          if (!state.refreshToken) return
          try {
            const session = await http.post<{
              token: string; refreshToken: string
            }>('/auth/refresh', { refreshToken: state.refreshToken })

            state.token        = session.token
            state.refreshToken = session.refreshToken
          } catch {
            // Refresh failed → force logout
            state.user         = null
            state.token        = null
            state.refreshToken = null
          }
        },

        clearError(state) {
          state.error = null
        }
      },

      hooks: {
        onInit: (store) => {
          // If we have a token from persistence, try to refresh
          if (store.token) {
            store.refreshSession()
          }
        }
      }
    },
    {
      key: 'auth-session',
      pick: ['token', 'refreshToken', 'user'],  // only persist these
      version: 1
    }
  )
)
```

## Configure HTTP auth header

The HTTP client can auto-inject the token:

```ts
// app.config.ts
provideStato({
  http: {
    baseUrl: 'https://api.example.com',
    auth: () => authStore.token   // auto-attached to every request
  }
})
```

## Handle 401 globally

Use `on()` to react to HTTP errors across all stores:

```ts
import { on } from '@ngstato/core'

// React to any action that fails
on(
  [userStore.loadUsers, orderStore.loadOrders],
  (_, event) => {
    if (event.status === 'error' && event.error?.message.includes('401')) {
      authStore.logout()
    }
  }
)
```

Or handle it in the HTTP error hook:

```ts
hooks: {
  onError: (err, actionName) => {
    if (err.message.includes('401')) {
      authStore.refreshSession()
    }
  }
}
```

## Angular route guard

```ts
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { injectStore } from '@ngstato/angular'

export const authGuard = () => {
  const auth   = injectStore(AuthStore)
  const router = inject(Router)

  if (auth.isAuthenticated()) {
    return true
  }

  return router.createUrlTree(['/login'])
}
```

## Best practices

| Practice | Why |
|----------|-----|
| Persist only `token` + `refreshToken` + `user` | Avoid stale loading/error state on reload |
| Use `exclusive()` on login | Prevent double-submit |
| Refresh on init | Validate stored token on app startup |
| Handle 401 globally | Don't duplicate auth logic in every store |
| Use `withPersist` versioning | Migrate stored data when schema changes |
