// ─────────────────────────────────────────────────────
// @ngstato/core — createStore()
// Le moteur principal de Stato
// ─────────────────────────────────────────────────────

import type {
  StatoStoreConfig,
  StatoHooks,
  StateSlice,
  EffectEntry
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
  private _selectors: Record<string, () => unknown> = {}

  // Les cleanups à appeler à la destruction
  private _cleanups: Array<() => void> = []

  // Les hooks lifecycle
  private _hooks: StatoHooks<any>
  private _publicStore: any = null
  private _effects: Array<{
    deps: (state: StateSlice<S>) => unknown | unknown[]
    run: Function
    prevDeps?: unknown[]
    hasRun: boolean
    cleanup?: () => void
    running: boolean
    rerunRequested: boolean
  }> = []

  private _createMemoizedSelector(fn: Function): () => unknown {
    let initialized = false
    let cachedResult: unknown
    let trackedKeys: string[] = []
    let trackedValues: unknown[] = []

    return () => {
      if (initialized && trackedKeys.length) {
        const unchanged = trackedKeys.every((key, index) =>
          Object.is((this._state as any)[key], trackedValues[index])
        )
        if (unchanged) return cachedResult
      }

      const reads = new Set<string>()
      const trackingState = new Proxy(this._state as any, {
        get: (target, prop, receiver) => {
          if (typeof prop === 'string' && prop in target) {
            reads.add(prop)
          }
          return Reflect.get(target, prop, receiver)
        }
      })

      const result = fn(trackingState)

      trackedKeys = Array.from(reads)
      trackedValues = trackedKeys.map((key) => (this._state as any)[key])
      cachedResult = result
      initialized = true

      return result
    }
  }

  constructor(config: StatoStoreConfig<S>) {
    // 1. Extraire le state initial — tout sauf actions/computed/hooks
    const { actions, computed, selectors, effects, hooks, ...initialState } = config
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

    // 4. Enregistrer les selectors memoïzés
    if (selectors) {
      for (const [name, fn] of Object.entries(selectors)) {
        if (typeof fn === 'function') {
          this._selectors[name] = this._createMemoizedSelector(fn as Function)
        }
      }
    }

    if (effects) {
      for (const entry of effects) {
        const [deps, run] = entry as EffectEntry<StateSlice<S>>
        if (typeof deps === 'function' && typeof run === 'function') {
          this._effects.push({
            deps,
            run,
            hasRun: false,
            running: false,
            rerunRequested: false
          })
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
    this._runEffects()
    this._notify()
  }

  private _normalizeDeps(value: unknown | unknown[]): unknown[] {
    return Array.isArray(value) ? value : [value]
  }

  private _depsChanged(prev: unknown[] | undefined, next: unknown[]): boolean {
    if (!prev) return true
    if (prev.length !== next.length) return true
    for (let i = 0; i < next.length; i++) {
      if (!Object.is(prev[i], next[i])) return true
    }
    return false
  }

  private _runEffects(force = false) {
    for (const effect of this._effects) {
      const depsValue = effect.deps(this._state)
      const depsArray = this._normalizeDeps(depsValue)
      const shouldRun = force || this._depsChanged(effect.prevDeps, depsArray)
      if (!shouldRun) continue

      const execute = async () => {
        if (effect.running) {
          effect.rerunRequested = true
          return
        }

        effect.running = true
        effect.rerunRequested = false
        const prevDepsValue = effect.prevDeps
        effect.prevDeps = depsArray

        try {
          effect.cleanup?.()
          const maybeCleanup = await effect.run(depsValue, {
            state: { ...this._state },
            store: this._publicStore,
            prevDepsValue
          })
          effect.cleanup = typeof maybeCleanup === 'function' ? maybeCleanup : undefined
          effect.hasRun = true
        } catch (error) {
          this._hooks.onError?.(error as Error, 'effect')
        } finally {
          effect.running = false
          if (effect.rerunRequested) {
            this._runEffects()
          }
        }
      }

      void execute()
    }
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

  getSelector(name: string): unknown {
    const fn = this._selectors[name]
    if (!fn) throw new Error(`[Stato] Selector "${name}" introuvable`)
    return fn()
  }

  // ── Enregistrer un cleanup (pour fromStream) ───────
  registerCleanup(fn: () => void) {
    this._cleanups.push(fn)
  }

  hydrate(partial: Partial<StateSlice<S>>) {
    this._setState(partial)
  }

  setPublicStore(publicStore: any) {
    this._publicStore = publicStore
    this._runEffects(true)
  }

  // ── Lifecycle — appelé par l'adaptateur Angular ────
  init(publicStore: any) {
    this._publicStore = publicStore
    this._hooks.onInit?.(publicStore)
    this._runEffects(true)
  }

  destroy(publicStore: any) {
    this._hooks.onDestroy?.(publicStore)
    for (const effect of this._effects) {
      effect.cleanup?.()
      effect.cleanup = undefined
    }
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
  const { actions, computed, selectors } = config as StatoStoreConfig<S>

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

  if (selectors) {
    for (const name of Object.keys(selectors)) {
      Object.defineProperty(publicStore, name, {
        get: () => store.getSelector(name),
        enumerable: true,
        configurable: true
      })
    }
  }

  store.setPublicStore(publicStore)

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