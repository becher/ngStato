<div align="center">

# @ngstato/core

### Tired of 14 lines of RxJS for a simple API call?

**Write `async/await`. Get the same result. Ship ~3 KB instead of ~50 KB.**

[![npm](https://img.shields.io/badge/npm-v0.3.0-blue)](https://www.npmjs.com/package/@ngstato/core)
[![gzip](https://img.shields.io/badge/gzip-~3KB-brightgreen)](#)
[![tests](https://img.shields.io/badge/tests-136%2B-green)](#)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](#)

[Documentation](https://becher.github.io/ngStato/) · [API Reference](https://becher.github.io/ngStato/api/core) · [Helpers](https://becher.github.io/ngStato/api/helpers)

</div>

---

## Before / After

**NgRx** — rxMethod + pipe + tap + switchMap + from + tapResponse + patchState:

```ts
load: rxMethod<void>(pipe(
  tap(() => patchState(store, { loading: true })),
  switchMap(() => from(service.getAll()).pipe(
    tapResponse({
      next:  (users) => patchState(store, { users, loading: false }),
      error: (e)     => patchState(store, { error: e.message })
    })
  ))
))
```

**ngStato** — async/await:

```ts
async load(state) {
  state.loading = true
  state.users   = await http.get('/users')
  state.loading = false
}
```

---

## Install

```bash
npm install @ngstato/core
```

## 30-second example

```ts
import { createStore } from '@ngstato/core'

const store = createStore({
  count: 0,
  
  selectors: { doubled: (s) => s.count * 2 },
  
  actions: {
    inc(state)                { state.count++ },
    add(state, n: number)    { state.count += n },
    async load(state)        { state.count = await fetchCount() }
  }
})

await store.inc()
store.count      // 1
store.doubled    // 2 (memoized)
```

## Real-world store

```ts
import { createStore, http, retryable, optimistic } from '@ngstato/core'

const store = createStore({
  users:   [] as User[],
  loading: false,
  error:   null as string | null,

  selectors: {
    total:  (s) => s.users.length,
    admins: (s) => s.users.filter(u => u.role === 'admin')
  },

  actions: {
    loadUsers: retryable(async (state) => {
      state.loading = true
      state.users   = await http.get('/users')
      state.loading = false
    }, { attempts: 3, backoff: 'exponential' }),

    deleteUser: optimistic(
      (state, id: string) => { state.users = state.users.filter(u => u.id !== id) },
      async (_, id)       => { await http.delete(`/users/${id}`) }
    )
  },

  hooks: {
    onInit:  (store) => store.loadUsers(),
    onError: (err, name) => console.error(`[${name}]`, err.message)
  }
})
```

## Concurrency — without RxJS

```ts
import { exclusive, abortable, queued, retryable, optimistic } from '@ngstato/core'

actions: {
  submit: exclusive(async (s) => { ... }),             // → exhaustMap
  search: abortable(async (s, q, { signal }) => { }),  // → switchMap
  send:   queued(async (s, msg) => { ... }),            // → concatMap
  load:   retryable(async (s) => { ... }, opts),        // → retryWhen
  delete: optimistic(apply, confirm),                   // → manual in NgRx
}
```

Plus `debounced` · `throttled` · `distinctUntilChanged` · `forkJoin` · `race` · `combineLatest` · `fromStream` · `pipeStream` + 12 stream operators · `createEntityAdapter` · `withEntities` · `withPersist` · `mergeFeatures` · `on()` → [Full API →](https://becher.github.io/ngStato/api/helpers)

## Inter-store reactions

```ts
import { on } from '@ngstato/core'

on([userStore.create, userStore.delete], (_, event) => {
  console.log(`${event.name} ${event.status} in ${event.duration}ms`)
})
```

## Feature composition

```ts
const store = createStore({
  items: [] as Item[],
  ...mergeFeatures(withLoading(), withPagination()),
  actions: { async load(state) { ... } }
})
// store.loading, store.page, store.hasError — all available
```

## The numbers

| | NgRx v21 | ngStato |
|:--|:--|:--|
| Bundle | ~50 KB | **~3 KB** |
| CRUD store | ~90 lines | **~45 lines** |
| Concepts for async | 9 | **1** |
| RxJS required | Yes | **No** |

## 📖 Documentation

**[becher.github.io/ngStato](https://becher.github.io/ngStato/)** — [Quick start](https://becher.github.io/ngStato/guide/start-in-5-min) · [Core concepts](https://becher.github.io/ngStato/guide/core-concepts) · [API](https://becher.github.io/ngStato/api/core) · [Helpers](https://becher.github.io/ngStato/api/helpers) · [NgRx migration](https://becher.github.io/ngStato/migration/ngrx-to-ngstato)

## License

MIT