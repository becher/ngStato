# Installation & Setup

## Install packages

::: code-group

```bash [npm]
npm install @ngstato/core @ngstato/angular
```

```bash [pnpm]
pnpm add @ngstato/core @ngstato/angular
```

```bash [yarn]
yarn add @ngstato/core @ngstato/angular
```

:::

For testing utilities:

```bash
npm install -D @ngstato/testing
```

## Requirements

- **Angular** 17+ (Signals support)
- **TypeScript** 5.4+
- **Node.js** 18+

## Configure Angular

Add `provideStato()` to your application config:

```ts
// app.config.ts
import { ApplicationConfig }  from '@angular/core'
import { provideRouter }      from '@angular/router'
import { provideStato }       from '@ngstato/angular'
import { isDevMode }          from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideStato({
      http: {
        baseUrl: 'https://api.myapp.com',
        timeout: 8000,
        headers: { 'X-App-Version': '1.0' },
        auth:    () => localStorage.getItem('token')
      },
      devtools: isDevMode()   // auto-disabled in production
    })
  ]
}
```

## Create your first store

```ts
// counter.store.ts
import { createStore } from '@ngstato/core'

export const counterStore = createStore({
  // ── State ──
  count:   0,
  loading: false,

  // ── Computed (recalculated on every read) ──
  computed: {
    doubled: (state) => state.count * 2
  },

  // ── Selectors (memoized — only recalculate when deps change) ──
  selectors: {
    isPositive: (state) => state.count > 0
  },

  // ── Actions ──
  actions: {
    increment(state) {
      state.count++
    },

    async loadFromServer(state) {
      state.loading = true
      const res = await fetch('/api/count')
      state.count = await res.json()
      state.loading = false
    }
  },

  // ── Hooks (optional lifecycle) ──
  hooks: {
    onInit:  (store) => console.log('Store ready!', store.count),
    onError: (err, actionName) => console.error(`[${actionName}]`, err.message)
  }
})
```

## Use in an Angular component

```ts
// counter.component.ts
import { Component }    from '@angular/core'
import { StatoStore, injectStore } from '@ngstato/angular'
import { counterStore } from './counter.store'

// Wrap the core store for Angular DI
export const CounterStore = StatoStore(() => counterStore)

@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ store.count() }}</p>
    <p>Doubled: {{ store.doubled() }}</p>
    <button (click)="store.increment()">+1</button>
    <button (click)="store.loadFromServer()">Load</button>
  `
})
export class CounterComponent {
  store = injectStore(CounterStore)
}
```

::: tip Signals
In Angular, all state properties become **Angular Signals** automatically.
Use `store.count()` (with parentheses) in templates.
:::

## Enable DevTools

```ts
// app.component.ts
import { Component }              from '@angular/core'
import { RouterOutlet }           from '@angular/router'
import { StatoDevToolsComponent } from '@ngstato/angular'

@Component({
  imports:  [RouterOutlet, StatoDevToolsComponent],
  template: `<router-outlet /><stato-devtools />`
})
export class AppComponent {}
```

```ts
// In your store file
import { connectDevTools } from '@ngstato/core'

connectDevTools(counterStore, 'CounterStore')
```

The DevTools panel is draggable, resizable, and shows:
- Action history with durations
- State diffs (before/after)
- Current state explorer

## Next steps

- [Core Concepts](/guide/core-concepts) — state, actions, selectors, effects, hooks
- [Angular Integration](/guide/angular) — deep dive into Signals, DI, lifecycle
- [Entities](/guide/entities) — normalized collections for CRUD apps
- [CRUD Recipe](/recipes/crud) — full feature store example
- [API Reference](/api/core) — complete API documentation
