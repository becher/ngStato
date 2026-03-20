// ─────────────────────────────────────────────────────
// @ngstato/angular — injectStore()
// Helper pour injecter un store dans un composant
// ─────────────────────────────────────────────────────

import { inject, type Type } from '@angular/core'

export function injectStore<T>(store: Type<T>): T {
  return inject(store)
}