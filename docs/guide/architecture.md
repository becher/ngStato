# Architecture

## Design goals

- Keep the common path simple (state-first)
- Keep advanced flows possible (RxJS optional)
- Keep adapters thin around `@ngstato/core`

## Package layers

- `@ngstato/core`: store engine, helpers, entities, stream toolkit
- `@ngstato/angular`: Angular-specific integration on top of core

## Runtime model

1. `createStore()` creates the store instance
2. actions update state
3. selectors compute derived values
4. effects orchestrate side effects and async coordination
5. `on()` enables inter-store reactions

## Scaling strategy

- Start with plain actions/selectors
- Add entities for data-heavy domains
- Add stream operators only for boundary/event-heavy scenarios
- Keep feature stores isolated by domain

