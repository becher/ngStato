# Auth and Session

## Goal

Manage login/logout/session refresh with predictable state transitions.

## Recommended state

```ts
type AuthState = {
  user: { id: string; name: string } | null
  token: string | null
  loading: boolean
  error: string | null
}
```

## Example store

```ts
import { createStore } from '@ngstato/core'

export const authStore = createStore({
  user: null as { id: string; name: string } | null,
  token: null as string | null,
  loading: false,
  error: null as string | null,
  actions: {
    async login(state, email: string, password: string) {
      state.loading = true
      state.error = null
      try {
        const session = await api.login(email, password)
        state.user = session.user
        state.token = session.token
      } catch (e) {
        state.error = String(e)
      } finally {
        state.loading = false
      }
    },
    logout(state) {
      state.user = null
      state.token = null
    }
  }
})
```

## Best practices

- Persist only needed session fields.
- Keep token refresh isolated in one action/effect.
- Handle 401 globally and route to logout flow.

## Playground

- [StackBlitz demo app](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

