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

## Extensions

- background refresh for stale pages
- optimistic prefetch for next page

