// ─────────────────────────────────────────────────────
// Tests — createMockStore()
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest'
import { createMockStore }          from '../create-mock-store'

const baseConfig = {
  users:   [] as { id: number; name: string }[],
  loading: false,
  error:   null as string | null,
  actions: {
    setLoading: (s: any, v: boolean)      => { s.loading = v },
    setError:   (s: any, v: string | null) => { s.error = v },
    addUser:    (s: any, u: { id: number; name: string }) => { s.users.push(u) },
    loadUsers:  async (s: any) => {
      s.loading = true
      await Promise.resolve()
      s.users = [{ id: 1, name: 'Alice' }]
      s.loading = false
    }
  }
}

describe('createMockStore()', () => {

  // ── Basique ─────────────────────────────────────────

  it('crée un store avec le state initial de la config', () => {
    const store = createMockStore(baseConfig)
    expect(store.loading).toBe(false)
    expect(store.users).toEqual([])
    expect(store.error).toBeNull()
  })

  it('les actions fonctionnent normalement', async () => {
    const store = createMockStore(baseConfig)
    await store.setLoading(true)
    expect(store.loading).toBe(true)
  })

  // ── initialState override ────────────────────────────

  it('initialState des options remplace le state de base', () => {
    const store = createMockStore(baseConfig, {
      initialState: { loading: true, error: 'init error' }
    })
    expect(store.loading).toBe(true)
    expect(store.error).toBe('init error')
  })

  it('initialState partiel ne touche pas les autres propriétés', () => {
    const store = createMockStore(baseConfig, {
      initialState: { loading: true }
    })
    expect(store.loading).toBe(true)
    expect(store.users).toEqual([])  // inchangé
  })

  // ── __setState ──────────────────────────────────────

  it('__setState modifie le state directement', () => {
    const store = createMockStore(baseConfig)
    store.__setState({ loading: true, error: 'injected' })
    expect(store.loading).toBe(true)
    expect(store.error).toBe('injected')
  })

  it('__setState partiel ne touche pas les autres clés', () => {
    const store = createMockStore(baseConfig)
    store.__setState({ loading: true })
    expect(store.users).toEqual([])
  })

  it('__setState notifie les abonnés', () => {
    const store = createMockStore(baseConfig)
    const spy = vi.fn()
    store.subscribe(spy)
    store.__setState({ loading: true })
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ loading: true }))
  })

  // ── __dispatch ──────────────────────────────────────

  it('__dispatch exécute une action par son nom', async () => {
    const store = createMockStore(baseConfig)
    await store.__dispatch('setLoading', true)
    expect(store.loading).toBe(true)
  })

  it('__dispatch lève une erreur si l\'action est introuvable', async () => {
    const store = createMockStore(baseConfig)
    await expect(store.__dispatch('inexistante')).rejects.toThrow('introuvable')
  })

  // ── Action mocks ────────────────────────────────────

  it('options.actions remplace une action par un mock', async () => {
    const mockLoadUsers = vi.fn()
    const store = createMockStore(baseConfig, {
      actions: { loadUsers: mockLoadUsers }
    })

    await store.loadUsers()
    expect(mockLoadUsers).toHaveBeenCalledOnce()
    expect(store.loading).toBe(false)  // vrai action non appelée
  })

  it('action mockée reçoit correctement les args', async () => {
    const mockAddUser = vi.fn()
    const store = createMockStore(baseConfig, {
      actions: { addUser: mockAddUser }
    })

    await store.addUser({ id: 99, name: 'Test' })
    expect(mockAddUser).toHaveBeenCalledWith(
      expect.anything(),  // state proxy
      { id: 99, name: 'Test' }
    )
  })

  // ── getState ────────────────────────────────────────

  it('getState retourne un snapshot du state courant', async () => {
    const store = createMockStore(baseConfig)
    await store.setLoading(true)
    const snap = store.getState()
    expect(snap.loading).toBe(true)
  })

  // ── subscribe ───────────────────────────────────────

  it('subscribe s\'abonne aux changements et retourne une fonction de cleanup', async () => {
    const store = createMockStore(baseConfig)
    const spy = vi.fn()
    const unsub = store.subscribe(spy)

    await store.setLoading(true)
    expect(spy).toHaveBeenCalledOnce()

    unsub()
    await store.setLoading(false)
    expect(spy).toHaveBeenCalledOnce()  // pas de nouvel appel après unsub
  })
})
