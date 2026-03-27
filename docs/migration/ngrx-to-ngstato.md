# NgRx to ngStato

## Migration intent

Migrate incrementally while reducing boilerplate and keeping enterprise safety.

## Quick mapping

- NgRx `Store` + reducers -> ngStato `createStore()` actions
- NgRx selectors -> ngStato selectors
- NgRx entity adapter -> `createEntityAdapter()` / `withEntities()`
- NgRx effects / RxJS flows -> ngStato effects and optional stream toolkit

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

