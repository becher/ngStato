# Optimistic Update

## Goal

Update UI immediately, then rollback if backend save fails.

## Example

```ts
async function renameStudent(state: any, id: number, nextName: string) {
  const current = state.students.entities[id]
  if (!current) return

  const previousName = current.name
  current.name = nextName

  try {
    await api.renameStudent(id, nextName)
  } catch (e) {
    current.name = previousName
    state.error = String(e)
  }
}
```

## Best practices

- Keep a minimal rollback snapshot.
- Roll back only the impacted fields.
- Show a non-blocking feedback message to the user.

## Playground

- [Open StackBlitz demo](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

