// ─────────────────────────────────────────────────────
// @ngstato/testing — createMockStore()
// Utilitaire de test pour les stores ngStato
//
// Usage :
//   const store = createMockStore({
//     initialState: { users: [], loading: false },
//   })
//
//   store.__setState({ loading: true })
//   expect(store.loading).toBe(true)
//
//   store.__dispatch('loadUsers')
//   expect(store.loadUsers).toHaveBeenCalled()
// ─────────────────────────────────────────────────────

import { createStore } from '@ngstato/core'
import type { StatoStoreConfig } from '@ngstato/core'

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

export interface MockStoreOptions<S extends object> {
  /** State initial du mock — remplace le state de la config */
  initialState?: Partial<S>
  /** Actions mockées — remplacent les actions réelles */
  actions?: Partial<Record<keyof any, (...args: any[]) => any>>
}

export type MockStore<S extends object> = S & {
  /** Remplace tout ou partie du state directement */
  __setState(partial: Partial<S>): void
  /** Dispatch une action par son nom */
  __dispatch(actionName: string, ...args: unknown[]): Promise<void>
  /** Accès au store interne (pour assertions avancées) */
  __store__: any
  /** S'abonner aux changements */
  subscribe: (fn: (state: S) => void) => () => void
  /** Lire le state complet */
  getState: () => S
}

// ─────────────────────────────────────────────────────
// createMockStore()
// ─────────────────────────────────────────────────────

export function createMockStore<S extends object>(
  config: S & StatoStoreConfig<S>,
  options: MockStoreOptions<S> = {}
): MockStore<S> {

  // 1. Fusionner l'initialState des options par-dessus la config
  const mergedConfig: any = { ...config }
  if (options.initialState) {
    Object.assign(mergedConfig, options.initialState)
  }

  // 2. Remplacer les actions par les mocks si fournis
  if (options.actions && mergedConfig.actions) {
    mergedConfig.actions = {
      ...mergedConfig.actions,
      ...options.actions
    }
  }

  // 3. Créer le vrai store core (avec toute la mécanique)
  const store = createStore<S>(mergedConfig)

  // 4. Ajouter les helpers de test
  const mockStore = store as unknown as MockStore<S>

  // __setState — bypass le proxy, mutation directe du state interne
  mockStore.__setState = (partial: Partial<S>) => {
    store.__store__.hydrate(partial)
  }

  // __dispatch — dispatch par nom de chaîne de caractères
  mockStore.__dispatch = (actionName: string, ...args: unknown[]) => {
    return store.__store__.dispatch(actionName, ...args)
  }

  return mockStore
}
