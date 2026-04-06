// ─────────────────────────────────────────────────────
// @ngstato/core — mergeFeatures()
// Composition de features réutilisables entre stores
//
// Inspiré de NgRx signalStoreFeature() mais sans boilerplate.
// Une feature = un fragment de config { state, actions, computed,
// selectors, effects, hooks } qui peut être partagée entre stores.
//
// Usage :
//   function withLoading() {
//     return {
//       state:   { loading: false, error: null as string | null },
//       actions: { setLoading: (s, v: boolean) => { s.loading = v } },
//       computed: { hasError: (s) => s.error !== null }
//     }
//   }
//
//   const store = createStore({
//     users: [] as User[],
//     ...mergeFeatures(withLoading(), withPagination())
//   })
// ─────────────────────────────────────────────────────

import type { StatoHooks, EffectEntry } from '../types'

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

export interface FeatureConfig {
  state?:     Record<string, unknown>
  actions?:   Record<string, Function>
  computed?:  Record<string, Function>
  selectors?: Record<string, Function>
  effects?:   EffectEntry<any>[]
  hooks?:     Partial<StatoHooks<any>>
}

export type MergedFeature = {
  actions?:   Record<string, Function>
  computed?:  Record<string, Function>
  selectors?: Record<string, Function>
  effects?:   EffectEntry<any>[]
  hooks?:     Partial<StatoHooks<any>>
  [key: string]: unknown   // state keys spreaded at root level
}

// ─────────────────────────────────────────────────────
// HOOK MERGER — fusionne les hooks sans écraser les existants
// Chaque hook appelle tous les handlers enregistrés par chaque feature
// ─────────────────────────────────────────────────────

function mergeHooks(
  a: Partial<StatoHooks<any>> | undefined,
  b: Partial<StatoHooks<any>> | undefined
): Partial<StatoHooks<any>> {
  if (!a) return b ?? {}
  if (!b) return a

  const hookNames: (keyof StatoHooks<any>)[] = [
    'onInit', 'onDestroy', 'onAction', 'onActionDone', 'onError', 'onStateChange'
  ]

  const merged: Partial<StatoHooks<any>> = { ...a }

  for (const name of hookNames) {
    const fnA = a[name] as Function | undefined
    const fnB = b[name] as Function | undefined
    if (fnA && fnB) {
      ;(merged as any)[name] = (...args: unknown[]) => {
        fnA(...args)
        fnB(...args)
      }
    } else if (fnB) {
      ;(merged as any)[name] = fnB
    }
  }

  return merged
}

// ─────────────────────────────────────────────────────
// mergeFeatures() — fusionne N features en un seul objet config
//
// Règles de fusion :
//   - state       → spreaded à la racine (comme createStore l'attend)
//   - actions     → merge objet (dernière feature l'emporte en cas de conflit)
//   - computed    → merge objet
//   - selectors   → merge objet
//   - effects     → concat array
//   - hooks       → merge intelligent (tous les handlers sont appelés)
// ─────────────────────────────────────────────────────

export function mergeFeatures(...features: FeatureConfig[]): MergedFeature {
  const result: MergedFeature = {}

  for (const feature of features) {
    // State — spreader à la racine
    if (feature.state) {
      Object.assign(result, feature.state)
    }

    // Actions — merge objet
    if (feature.actions) {
      result.actions = { ...(result.actions ?? {}), ...feature.actions }
    }

    // Computed — merge objet
    if (feature.computed) {
      result.computed = { ...(result.computed ?? {}), ...feature.computed }
    }

    // Selectors — merge objet
    if (feature.selectors) {
      result.selectors = { ...(result.selectors ?? {}), ...feature.selectors }
    }

    // Effects — concat
    if (feature.effects?.length) {
      result.effects = [...(result.effects ?? []), ...feature.effects]
    }

    // Hooks — merge intelligent (tous les handlers appelés)
    if (feature.hooks) {
      result.hooks = mergeHooks(result.hooks, feature.hooks)
    }
  }

  return result
}
