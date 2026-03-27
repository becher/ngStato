# Helpers API

## Async/action helpers

- `abortable`, `debounced`, `throttled`, `retryable`
- `exclusive`, `queued`
- `distinctUntilChanged`, `forkJoin`, `race`, `combineLatest`

## Stream helpers

- `fromStream`, `combineLatestStream`
- `pipeStream`, `mapStream`, `filterStream`
- `switchMapStream`, `concatMapStream`, `exhaustMapStream`, `mergeMapStream`
- `distinctUntilChangedStream`, `debounceStream`, `throttleStream`
- `catchErrorStream`, `retryStream`

## Guidance

Prefer action helpers first, then adopt stream helpers for boundary/event-heavy use cases.

