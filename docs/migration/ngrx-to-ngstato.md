# NgRx to ngStato

## Migration intent

Migrate incrementally while reducing boilerplate and keeping enterprise safety.

## Quick mapping

- NgRx `Store` + reducers -> ngStato `createStore()` actions
- NgRx selectors -> ngStato selectors
- NgRx entity adapter -> `createEntityAdapter()` / `withEntities()`
- NgRx effects / RxJS flows -> ngStato effects and optional stream toolkit

## Before / after example

NgRx style:

```ts
// reducer + actions + selectors in separate files
export const loadStudents = createAction('[Students] Load')
export const loadStudentsSuccess = createAction('[Students] Load Success', props<{ items: Student[] }>())
```

ngStato style:

```ts
export const studentsStore = createStore({
  items: [] as Student[],
  loading: false,
  actions: {
    async load(state) {
      state.loading = true
      state.items = await api.listStudents()
      state.loading = false
    }
  },
  selectors: {
    total: (state) => state.items.length
  }
})
```

## Incremental approach

1. Start on one feature domain
2. Keep API services unchanged
3. Migrate selectors and actions first
4. Introduce stream operators only where necessary
5. Measure code size and runtime behavior

## Success criteria

- fewer files and less boilerplate
- equal or better runtime behavior
- clear tests around business semantics

## Practical checklist

- Start from one feature, not whole app.
- Keep backend APIs unchanged.
- Port reducer logic into store actions.
- Port selectors as-is, then simplify.
- Add concurrency helper only when needed.

## Playground

- [Open StackBlitz demo](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

