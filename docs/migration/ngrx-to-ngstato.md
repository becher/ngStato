# NgRx → ngStato Migration

## Migration strategy

**Migrate incrementally** — one feature store at a time. ngStato and NgRx can coexist in the same application.

## Complete API mapping

### State

| NgRx | ngStato | Notes |
|------|---------|-------|
| `withState({ users: [], loading: false })` | `users: [], loading: false` | State is defined at config root |
| `patchState(store, { loading: true })` | `state.loading = true` | Direct mutation via Proxy |
| `getState(store)` | `store.getState()` | Full snapshot |

### Actions & Methods

| NgRx | ngStato | Notes |
|------|---------|-------|
| `withMethods((store) => ({ ... }))` | `actions: { ... }` | No wrapper needed |
| `rxMethod<void>(pipe(...))` | `async fn(state) { ... }` | async/await replaces RxJS pipe |
| `tapResponse({ next, error })` | `try/catch/finally` | Native error handling |
| `patchState(store, { x: y })` | `state.x = y` | Proxy intercepts mutations |

**Before (NgRx):**
```ts
withMethods((store, service = inject(UserService)) => ({
  load: rxMethod<void>(
    pipe(
      tap(() => patchState(store, { loading: true })),
      switchMap(() =>
        from(service.getAll()).pipe(
          tapResponse({
            next:  (users) => patchState(store, { users, loading: false }),
            error: (e) => patchState(store, { error: e.message, loading: false })
          })
        )
      )
    )
  )
}))
```

**After (ngStato):**
```ts
actions: {
  async load(state) {
    state.loading = true
    try {
      state.users = await http.get('/users')
    } catch (e) {
      state.error = (e as Error).message
    } finally {
      state.loading = false
    }
  }
}
```

### Computed & Selectors

| NgRx | ngStato | Notes |
|------|---------|-------|
| `withComputed((store) => ({ total: computed(() => store.users().length) }))` | `computed: { total: (s) => s.users.length }` | No Angular `computed()` needed |
| `createSelector(selectUsers, (users) => ...)` | `selectors: { ... }` | Auto-memoized |

### Entity

| NgRx | ngStato |
|------|---------|
| `withEntities<User>()` | `withEntities(config, { key, adapter })` |
| `EntityAdapter` from `@ngrx/entity` | `createEntityAdapter()` from `@ngstato/core` |
| `setAllEntities(users)` | `adapter.setAll(state, users)` |
| `addEntity(user)` | `adapter.addOne(state, user)` |
| `removeEntity(id)` | `adapter.removeOne(state, id)` |
| `updateEntity({ id, changes })` | `adapter.updateOne(state, { id, changes })` |

### Effects

| NgRx | ngStato | Notes |
|------|---------|-------|
| `@Effect()` class-based | `effects: [[deps, runner]]` | Dependency-tracked |
| `Actions + ofType()` | `on(action, handler)` | Inter-store reactions |
| `switchMap` | `abortable()` | Cancel previous |
| `exhaustMap` | `exclusive()` | Ignore while running |
| `concatMap` | `queued()` | Process in order |
| `retryWhen` | `retryable()` | Retry with backoff |
| `debounceTime` | `debounced()` | Debounce action calls |
| `throttleTime` | `throttled()` | Throttle action calls |

### Store features

| NgRx | ngStato |
|------|---------|
| `signalStoreFeature()` | `mergeFeatures()` |
| `withState()` + `withMethods()` + `withComputed()` | Single config object |
| `provideMockStore()` | `createMockStore()` from `@ngstato/testing` |

### DevTools

| NgRx | ngStato |
|------|---------|
| Chrome Redux DevTools extension | Built-in `<stato-devtools>` component |
| `provideStoreDevtools({ logOnly: !isDevMode() })` | `provideStato({ devtools: isDevMode() })` |
| `connectDevTools(store, 'Name')` | Same |

## Step-by-step migration

### Step 1: Pick one feature store

Start with a **simple, isolated** store (e.g., settings, auth, or a small CRUD).

### Step 2: Install ngStato alongside NgRx

```bash
npm install @ngstato/core @ngstato/angular
```

Add `provideStato()` to your `app.config.ts` alongside existing NgRx providers.

### Step 3: Rewrite the store

```ts
// Before: users.store.ts (NgRx)
export const UsersStore = signalStore(
  withState({ users: [] as User[], loading: false }),
  withComputed(/* ... */),
  withMethods(/* ... rxMethod ... */)
)

// After: users.store.ts (ngStato)
export const UsersStore = StatoStore(() => createStore({
  users: [] as User[],
  loading: false,
  computed: { /* ... */ },
  actions: { /* ... async/await ... */ }
}))
```

### Step 4: Update components

```ts
// Before (NgRx)
store = inject(UsersStore)
store.users()          // Signal
store.load()           // rxMethod

// After (ngStato)
store = injectStore(UsersStore)
store.users()          // Signal (same!)
store.load()           // async action (same call!)
```

::: tip Templates usually don't change
Since both NgRx SignalStore and ngStato use Angular Signals, your templates often need **zero changes**.
:::

### Step 5: Remove NgRx for that feature

Once the new store is working and tested, remove the old NgRx store file and its related actions/reducers/effects.

### Step 6: Repeat

Migrate the next feature store. Continue until all stores are migrated, then remove `@ngrx/*` packages.

## Success metrics

| Metric | Expected |
|--------|----------|
| Lines of code | 40-60% reduction |
| Files per feature | Fewer (no separate actions/reducers/effects) |
| Concepts to learn | 1 (async/await) vs 9+ (RxJS operators) |
| Bundle size | ~3 KB vs ~50 KB gzipped |
| Runtime behavior | Equal or better |
