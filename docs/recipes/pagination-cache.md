# Pagination + Cache

## Goal

Handle server-side pagination without refetching pages unnecessarily.

## State model

- `page`: current page index
- `pageSize`: current page size
- `total`: total records
- `pages`: map of page key -> entity ids
- `lastFetchedAt`: map of page key -> timestamp

## Strategy

1. Build a page key: `${page}:${pageSize}:${filtersHash}`
2. Return cached page if still valid
3. Fetch only when missing/stale
4. Merge entities and keep page-to-ids mapping

## Example

```ts
const TTL_MS = 30_000

async function loadPage(state: any, page: number, pageSize: number, filtersHash: string) {
  const key = `${page}:${pageSize}:${filtersHash}`
  const now = Date.now()
  const last = state.lastFetchedAt[key] ?? 0

  if (now - last < TTL_MS && state.pages[key]) {
    return
  }

  const response = await api.getStudentsPage({ page, pageSize })
  state.total = response.total
  state.pages[key] = response.items.map((x: any) => x.id)
  state.lastFetchedAt[key] = now
}
```

## Extensions

- background refresh for stale pages
- optimistic prefetch for next page

## Playground

- [Open StackBlitz demo](https://stackblitz.com/github/becher/ngStato/tree/main/apps/stackblitz-demo)

