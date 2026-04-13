---
layout: home

hero:
  name: "ngStato"
  text: "State-first. RxJS optional."
  tagline: "Modern state management for Angular — less code, more power, zero RxJS required."
  actions:
    - theme: brand
      text: Start in 5 min →
      link: /guide/start-in-5-min
    - theme: alt
      text: 🚀 Live Demo (StackBlitz)
      link: https://stackblitz.com/github/becher/ngStato-demo
    - theme: alt
      text: Migration from NgRx
      link: /migration/ngrx-to-ngstato
    - theme: alt
      text: API Reference
      link: /api/core

features:
  - icon: ⚡
    title: "~3 KB — 12x lighter than NgRx"
    details: "Full state management with entity adapters, concurrency control, and DevTools in a fraction of the bundle."
  - icon: 🧠
    title: "1 concept: async/await"
    details: "Build features with plain state, actions, selectors, and effects. No rxMethod, no pipe, no switchMap, no tapResponse."
  - icon: 🕹️
    title: "Built-in time-travel DevTools"
    details: "Undo, redo, replay actions, export/import state snapshots. Built into your app — no Chrome extension needed."
  - icon: 🏢
    title: Enterprise-ready entities
    details: "createEntityAdapter() and withEntities() for normalized collections with generated selectors and scalable CRUD."
  - icon: 🔀
    title: Concurrency semantics
    details: "Control async behavior with exclusive(), queued(), abortable(), retryable(), optimistic() — no RxJS operators."
  - icon: 🧩
    title: Composable features
    details: "Build reusable store features with mergeFeatures() and inject services with withProps() — like signalStoreFeature() but simpler."
  - icon: 🔌
    title: RxJS optional
    details: "Integrate streams only where needed with fromStream(), combineLatestStream(), and 12 pipe-like operators."
  - icon: 🧪
    title: Testing + Schematics + ESLint
    details: "createMockStore() for tests, ng generate for scaffolding, 3 ESLint rules for best practices. Full toolchain."
---
