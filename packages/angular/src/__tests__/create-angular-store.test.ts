// ─────────────────────────────────────────────────────
// @ngstato/angular — tests createAngularStore()
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAngularStore, StatoStoreBase }   from '../create-angular-store'

// ─────────────────────────────────────────────────────
// MOCK Angular Signals — pas besoin d Angular complet
// ─────────────────────────────────────────────────────

vi.mock('@angular/core', () => {
  const signalFn = (initial: any) => {
    let value = initial
    const sig  = () => value
    sig.set    = (v: any) => { value = v }
    sig.update = (fn: any) => { value = fn(value) }
    return sig
  }

  return {
    signal:                  signalFn,
    computed:                (fn: any) => fn,
    effect:                  (fn: any) => fn(),
    isDevMode:               () => true,       
    Injectable:              () => (t: any) => t,
    OnDestroy:               class {},
    inject:                  vi.fn(),
    InjectionToken:          class { constructor(public desc: string) {} },
    makeEnvironmentProviders: (p: any) => p,
  }
})

// ─────────────────────────────────────────────────────
// TESTS — createAngularStore()
// ─────────────────────────────────────────────────────

describe('createAngularStore — state de base', () => {

  it('expose chaque propriété comme un Signal', () => {
    const store = createAngularStore({
      count:  0,
      name:   'Stato',
      active: true
    })

    // Chaque propriété est un Signal — appelable comme une fonction
    expect(typeof store.count).toBe('function')
    expect(typeof store.name).toBe('function')
    expect(typeof store.active).toBe('function')
  })

  it('Signal retourne la valeur initiale', () => {
    const store = createAngularStore({
      count:  42,
      name:   'Stato',
      active: false
    })

    expect(store.count()).toBe(42)
    expect(store.name()).toBe('Stato')
    expect(store.active()).toBe(false)
  })

  it('Signal se met à jour après une action sync', async () => {
    const store = createAngularStore({
      count: 0,
      actions: {
        increment(state: any) { state.count++ },
        reset(state: any)     { state.count = 0 }
      }
    })

    await store.increment()
    expect(store.count()).toBe(1)

    await store.increment()
    expect(store.count()).toBe(2)

    await store.reset()
    expect(store.count()).toBe(0)
  })

  it('Signal se met à jour après une action async', async () => {
    const store = createAngularStore({
      data:      null as string | null,
      isLoading: false,
      actions: {
        async loadData(state: any) {
          state.isLoading = true
          await new Promise(r => setTimeout(r, 10))
          state.data      = 'résultat'
          state.isLoading = false
        }
      }
    })

    expect(store.isLoading()).toBe(false)
    const p = store.loadData()
    expect(store.isLoading()).toBe(true)

    await p
    expect(store.isLoading()).toBe(false)
    expect(store.data()).toBe('résultat')
  })

  it('plusieurs Signals mis à jour en même temps', async () => {
    const store = createAngularStore({
      user:      null as string | null,
      isLoading: false,
      error:     null as string | null,
      actions: {
        async load(state: any) {
          state.isLoading = true
          state.error     = null
          await new Promise(r => setTimeout(r, 10))
          state.user      = 'Alice'
          state.isLoading = false
        }
      }
    })

    await store.load()

    expect(store.user()).toBe('Alice')
    expect(store.isLoading()).toBe(false)
    expect(store.error()).toBeNull()
  })
})

// ─────────────────────────────────────────────────────
// TESTS — actions
// ─────────────────────────────────────────────────────

describe('createAngularStore — actions', () => {

  it('expose les actions directement sur le store', () => {
    const store = createAngularStore({
      count: 0,
      actions: {
        increment(state: any) { state.count++ },
        decrement(state: any) { state.count-- }
      }
    })

    expect(typeof store.increment).toBe('function')
    expect(typeof store.decrement).toBe('function')
  })

  it('action avec paramètre fonctionne correctement', async () => {
    const store = createAngularStore({
      count: 0,
      actions: {
        add(state: any, n: number) { state.count += n }
      }
    })

    await store.add(5)
    expect(store.count()).toBe(5)

    await store.add(3)
    expect(store.count()).toBe(8)
  })

  it('action async avec erreur — Signal error mis à jour', async () => {
    const store = createAngularStore({
      data:  null as string | null,
      error: null as string | null,
      actions: {
        async loadWithError(state: any) {
          try {
            throw new Error('erreur réseau')
          } catch (e) {
            state.error = (e as Error).message
          }
        }
      }
    })

    await store.loadWithError()
    expect(store.error()).toBe('erreur réseau')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — computed
// ─────────────────────────────────────────────────────

describe('createAngularStore — computed', () => {

  it('expose les computed comme Signals', () => {
    const store = createAngularStore({
      items: [1, 2, 3],
      computed: {
        total: (state: any) => state.items.length
      }
    })

    expect(typeof store.total).toBe('function')
  })

  it('computed retourne la bonne valeur', () => {
    const store = createAngularStore({
      items: [
        { id: 1, done: true },
        { id: 2, done: false },
        { id: 3, done: true }
      ],
      computed: {
        doneCount:   (state: any) => state.items.filter((i: any) => i.done).length,
        activeCount: (state: any) => state.items.filter((i: any) => !i.done).length
      }
    })

    expect(store.doneCount()).toBe(2)
    expect(store.activeCount()).toBe(1)
  })
})

// ─────────────────────────────────────────────────────
// TESTS — hooks
// ─────────────────────────────────────────────────────

describe('createAngularStore — hooks', () => {

  it('onInit est appelé à la création du store', () => {
    const onInit = vi.fn()

    createAngularStore({
      count: 0,
      hooks: { onInit }
    })

    expect(onInit).toHaveBeenCalledTimes(1)
  })

  it('onDestroy est appelé via __destroy__()', () => {
    const onDestroy = vi.fn()

    const store = createAngularStore({
      count: 0,
      hooks: { onDestroy }
    })

    store.__destroy__()
    expect(onDestroy).toHaveBeenCalledTimes(1)
  })

  it('onAction est appelé avant chaque action', async () => {
    const onAction = vi.fn()

    const store = createAngularStore({
      count: 0,
      actions: {
        increment(state: any) { state.count++ }
      },
      hooks: { onAction }
    })

    await store.increment()
    expect(onAction).toHaveBeenCalledWith('increment', [])
  })

  it('onError est appelé si une action échoue', async () => {
    const onError = vi.fn()

    const store = createAngularStore({
      count: 0,
      actions: {
        async fail() { throw new Error('test') }
      },
      hooks: { onError }
    })

    await expect(store.fail()).rejects.toThrow('test')
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      'fail'
    )
  })
})

// ─────────────────────────────────────────────────────
// TESTS — StatoStoreBase
// ─────────────────────────────────────────────────────

describe('StatoStoreBase', () => {

  it('initStore configure le store correctement', () => {
    const base = new StatoStoreBase()
    base.initStore({
      count: 10,
      actions: {
        increment(state: any) { state.count++ }
      }
    })

    expect((base as any).count()).toBe(10)
    expect(typeof (base as any).increment).toBe('function')
  })

  it('ngOnDestroy appelle __destroy__', () => {
    const base    = new StatoStoreBase()
    const destroy = vi.fn()

    base.initStore({ count: 0 })
    base.storeInstance.__destroy__ = destroy

    base.ngOnDestroy()
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('ngOnDestroy sans initStore ne lance pas d erreur', () => {
    const base = new StatoStoreBase()
    expect(() => base.ngOnDestroy()).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────
// TESTS — provideStato
// ─────────────────────────────────────────────────────

describe('provideStato()', () => {

  it('fonctionne sans configuration', async () => {
    const { provideStato } = await import('../provide-ngstato')
    expect(() => provideStato()).not.toThrow()
  })

  it('fonctionne avec configuration HTTP', async () => {
    const { provideStato } = await import('../provide-ngstato')
    expect(() => provideStato({
      http: {
        baseUrl: 'https://api.test.com',
        timeout: 5000
      }
    })).not.toThrow()
  })

  it('fonctionne avec devtools activé', async () => {
    const { provideStato } = await import('../provide-ngstato')
    expect(() => provideStato({
      devtools: true
    })).not.toThrow()
  })
})
it('onActionDone est appelé après chaque action avec la durée', async () => {
    const onActionDone = vi.fn()

    const store = createAngularStore({
      count: 0,
      actions: {
        increment(state: any) { state.count++ }
      },
      hooks: { onActionDone }
    })

    await store.increment()
    expect(onActionDone).toHaveBeenCalledWith(
      'increment',
      expect.any(Number)   // durée en ms
    )
  })

  it('onStateChange est appelé avec prev et next state', async () => {
    const onStateChange = vi.fn()

    const store = createAngularStore({
      count: 0,
      actions: {
        increment(state: any) { state.count++ }
      },
      hooks: { onStateChange }
    })

    await store.increment()
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ count: 0 }),  // prev
      expect.objectContaining({ count: 1 })   // next
    )
  })
 