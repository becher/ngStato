import { describe, it, expect } from 'vitest'
import { createStore } from '../../store'
import { withProps } from '../with-props'

describe('withProps()', () => {
  it('should attach read-only props to the store', () => {
    const store = createStore({
      count: 0,
      actions: { inc(s) { s.count++ } }
    })

    const enhanced = withProps(store, {
      storeName: 'Counter',
      version: '1.0.0'
    })

    expect(enhanced.storeName).toBe('Counter')
    expect(enhanced.version).toBe('1.0.0')
    expect(enhanced.count).toBe(0)
  })

  it('should preserve store functionality', async () => {
    const store = createStore({
      count: 0,
      actions: { inc(s) { s.count++ } }
    })

    const enhanced = withProps(store, { label: 'test' })

    await enhanced.inc()
    expect(enhanced.count).toBe(1)
    expect(enhanced.label).toBe('test')
  })

  it('should make props read-only', () => {
    const store = createStore({ count: 0 })
    const enhanced = withProps(store, { name: 'myStore' }) as any

    expect(() => { enhanced.name = 'changed' }).toThrow()
  })

  it('should work with object props (services)', () => {
    const mockService = {
      getUsers: () => Promise.resolve([{ id: 1 }]),
      baseUrl: 'https://api.example.com'
    }

    const store = createStore({
      users: [] as { id: number }[],
      actions: {
        async loadUsers(s) {
          s.users = await mockService.getUsers()
        }
      }
    })

    const enhanced = withProps(store, { api: mockService })
    expect(enhanced.api.baseUrl).toBe('https://api.example.com')
    expect(typeof enhanced.api.getUsers).toBe('function')
  })

  it('should not add props to state', () => {
    const store = createStore({ count: 0 })
    const enhanced = withProps(store, { debug: true })

    const state = enhanced.getState()
    expect(state).toEqual({ count: 0 })
    expect((state as any).debug).toBeUndefined()
  })

  it('should work with multiple props calls (composition)', () => {
    const store = createStore({ count: 0 })
    const step1 = withProps(store, { name: 'counter' })
    const step2 = withProps(step1, { version: 2 })

    expect(step2.name).toBe('counter')
    expect(step2.version).toBe(2)
    expect(step2.count).toBe(0)
  })
})
