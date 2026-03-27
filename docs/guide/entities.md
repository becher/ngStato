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

## Typical usage

1. Define adapter with `selectId` and optional `sortComparer`
2. Wrap config using `withEntities()`
3. Use generated actions/selectors in your feature flows

## Why this matters

Entity patterns are key for large applications. `withEntities()` keeps the developer experience simple while providing robust collection semantics.

