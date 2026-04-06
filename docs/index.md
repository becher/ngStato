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
      text: Migration from NgRx
      link: /migration/ngrx-to-ngstato
    - theme: alt
      text: API Reference
      link: /api/core

features:
  - icon: ⚡
    title: State-first by design
    details: "Build features with plain state, actions, selectors, and effects. async/await replaces rxMethod + pipe + switchMap + tapResponse."
  - icon: 🔌
    title: RxJS optional
    details: "Integrate external streams only where needed with fromStream(), combineLatestStream(), and 12 stream operators."
  - icon: 🏢
    title: Enterprise-ready entities
    details: "Use createEntityAdapter() and withEntities() for normalized collections, generated selectors, and scalable CRUD."
  - icon: 🔀
    title: Concurrency semantics
    details: "Control async behavior with exclusive(), queued(), abortable(), retryable() — no RxJS operators needed."
  - icon: 🧩
    title: Composable features
    details: "Build reusable store features with mergeFeatures() — like signalStoreFeature() but simpler."
  - icon: 🛠️
    title: Built-in DevTools
    details: "No Chrome extension needed. Drag-and-drop panel, action history, state diffs — auto-disabled in production."
  - icon: 🧪
    title: Testing utilities
    details: "createMockStore() with __setState(), __dispatch(), and full spy support for isolated unit tests."
  - icon: 📦
    title: 38x lighter
    details: "~3 KB gzipped vs ~50 KB for NgRx. Same capabilities, fraction of the bundle."
---
