# Project Templates

Use these folder structures as copy/paste starting points.

## Template A: CRUD-heavy feature

```txt
src/
  features/
    students/
      students.store.ts
      students.api.ts
      students.selectors.ts
      __tests__/
        students.store.test.ts
```

## Template B: Realtime feature (WebSocket)

```txt
src/
  features/
    notifications/
      notifications.store.ts
      notifications.stream.ts
      notifications.mapper.ts
```

## Template C: Auth/session feature

```txt
src/
  features/
    auth/
      auth.store.ts
      auth.api.ts
      auth.persist.ts
      auth.guard.ts
```

## Rule of thumb

- Keep one store per feature domain.
- Keep API adapters in dedicated files.
- Keep tests next to feature store logic.

## Playground

- [StackBlitz demo app](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

