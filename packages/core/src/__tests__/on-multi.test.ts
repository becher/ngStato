// ─────────────────────────────────────────────────────
// Tests — on() multi-actions
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest'
import { createStore, on }          from '../store'

function makeStores() {
  const source = createStore({
    count: 0,
    actions: {
      increment: (s: any) => { s.count++ },
      decrement: (s: any) => { s.count-- },
      reset:     (s: any) => { s.count = 0 }
    }
  })

  const target = createStore({
    log: [] as string[],
    actions: {
      addLog: (s: any, msg: string) => { s.log.push(msg) }
    }
  })

  return { source, target }
}

describe('on() — réactions inter-stores', () => {

  it('réagit à une action unique (backward compat)', async () => {
    const { source, target } = makeStores()
    const handler = vi.fn()

    on(source.increment, handler)
    await source.increment()

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'increment', status: 'success' })
    )
  })

  it('réagit à un tableau de plusieurs actions', async () => {
    const { source } = makeStores()
    const handler = vi.fn()

    on([source.increment, source.decrement, source.reset], handler)

    await source.increment()
    await source.decrement()
    await source.reset()

    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('le handler reçoit le bon event.name pour chaque action', async () => {
    const { source } = makeStores()
    const names: string[] = []

    on([source.increment, source.decrement], (_store, event) => {
      names.push(event.name)
    })

    await source.increment()
    await source.decrement()

    expect(names).toEqual(['increment', 'decrement'])
  })

  it('retourne une fonction de désabonnement qui annule toutes les actions', async () => {
    const { source } = makeStores()
    const handler = vi.fn()

    const unsub = on([source.increment, source.decrement], handler)

    await source.increment()  // déclenche
    unsub()
    await source.increment()  // ne déclenche plus
    await source.decrement()  // ne déclenche plus

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('event.status est "success" pour une action qui réussit', async () => {
    const { source } = makeStores()
    let capturedStatus = ''

    on(source.increment, (_store, event) => {
      capturedStatus = event.status
    })

    await source.increment()
    expect(capturedStatus).toBe('success')
  })

  it('event.status est "error" pour une action qui échoue', async () => {
    const storeWithError = createStore({
      x: 0,
      actions: {
        fail: async (_s: any) => { throw new Error('boom') }
      }
    })
    let capturedStatus = ''
    let capturedError: Error | undefined

    on(storeWithError.fail, (_store, event) => {
      capturedStatus = event.status
      capturedError  = event.error
    })

    await storeWithError.fail().catch(() => {})

    expect(capturedStatus).toBe('error')
    expect(capturedError?.message).toBe('boom')
  })

  it('les erreurs dans le handler on() ne font pas crasher le store', async () => {
    const { source } = makeStores()

    on(source.increment, () => { throw new Error('handler crash') })

    // Ne doit pas rejeter
    await expect(source.increment()).resolves.toBeUndefined()
  })
})
