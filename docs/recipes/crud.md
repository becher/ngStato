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

## Action pattern

- `loadAll`: fetch and replace entities
- `createOne`: persist then insert
- `updateOne`: persist then patch
- `deleteOne`: persist then remove

## Why this pattern works

It stays simple for teams while still supporting large CRUD-heavy products.

