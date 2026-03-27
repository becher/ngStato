# Error + Retry Flows

## Goal

Implement robust error handling and retries for unstable network calls.

## Recommended pattern

- Keep `loading`, `error`, and `lastSuccessAt` in store state
- Use `retryable()` for transient failures
- Use `abortable()` for cancelable requests
- Use `exclusive()` or `queued()` depending on concurrency needs

## Decision guide

- `exclusive`: keep only one in-flight execution
- `queued`: process requests in order
- `retryable`: recover from temporary failures

## UX tips

- show user-friendly messages, not raw exceptions
- keep previous successful data visible when retrying

