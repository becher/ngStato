# Entities

For complex CRUD apps, use normalized state helpers.

## `createEntityAdapter()`

Provides:

- `ids`, `entities`
- CRUD helpers (`addOne`, `setAll`, `updateOne`, ...)
- selectors (`selectAll`, `selectById`, ...)

## `withEntities()`

Config wrapper that injects:

- entity slice
- generated actions
- generated selectors

This keeps `createStore()` clean while scaling to enterprise scenarios.

