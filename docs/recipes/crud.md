# CRUD Feature Store

## Goal

Build a feature store for list/detail/create/update/delete with predictable loading and error states.

## Recommended state shape

```ts
{
  loading: false,
  error: null as string | null,
  selectedId: null as string | null
}
```

Use `withEntities()` for collection data and keep UI flags in the same store.

## Complete example

```ts
import { createStore, createEntityAdapter, withEntities } from '@ngstato/core'

type Student = { id: number; name: string; level: string }

const adapter = createEntityAdapter<Student>({
  selectId: (s) => s.id
})

export const studentsStore = createStore(
  withEntities(
    {
      loading: false,
      error: null as string | null,
      selectedId: null as number | null,
      actions: {
        async loadAll(state) {
          state.loading = true
          state.error = null
          try {
            const data = await api.listStudents()
            await this.setStudents(data)
          } catch (e) {
            state.error = String(e)
          } finally {
            state.loading = false
          }
        }
      }
    },
    { key: 'students', adapter }
  )
)
```

## Action pattern

- `loadAll`: fetch and replace entities
- `createOne`: persist then insert
- `updateOne`: persist then patch
- `deleteOne`: persist then remove

## Why this pattern works

It stays simple for teams while still supporting large CRUD-heavy products.

## Playground

- [Open StackBlitz demo](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

