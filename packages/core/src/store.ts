// ─────────────────────────────────────────────────────
// @ngstato/core — createStore()
// Le moteur principal de Stato
// ─────────────────────────────────────────────────────

import type {
  StatoStoreConfig,
  StatoHooks,
  StateSlice
} from './types'

// ─────────────────────────────────────────────────────
// CLASSE INTERNE — jamais exposée directement
// ─────────────────────────────────────────────────────

class StatoStore<S extends object> {

  // Le state interne — jamais accessible directement
  private _state: StateSlice<S>

  // Les abonnés — notifiés à chaque changement
  private _subscribers: Set<(state: StateSlice<S>) => void> = new Set()

  // Les actions enregistrées
  private _actions: Record<string, Function> = {}

  // Les computed enregistrés
  private _computed: Record<string, () => unknown> = {}

  // Les cleanups à appeler à la destruction
  private _cleanups: Array<() => void> = []

  // Les hooks lifecycle
  private _hooks: StatoHooks<any>

  constructor(config: StatoStoreConfig<S>) {
    // 1. Extraire le state initial — tout sauf actions/computed/hooks
    const { actions, computed, hooks, ...initialState } = config
    this._state  = initialState as StateSlice<S>
    this._hooks  = hooks ?? {}

    // 2. Enregistrer les actions
    if (actions) {
      for (const [name, fn] of Object.entries(actions)) {
        this._actions[name] = fn
      }
    }

    // 3. Enregistrer les computed
    if (computed) {
      for (const [name, fn] of Object.entries(computed)) {
        if (typeof fn === 'function') {
          this._computed[name] = () => (fn as Function)(this._state)
        }
      }
    }
  }

  // ── Lire le state ──────────────────────────────────
  getState(): Readonly<StateSlice<S>> {
    return { ...this._state }
  }

  // ── Modifier le state — usage interne uniquement ───
  private _setState(partial: Partial<StateSlice<S>>) {
    // Copie immutable — on ne modifie jamais l'objet original
    this._state = { ...this._state, ...partial }
    this._notify()
  }

  // ── Notifier tous les abonnés ──────────────────────
  private _notify() {
    for (const subscriber of this._subscribers) {
      subscriber({ ...this._state })
    }
  }

  // ── S'abonner aux changements ──────────────────────
  subscribe(fn: (state: StateSlice<S>) => void): () => void {
    this._subscribers.add(fn)
    // Retourne une fonction de désabonnement
    return () => this._subscribers.delete(fn)
  }

  // ── Exécuter une action ────────────────────────────
async dispatch(actionName: string, ...args: unknown[]) {
  const action = this._actions[actionName]
  if (!action) {
    throw new Error(`[Stato] Action "${actionName}" introuvable`)
  }

  // Hook onAction — avant l'exécution
  this._hooks.onAction?.(actionName, args)

  const start = Date.now()
  const prevState = { ...this._state }

  const stateProxy = new Proxy({ ...this._state } as any, {
    set: (target, key, value) => {
      target[key] = value
      this._setState({ [key]: value } as any)
      return true
    }
  })

  try {
    await action(stateProxy, ...args)

    // Hook onActionDone — après l'exécution
    this._hooks.onActionDone?.(actionName, Date.now() - start)

    // Hook onStateChange — si le state a changé
    this._hooks.onStateChange?.(prevState as any, { ...this._state } as any)

  } catch (error) {
    // Hook onError — si une erreur est lancée
    this._hooks.onError?.(error as Error, actionName)
    throw error   // on remonte l'erreur quand même
  }
}

  // ── Lire une valeur computed ───────────────────────
  getComputed(name: string): unknown {
    const fn = this._computed[name]
    if (!fn) throw new Error(`[Stato] Computed "${name}" introuvable`)
    return fn()
  }

  // ── Enregistrer un cleanup (pour fromStream) ───────
  registerCleanup(fn: () => void) {
    this._cleanups.push(fn)
  }

  // ── Lifecycle — appelé par l'adaptateur Angular ────
  init(publicStore: any) {
    this._hooks.onInit?.(publicStore)
  }

  destroy(publicStore: any) {
    this._hooks.onDestroy?.(publicStore)
    // Nettoyer tous les streams ouverts
    for (const cleanup of this._cleanups) {
      cleanup()
    }
    this._cleanups = []
    this._subscribers.clear()
  }
}

// ─────────────────────────────────────────────────────
// FONCTION PUBLIQUE — createStore()
// ─────────────────────────────────────────────────────

export function createStore<S extends object>(config: S & StatoStoreConfig<S>) {

  // Créer l'instance interne
  const store = new StatoStore<S>(config as StatoStoreConfig<S>)

  // Construire l'objet public
  // Les propriétés du state sont accessibles directement
  // Les actions sont exposées sans le paramètre state
  const publicStore: any = {
    // Accès au store interne — pour les adaptateurs Angular/React/Vue
    __store__: store,

    // S'abonner aux changements
    subscribe: store.subscribe.bind(store),

    // Lire le state complet
    getState: store.getState.bind(store),

    // Enregistrer un cleanup
    registerCleanup: store.registerCleanup.bind(store),
  }

  // Exposer chaque propriété du state
  const initialState = store.getState()
  for (const key of Object.keys(initialState as object)) {
    Object.defineProperty(publicStore, key, {
      get: () => store.getState()[key as keyof typeof initialState],
      enumerable: true,
      configurable: true
    })
  }

  // Exposer chaque action
  const { actions, computed } = config as StatoStoreConfig<S>

  if (actions) {
    for (const name of Object.keys(actions)) {
      publicStore[name] = (...args: unknown[]) => store.dispatch(name, ...args)
    }
  }

  // Exposer chaque computed
  if (computed) {
    for (const name of Object.keys(computed)) {
      Object.defineProperty(publicStore, name, {
        get: () => store.getComputed(name),
        enumerable: true,
        configurable: true
      })
    }
  }

  return publicStore
}

// ─────────────────────────────────────────────────────
// store.on() — réactions inter-stores
// ─────────────────────────────────────────────────────

export function on<S extends object>(
  sourceAction: Function,
  handler: (state: S) => void | Promise<void>
) {
  // Sera implémenté dans v0.2
  // après que le core soit stable
  console.warn('[Stato] store.on() disponible en v0.2')
}