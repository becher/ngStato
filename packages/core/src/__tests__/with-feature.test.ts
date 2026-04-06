// ─────────────────────────────────────────────────────
// Tests — mergeFeatures()
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest'
import { mergeFeatures } from '../helpers/with-feature'
import { createStore }   from '../store'

describe('mergeFeatures()', () => {

  // ── Basique ─────────────────────────────────────────

  it('merge le state de plusieurs features à la racine', () => {
    const result = mergeFeatures(
      { state: { loading: false } },
      { state: { error: null as string | null } }
    )
    expect(result.loading).toBe(false)
    expect(result.error).toBeNull()
  })

  it('merge les actions de plusieurs features', () => {
    const setLoading = (s: any, v: boolean) => { s.loading = v }
    const setError   = (s: any, v: string)  => { s.error = v }

    const result = mergeFeatures(
      { actions: { setLoading } },
      { actions: { setError } }
    )
    expect(result.actions?.setLoading).toBe(setLoading)
    expect(result.actions?.setError).toBe(setError)
  })

  it('merge les computed de plusieurs features', () => {
    const hasError  = (s: any) => s.error !== null
    const isReady   = (s: any) => !s.loading

    const result = mergeFeatures(
      { computed: { hasError } },
      { computed: { isReady } }
    )
    expect(result.computed?.hasError).toBe(hasError)
    expect(result.computed?.isReady).toBe(isReady)
  })

  it('merge les selectors de plusieurs features', () => {
    const activeUsers = (s: any) => s.users.filter((u: any) => u.active)
    const result = mergeFeatures({ selectors: { activeUsers } })
    expect(result.selectors?.activeUsers).toBe(activeUsers)
  })

  it('concat les effects de plusieurs features', () => {
    const effectA: [Function, Function] = [() => null, () => {}]
    const effectB: [Function, Function] = [() => null, () => {}]

    const result = mergeFeatures(
      { effects: [effectA as any] },
      { effects: [effectB as any] }
    )
    expect(result.effects).toHaveLength(2)
    expect(result.effects![0]).toBe(effectA)
    expect(result.effects![1]).toBe(effectB)
  })

  // ── Hooks ───────────────────────────────────────────

  it('appelle les hooks des deux features (merge intelligent)', () => {
    const onInitA = vi.fn()
    const onInitB = vi.fn()

    const result = mergeFeatures(
      { hooks: { onInit: onInitA } },
      { hooks: { onInit: onInitB } }
    )

    result.hooks?.onInit?.('store')
    expect(onInitA).toHaveBeenCalledWith('store')
    expect(onInitB).toHaveBeenCalledWith('store')
  })

  it('préserve un hook si seule une feature le définit', () => {
    const onDestroy = vi.fn()

    const result = mergeFeatures(
      { hooks: { onInit: vi.fn() } },
      { hooks: { onDestroy } }
    )

    result.hooks?.onDestroy?.('store')
    expect(onDestroy).toHaveBeenCalledWith('store')
  })

  // ── Conflits ────────────────────────────────────────

  it('la dernière feature l\'emporte en cas de conflit d\'action', () => {
    const v1 = (s: any) => { s.x = 1 }
    const v2 = (s: any) => { s.x = 2 }

    const result = mergeFeatures(
      { actions: { doThing: v1 } },
      { actions: { doThing: v2 } }
    )
    expect(result.actions?.doThing).toBe(v2)
  })

  // ── Intégration avec createStore ────────────────────

  it('fonctionne avec createStore() — state + actions + computed', async () => {
    function withLoading() {
      return {
        state:   { loading: false, error: null as string | null },
        actions: {
          setLoading: (s: any, v: boolean)      => { s.loading = v },
          setError:   (s: any, v: string | null) => { s.error = v }
        },
        computed: {
          hasError: (s: any) => s.error !== null
        }
      }
    }

    const store = createStore({
      users: [] as { id: number }[],
      ...mergeFeatures(withLoading())
    })

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.hasError).toBe(false)

    await store.setLoading(true)
    expect(store.loading).toBe(true)

    await store.setError('Erreur réseau')
    expect(store.error).toBe('Erreur réseau')
    expect(store.hasError).toBe(true)
  })

  it('fonctionne avec deux features mergées + state propre', async () => {
    function withPagination() {
      return {
        state: { page: 1, pageSize: 10 },
        actions: {
          nextPage: (s: any) => { s.page++ },
          prevPage: (s: any) => { if (s.page > 1) s.page-- }
        },
        computed: {
          offset: (s: any) => (s.page - 1) * s.pageSize
        }
      }
    }

    function withLoading() {
      return {
        state:   { loading: false },
        actions: { setLoading: (s: any, v: boolean) => { s.loading = v } }
      }
    }

    const store = createStore({
      items: [] as string[],
      ...mergeFeatures(withPagination(), withLoading())
    })

    expect(store.page).toBe(1)
    expect(store.pageSize).toBe(10)
    expect(store.offset).toBe(0)
    expect(store.loading).toBe(false)

    await store.nextPage()
    expect(store.page).toBe(2)
    expect(store.offset).toBe(10)

    await store.prevPage()
    expect(store.page).toBe(1)

    await store.setLoading(true)
    expect(store.loading).toBe(true)
  })

  it('appelle les hooks des deux features dans createStore', async () => {
    const onInitA = vi.fn()
    const onInitB = vi.fn()

    createStore({
      count: 0,
      ...mergeFeatures(
        { hooks: { onInit: onInitA } },
        { hooks: { onInit: onInitB } }
      )
    })

    expect(onInitA).toHaveBeenCalledOnce()
    expect(onInitB).toHaveBeenCalledOnce()
  })
})
