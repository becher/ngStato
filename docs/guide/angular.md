# Angular

## Setup

```ts
import { provideStato } from '@ngstato/angular'

provideStato({
  devtools: true
})
```

## Create Angular stores

`@ngstato/angular` exposes the same semantics as core with Angular Signals integration.

## Store injection

Use `injectStore` (or your project helpers) to consume stores inside components/services.

## Lifecycle

Store initialization and cleanup are aligned with core lifecycle semantics, so behavior stays predictable across adapters.

