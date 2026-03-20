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
  const { computed: computedConfig } = config as StatoStoreConfig<S>
  if (computedConfig) {
    for (const key of Object.keys(computedConfig)) {
      const computedSignal = computed(() => coreStore[key])
      Object.defineProperty(angularStore, key, {
        get:          () => computedSignal,
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

  // 8. Appeler onInit si défini
  const { hooks } = config as StatoStoreConfig<S>
  if (hooks?.onInit) {
    hooks.onInit(angularStore)
  }

  // 9. Exposer destroy pour le cleanup
  angularStore.__destroy__ = () => {
    coreStore.__store__.destroy(angularStore)
  }

  return angularStore
}

// ─────────────────────────────────────────────────────
// CLASSE DE BASE — étendue par StatoStore()
// Publique — pas de membres privés
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
// FACTORY — StatoStore()
// Crée un service Angular injectable
// Usage :
//   export class UserStore extends StatoStore({
//     user: null,
//     actions: { ... }
//   }) {}
// ─────────────────────────────────────────────────────

export function StatoStore<S extends object>(
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