# Common Mistakes

## 1. Mutating state outside actions

```ts
// ❌ Wrong — direct mutation, won't trigger subscribers or effects
store.users = []
store.loading = true

// ✅ Correct — wrap mutations in an action
actions: {
  clearUsers(state) {
    state.users = []
  }
}
await store.clearUsers()
```

State properties on the public store are **read-only getters**. Only the `state` proxy inside an action can trigger updates.

---

## 2. Forgetting `await` on async actions

```ts
// ❌ Wrong — action hasn't completed yet
store.loadUsers()
console.log(store.users)   // still [] !

// ✅ Correct
await store.loadUsers()
console.log(store.users)   // [...loaded users]
```

All actions return a `Promise`. If you need to read state after an action, `await` it.

---

## 3. Catching errors without rethrowing in `retryable()`

```ts
// ❌ Wrong — retryable never retries because the error is swallowed
actions: {
  load: retryable(async (state) => {
    try {
      state.data = await http.get('/data')
    } catch (e) {
      state.error = (e as Error).message
      // error swallowed! retryable thinks it succeeded
    }
  }, { attempts: 3 })
}

// ✅ Correct — rethrow so retryable can retry
actions: {
  load: retryable(async (state) => {
    try {
      state.data = await http.get('/data')
    } catch (e) {
      state.error = (e as Error).message
      throw e   // ← rethrow!
    }
  }, { attempts: 3 })
}
```

---

## 4. Using streams for simple HTTP calls

```ts
// ❌ Overkill — don't use fromStream for a one-time fetch
actions: {
  load: fromStream(
    () => from(http.get('/data')),
    (state, data) => { state.data = data }
  )
}

// ✅ Correct — plain async/await
actions: {
  async load(state) {
    state.data = await http.get('/data')
  }
}
```

Use streams only for **push-based sources** (WebSocket, Firebase, SSE). For request/response, use async/await.

---

## 5. Putting too much logic in one action

```ts
// ❌ Too much — hard to test, hard to reuse
actions: {
  async doEverything(state) {
    state.loading = true
    state.users = await http.get('/users')
    state.orders = await http.get('/orders')
    state.stats = computeStats(state.users, state.orders)
    state.loading = false
    sendAnalytics('dashboard-loaded')
  }
}

// ✅ Better — focused actions + forkJoin
actions: {
  async loadDashboard(state) {
    state.loading = true
    const data = await forkJoin({
      users:  () => http.get('/users'),
      orders: () => http.get('/orders')
    })
    state.users  = data.users
    state.orders = data.orders
    state.loading = false
  }
}

// Stats as a selector
selectors: {
  stats: (state) => computeStats(state.users, state.orders)
}
```

---

## 6. Using `computed` for expensive operations

```ts
// ❌ Wrong — computed recalculates on every access
computed: {
  sortedUsers: (state) => [...state.users].sort((a, b) => a.name.localeCompare(b.name))
}

// ✅ Correct — selectors are memoized
selectors: {
  sortedUsers: (state) => [...state.users].sort((a, b) => a.name.localeCompare(b.name))
}
```

Use `computed` for cheap derivations (length, boolean check). Use `selectors` for anything involving `.filter()`, `.sort()`, `.map()`, or other heavy operations.

---

## 7. Not picking the right concurrency helper

```ts
// ❌ No protection — multiple rapid clicks = multiple concurrent fetches
actions: {
  async submit(state) { /* ... */ }
}

// Pick one based on your need:
actions: {
  // Double-click protection (ignore while running)
  submit: exclusive(async (state) => { /* ... */ }),

  // Cancel previous (search as you type)
  search: abortable(async (state, q, { signal }) => { /* ... */ }),

  // Process in order (chat messages)
  send: queued(async (state, msg) => { /* ... */ }),

  // Retry on failure (unreliable network)
  load: retryable(async (state) => { /* ... */ }, { attempts: 3 })
}
```

---

## 8. Migrating all NgRx stores at once

```ts
// ❌ Big bang migration — high risk, hard to debug
// Rewrite 20 NgRx stores to ngStato in one PR

// ✅ Incremental — one feature at a time
// Week 1: migrate UserStore
// Week 2: migrate OrderStore
// Week 3: ...
```

Keep existing NgRx stores running alongside ngStato stores during migration. They don't conflict.

---

## Quick checklist before merge

- [ ] State and selectors are properly typed (no `any`)
- [ ] Async behavior is explicit (`exclusive`, `queued`, `retryable`)
- [ ] Error path is tested (`onError` hook, try/catch in actions)
- [ ] No unnecessary stream complexity (use async/await first)
- [ ] Actions are focused (one responsibility each)
- [ ] Expensive derivations use `selectors` (not `computed`)
- [ ] `withPersist` has a `version` for future migrations
