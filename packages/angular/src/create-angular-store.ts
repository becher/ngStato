// ─────────────────────────────────────────────────────
// @ngstato/angular — createAngularStore()
// Transforme un ngstato store en store Angular avec Signals
// ─────────────────────────────────────────────────────

import {
  signal,
  computed,
  Injectable,
  OnDestroy,
  Signal
} from '@angular/core'

import { createStore } from '@ngstato/core'
import type { StatoStoreConfig } from '@ngstato/core'

// ─────────────────────────────────────────────────────
// FONCTION PRINCIPALE — createAngularStore()
// ─────────────────────────────────────────────────────

export function createAngularStore<S extends object>(
  config: S & StatoStoreConfig<S>
) {
  // 1. Créer le store core
  const coreStore = createStore(config)

  // 2. Créer un Signal pour chaque propriété du state
  const signals: Record<string, ReturnType<typeof signal>> = {}
  const initialState = coreStore.getState()

  for (const key of Object.keys(initialState as object)) {
    signals[key] = signal((initialState as any)[key])
  }

  // 3. Synchroniser les Signals avec le state core
  coreStore.subscribe((newState: any) => {
    for (const key of Object.keys(newState)) {
      if (signals[key]) {
        signals[key].set(newState[key])
      }
    }
  })

  // 4. Construire l objet public Angular
  const angularStore: any = {
    __store__: coreStore.__store__
  }

  // 5. Exposer chaque propriété comme Signal
  for (const key of Object.keys(initialState as object)) {
    Object.defineProperty(angularStore, key, {
      get:          () => signals[key],
      enumerable:   true,
      configurable: true
    })
  }

  // 6. Exposer chaque computed comme Signal computed
  // On force la lecture des signals Angular pour que le computed()
  // soit réactif via le système de change detection d'Angular.
  const { computed: computedConfig, selectors: selectorsConfig } = config as StatoStoreConfig<S>
  if (computedConfig) {
    for (const key of Object.keys(computedConfig)) {
      const fn = (computedConfig as any)[key]
      if (typeof fn !== 'function') continue
      const computedSignal = computed(() => {
        // Lire les signals Angular pour déclencher le tracking
        const snapshot: any = {}
        for (const stateKey of Object.keys(signals)) {
          snapshot[stateKey] = signals[stateKey]()
        }
        return fn(snapshot)
      })
      Object.defineProperty(angularStore, key, {
        get:          () => computedSignal,
        enumerable:   true,
        configurable: true
      })
    }
  }

  // 6b. Exposer chaque selector memoïzé comme Signal computed
  if (selectorsConfig) {
    for (const key of Object.keys(selectorsConfig)) {
      const fn = (selectorsConfig as any)[key]
      if (typeof fn !== 'function') continue
      const selectorSignal = computed(() => {
        const snapshot: any = {}
        for (const stateKey of Object.keys(signals)) {
          snapshot[stateKey] = signals[stateKey]()
        }
        return fn(snapshot)
      })
      Object.defineProperty(angularStore, key, {
        get:          () => selectorSignal,
        enumerable:   true,
        configurable: true
      })
    }
  }

  // 7. Exposer chaque action directement
  const { actions } = config as StatoStoreConfig<S>
  if (actions) {
    for (const name of Object.keys(actions)) {
      angularStore[name] = (...args: unknown[]) =>
        coreStore.__store__.dispatch(name, ...args)
    }
  }

  // 8. Mettre à jour la référence du publicStore vers l'angularStore
  // Note: createStore() a déjà appelé init() — on ne le rappelle PAS
  // pour éviter un double _runEffects(). On met seulement à jour la
  // référence pour que les effects/hooks utilisent l'angularStore (Signals).
  coreStore.__store__.setPublicStore(angularStore)

  // 9. Exposer destroy pour le cleanup
  angularStore.__destroy__ = () => {
    coreStore.__store__.destroy(angularStore)
  }

  return angularStore
}

// ─────────────────────────────────────────────────────
// OLD: StatoStoreBase (remplacée par StatoStore avec Proxy)
// Gardée pour backward compatibility si besoin
// ─────────────────────────────────────────────────────
@Injectable()
export class StatoStoreBase implements OnDestroy {
  storeInstance: any

  initStore<S extends object>(config: S & StatoStoreConfig<S>) {
    this.storeInstance = createAngularStore(config)

    // Copier toutes les propriétés sur this
    for (const key of Object.keys(this.storeInstance)) {
      if (key !== '__store__' && key !== '__destroy__') {
        Object.defineProperty(this, key, {
          get:          () => this.storeInstance[key],
          enumerable:   true,
          configurable: true
        })
      }
    }

    // Copier les actions
    const { actions } = config as StatoStoreConfig<S>
    if (actions) {
    for (const name of Object.keys(actions)) {
        Object.defineProperty(this, name, {
        get:          () => this.storeInstance[name],
        enumerable:   true,
        configurable: true
        })
    }
    }
  }

  ngOnDestroy() {
    this.storeInstance?.__destroy__()
  }
}

// ─────────────────────────────────────────────────────
// OLD: Config-based StatoStore (deprecated)
// Gardée pour backward compatibility
// ─────────────────────────────────────────────────────

export function StatoStoreOld<S extends object>(
  config: S & StatoStoreConfig<S>
) {
  @Injectable({ providedIn: 'root' })
  class ConcreteStore extends StatoStoreBase {
    constructor() {
      super()
      this.initStore(config)
    }
  }

  return ConcreteStore
}

// ─────────────────────────────────────────────────────
// HELPER TYPE — Extrait automatiquement les types du store
// Pour auto-inférer state + actions + computed sans boilerplate
// ─────────────────────────────────────────────────────

type ExtractStoreType<T> = Omit<T, '__store__' | '__destroy__'>

// ─────────────────────────────────────────────────────
// FACTORY — StatoStore()
// Crée un service Angular injectable avec auto-proxy
//
// Type-safe grâce aux génériques avancés — ZÉRO boilerplate!
//
// Usage :
//   export class UserStore extends StatoStore(() => {
//     const service = inject(UserService)
//     return createUserStore(service)
//   })
//   // ✅ store.user, store.loadUser(), etc — tous typés auto!
//   // ✅ Aucun "declare readonly" requis
// ─────────────────────────────────────────────────────

export function StatoStore<S extends object>(
  factory: () => S
): new() => ExtractStoreType<S> & OnDestroy {
  @Injectable({ providedIn: 'root' })
  class ConcreteStore implements OnDestroy {
    private _store: any
    [key: string]: any

    constructor() {
      // factory() est appelée dans le contexte d'injection Angular.
      // Si factory() retourne déjà un store ngstato (createStore),
      // on l'utilise tel quel. Sinon on le convertit via createAngularStore().
      const produced = factory() as any
      this._store = produced?.__store__ ? produced : createAngularStore(produced)

      // Proxy dynamique: plus besoin de déclaration manuelle des getters/actions.
      return new Proxy(this, {
        get: (target, prop, receiver) => {
          if (prop in target) {
            return Reflect.get(target, prop, receiver)
          }
          return this._store?.[prop as keyof typeof this._store]
        },
        set: (target, prop, value, receiver) => {
          if (prop in target) {
            return Reflect.set(target, prop, value, receiver)
          }
          if (this._store && prop in this._store) {
            this._store[prop] = value
            return true
          }
          ;(target as any)[prop] = value
          return true
        },
        has: (target, prop) => prop in target || prop in (this._store ?? {}),
        ownKeys: (target) => {
          const targetKeys = Reflect.ownKeys(target)
          const storeKeys = this._store ? Reflect.ownKeys(this._store) : []
          return Array.from(new Set([...targetKeys, ...storeKeys]))
        },
        getOwnPropertyDescriptor: (target, prop) => {
          const targetDesc = Reflect.getOwnPropertyDescriptor(target, prop)
          if (targetDesc) return targetDesc
          if (this._store && prop in this._store) {
            return {
              configurable: true,
              enumerable: true,
              writable: true,
              value: this._store[prop]
            }
          }
          return undefined
        }
      })
    }

    ngOnDestroy() {
      if (this._store?.__destroy__) {
        this._store.__destroy__()
        return
      }
      if (this._store?.__store__?.destroy) {
        this._store.__store__.destroy(this._store)
      }
    }
  }

  return ConcreteStore as any
}