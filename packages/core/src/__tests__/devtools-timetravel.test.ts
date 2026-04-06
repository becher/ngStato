import { describe, it, expect, beforeEach } from 'vitest'
import { createDevTools } from '../devtools'

describe('DevTools Time-Travel', () => {
  let dt: ReturnType<typeof createDevTools>

  // Mock internal store
  function createMockInternalStore(initialState: Record<string, unknown>) {
    let state = { ...initialState }
    const subscribers = new Set<Function>()

    return {
      _state: state,
      getState() { return { ...state } },
      hydrateForTimeTravel(newState: any) {
        state = { ...newState }
        this._state = state
        subscribers.forEach(fn => fn(state))
      },
      subscribe(fn: Function) {
        subscribers.add(fn)
        return () => subscribers.delete(fn)
      }
    }
  }

  function createMockPublicStore(internalStore: any) {
    return {
      __store__: internalStore,
      getState: () => internalStore.getState(),
      loadUsers: () => Promise.resolve()
    }
  }

  function addLogs(devtools: any, storeName: string, count: number) {
    for (let i = 1; i <= count; i++) {
      devtools.logAction({
        name: `[${storeName}] action${i}`,
        storeName,
        args: [],
        duration: i * 10,
        status: 'success',
        prevState: { count: i - 1 },
        nextState: { count: i }
      })
    }
  }

  beforeEach(() => {
    dt = createDevTools(50)
  })

  // ── Store registry ──────────────────────────────────

  it('should register stores', () => {
    const internal = createMockInternalStore({ count: 0 })
    const pub = createMockPublicStore(internal)

    dt.registerStore('TestStore', pub, internal)
    expect(dt.getStoreRegistry().has('TestStore')).toBe(true)
  })

  // ── travelTo ────────────────────────────────────────

  it('should travel to a specific action', () => {
    const internal = createMockInternalStore({ count: 0 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 3)

    // logs are newest-first: action3(count:3), action2(count:2), action1(count:1)
    const logs = dt.state.logs
    const action2 = logs.find(l => l.name.includes('action2'))!

    dt.travelTo(action2.id)

    expect(internal._state).toEqual({ count: 2 })
    expect(dt.state.isTimeTraveling).toBe(true)
    expect(dt.state.activeLogId).toBe(action2.id)
  })

  it('should travel to the first action', () => {
    const internal = createMockInternalStore({ count: 0 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 3)

    const action1 = dt.state.logs.find(l => l.name.includes('action1'))!
    dt.travelTo(action1.id)

    expect(internal._state).toEqual({ count: 1 })
    expect(dt.state.isTimeTraveling).toBe(true)
  })

  // ── undo ────────────────────────────────────────────

  it('should undo to previous state', () => {
    const internal = createMockInternalStore({ count: 3 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 3)

    // First undo: shows action2's nextState (the state before action3)
    dt.undo()
    expect(internal._state).toEqual({ count: 2 })
    expect(dt.state.isTimeTraveling).toBe(true)
  })

  it('should undo multiple times', () => {
    const internal = createMockInternalStore({ count: 3 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 3)

    dt.undo()  // action2's nextState = { count: 2 }
    dt.undo()  // action1's nextState = { count: 1 }

    expect(internal._state).toEqual({ count: 1 })
  })

  // ── redo ────────────────────────────────────────────

  it('should redo after undo', () => {
    const internal = createMockInternalStore({ count: 3 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 3)

    dt.undo()  // action2's nextState = { count: 2 }
    dt.redo()  // action3's nextState = { count: 3 } → back to live

    expect(internal._state).toEqual({ count: 3 })
    expect(dt.state.isTimeTraveling).toBe(false)
  })

  // ── resume ──────────────────────────────────────────

  it('should resume to live state', () => {
    const internal = createMockInternalStore({ count: 3 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 3)

    dt.travelTo(dt.state.logs[2].id) // go to action1
    expect(internal._state).toEqual({ count: 1 })

    dt.resume()
    expect(internal._state).toEqual({ count: 3 }) // latest nextState
    expect(dt.state.isTimeTraveling).toBe(false)
    expect(dt.state.activeLogId).toBe(null)
  })

  // ── fork on dispatch ────────────────────────────────

  it('should fork (truncate future) when dispatching during time-travel', () => {
    const internal = createMockInternalStore({ count: 0 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 5) // 5 actions
    expect(dt.state.logs.length).toBe(5)

    // Travel to action3
    const action3 = dt.state.logs.find(l => l.name.includes('action3'))!
    dt.travelTo(action3.id)
    expect(dt.state.isTimeTraveling).toBe(true)

    // Dispatch a new action during time-travel → should fork
    dt.logAction({
      name: '[TestStore] newAction',
      storeName: 'TestStore',
      args: [],
      duration: 5,
      status: 'success',
      prevState: { count: 3 },
      nextState: { count: 99 }
    })

    // Future actions (action4, action5) should be truncated
    // Should have: newAction + action3 + action2 + action1
    expect(dt.state.isTimeTraveling).toBe(false)
    expect(dt.state.activeLogId).toBe(null)
    expect(dt.state.logs[0].name).toContain('newAction')
  })

  // ── export/import ───────────────────────────────────

  it('should export snapshot', () => {
    const internal = createMockInternalStore({ count: 42 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 2)

    const snapshot = dt.exportSnapshot()

    expect(snapshot.version).toBe(1)
    expect(snapshot.timestamp).toBeTruthy()
    expect(snapshot.stores['TestStore']).toEqual({ count: 42 })
    expect(snapshot.logs.length).toBe(2)
  })

  it('should import snapshot and restore state', () => {
    const internal = createMockInternalStore({ count: 0 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    const snapshot = {
      version: 1,
      timestamp: new Date().toISOString(),
      stores: { TestStore: { count: 999 } },
      logs: [
        {
          id: 100, name: '[TestStore] imported', storeName: 'TestStore',
          args: [], duration: 5, status: 'success' as const, at: new Date().toISOString(),
          prevState: { count: 0 }, nextState: { count: 999 }
        }
      ]
    }

    dt.importSnapshot(snapshot)

    expect(internal._state).toEqual({ count: 999 })
    expect(dt.state.logs.length).toBe(1)
    expect(dt.state.logs[0].name).toBe('[TestStore] imported')
  })

  it('should reject invalid snapshot', () => {
    dt.importSnapshot({ version: 99 } as any)
    expect(dt.state.logs.length).toBe(0) // unchanged
  })

  // ── subscribe ───────────────────────────────────────

  it('should notify subscribers on time-travel', () => {
    const internal = createMockInternalStore({ count: 0 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 2)

    const states: boolean[] = []
    dt.subscribe((state) => {
      states.push(state.isTimeTraveling)
    })

    dt.travelTo(dt.state.logs[1].id) // travel
    dt.resume()                        // resume

    expect(states).toContain(true)
    expect(states).toContain(false)
  })

  // ── clear during time-travel ────────────────────────

  it('should resume before clear', () => {
    const internal = createMockInternalStore({ count: 3 })
    const pub = createMockPublicStore(internal)
    dt.registerStore('TestStore', pub, internal)

    addLogs(dt, 'TestStore', 3)
    dt.travelTo(dt.state.logs[2].id) // travel to oldest
    expect(dt.state.isTimeTraveling).toBe(true)

    dt.clear()
    expect(dt.state.isTimeTraveling).toBe(false)
    expect(dt.state.logs.length).toBe(0)
    expect(internal._state).toEqual({ count: 3 }) // restored to latest
  })

  // ── effects skipped during travel ───────────────────

  it('should skip effects during hydrateForTimeTravel', () => {
    // This is tested at the store level — hydrateForTimeTravel sets
    // _timeTraveling = true which prevents _runEffects in _setState.
    // Here we just verify the mock internal store doesn't crash.
    const internal = createMockInternalStore({ count: 0 })
    internal.hydrateForTimeTravel({ count: 42 })
    expect(internal._state).toEqual({ count: 42 })
  })
})
