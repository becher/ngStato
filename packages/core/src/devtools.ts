// ─────────────────────────────────────────────────────
// @ngstato/core — DevTools
// Time-travel, action replay, state export/import
// ─────────────────────────────────────────────────────

export interface ActionLog {
  id:        number
  name:      string
  storeName: string
  args:      unknown[]
  duration:  number
  status:    'success' | 'error'
  error?:    string
  prevState: Record<string, unknown>
  nextState: Record<string, unknown>
  at:        string
}

export interface DevToolsState {
  logs:         ActionLog[]
  isOpen:       boolean
  maxLogs:      number
  activeLogId:  number | null    // null = "live" mode
  isTimeTraveling: boolean
}

export interface DevToolsSnapshot {
  version:   number
  timestamp: string
  stores:    Record<string, unknown>
  logs:      ActionLog[]
}

export interface DevToolsInstance {
  state:       DevToolsState
  logAction:   (log: Omit<ActionLog, 'id' | 'at'>) => void
  clear:       () => void
  open:        () => void
  close:       () => void
  toggle:      () => void
  subscribe:   (cb: (state: DevToolsState) => void) => () => void

  // Time-travel
  travelTo:    (logId: number) => void
  undo:        () => void
  redo:        () => void
  resume:      () => void
  replay:      (logId: number) => void

  // State export/import
  exportSnapshot: () => DevToolsSnapshot
  importSnapshot: (snapshot: DevToolsSnapshot) => void

  // Store registry
  registerStore: (name: string, publicStore: any, internalStore: any) => void
  getStoreRegistry: () => Map<string, { store: any; internalStore: any }>
}

// ─────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────

export function createDevTools(maxLogs = 100): DevToolsInstance {
  let counter = 0

  const state: DevToolsState = {
    logs:            [],
    isOpen:          false,
    maxLogs,
    activeLogId:     null,
    isTimeTraveling: false
  }

  const listeners = new Set<(state: DevToolsState) => void>()
  const storeRegistry = new Map<string, { store: any; internalStore: any }>()

  function notify() {
    const snapshot: DevToolsState = {
      ...state,
      logs: [...state.logs]
    }
    listeners.forEach(cb => cb(snapshot))
  }

  function findLogIndex(logId: number): number {
    return state.logs.findIndex(l => l.id === logId)
  }

  function getStoreForTravel(storeName: string) {
    const entry = storeRegistry.get(storeName)
    if (!entry) return null
    return entry.internalStore
  }

  return {
    state,

    // ── Action logging ─────────────────────────────────
    logAction(log) {
      const entry: ActionLog = {
        ...log,
        id: ++counter,
        at: new Date().toISOString()
      }

      // Fork: if time-traveling and a new action arrives, truncate future
      if (state.isTimeTraveling && state.activeLogId !== null) {
        const activeIdx = findLogIndex(state.activeLogId)
        if (activeIdx >= 0) {
          // logs are newest-first, so truncate everything before activeIdx
          state.logs = state.logs.slice(activeIdx)
        }
        state.activeLogId = null
        state.isTimeTraveling = false
      }

      state.logs = [entry, ...state.logs].slice(0, maxLogs)
      notify()
    },

    // ── Travel to a specific action ─────────────────────
    travelTo(logId: number) {
      const idx = findLogIndex(logId)
      if (idx === -1) return

      const log = state.logs[idx]
      const internalStore = getStoreForTravel(log.storeName)
      if (!internalStore) return

      // Restore that action's resulting state
      internalStore.hydrateForTimeTravel(log.nextState)

      state.activeLogId = logId
      state.isTimeTraveling = true
      notify()
    },

    // ── Undo — step back in time ───────────────────────
    // activeLogId always points to the log whose nextState is currently displayed.
    // Logs are newest-first: [idx0=newest, idx1, ..., idxN=oldest]
    // Undo moves deeper (higher index = older). Redo moves shallower (lower index = newer).
    undo() {
      if (!state.logs.length) return

      if (!state.isTimeTraveling || state.activeLogId === null) {
        // First undo: show the latest log's prevState
        // This is equivalent to "un-doing the last action"
        const latest = state.logs[0]
        const internalStore = getStoreForTravel(latest.storeName)
        if (!internalStore) return

        // If there's a log after this one, show that log's nextState
        // Otherwise show latest's prevState (initial state)
        if (state.logs.length > 1) {
          const olderLog = state.logs[1]
          internalStore.hydrateForTimeTravel(olderLog.nextState)
          state.activeLogId = olderLog.id
        } else {
          internalStore.hydrateForTimeTravel(latest.prevState)
          state.activeLogId = -1  // before all actions
        }
        state.isTimeTraveling = true
        notify()
        return
      }

      // Already time-traveling — go one step deeper
      if (state.activeLogId === -1) return // already at the very beginning

      const currentIdx = findLogIndex(state.activeLogId)
      if (currentIdx === -1) return

      const targetIdx = currentIdx + 1
      if (targetIdx >= state.logs.length) {
        // Go before all actions
        const currentLog = state.logs[currentIdx]
        const internalStore = getStoreForTravel(currentLog.storeName)
        if (!internalStore) return
        internalStore.hydrateForTimeTravel(currentLog.prevState)
        state.activeLogId = -1
        notify()
        return
      }

      const targetLog = state.logs[targetIdx]
      const internalStore = getStoreForTravel(targetLog.storeName)
      if (!internalStore) return

      internalStore.hydrateForTimeTravel(targetLog.nextState)
      state.activeLogId = targetLog.id
      notify()
    },

    // ── Redo — step forward in time ─────────────────────
    redo() {
      if (!state.isTimeTraveling || state.activeLogId === null) return

      if (state.activeLogId === -1) {
        // Was before all actions — go to the oldest action's nextState
        if (!state.logs.length) return
        const oldest = state.logs[state.logs.length - 1]
        const internalStore = getStoreForTravel(oldest.storeName)
        if (!internalStore) return

        internalStore.hydrateForTimeTravel(oldest.nextState)
        state.activeLogId = oldest.id
        notify()
        return
      }

      const currentIdx = findLogIndex(state.activeLogId)
      if (currentIdx === -1) return

      // Move to newer action (lower index)
      const targetIdx = currentIdx - 1
      if (targetIdx <= 0) {
        // Back to live mode (newest action's nextState)
        this.resume()
        return
      }

      const targetLog = state.logs[targetIdx]
      const internalStore = getStoreForTravel(targetLog.storeName)
      if (!internalStore) return

      internalStore.hydrateForTimeTravel(targetLog.nextState)
      state.activeLogId = targetLog.id
      notify()
    },

    // ── Resume — back to live state ─────────────────────
    resume() {
      if (!state.isTimeTraveling) return

      // Restore the latest state (newest log's nextState)
      if (state.logs.length) {
        const latest = state.logs[0]
        const internalStore = getStoreForTravel(latest.storeName)
        if (internalStore) {
          internalStore.hydrateForTimeTravel(latest.nextState)
        }
      }

      state.activeLogId = null
      state.isTimeTraveling = false
      notify()
    },

    // ── Replay — re-execute an action ───────────────────
    replay(logId: number) {
      const idx = findLogIndex(logId)
      if (idx === -1) return

      const log = state.logs[idx]
      const entry = storeRegistry.get(log.storeName)
      if (!entry) return

      // Extract the raw action name (remove "[StoreName] " prefix)
      const rawName = log.name.replace(/^\[.*?\]\s*/, '')

      // Resume live state first
      if (state.isTimeTraveling) {
        this.resume()
      }

      // Re-dispatch the action
      const publicStore = entry.store
      if (typeof publicStore[rawName] === 'function') {
        void publicStore[rawName](...log.args)
      }
    },

    // ── Export snapshot ──────────────────────────────────
    exportSnapshot(): DevToolsSnapshot {
      const stores: Record<string, unknown> = {}
      for (const [name, { store }] of storeRegistry) {
        stores[name] = store.getState()
      }

      return {
        version:   1,
        timestamp: new Date().toISOString(),
        stores,
        logs: [...state.logs]
      }
    },

    // ── Import snapshot ─────────────────────────────────
    importSnapshot(snapshot: DevToolsSnapshot) {
      if (!snapshot || snapshot.version !== 1) return

      // Restore each store's state
      for (const [name, storeState] of Object.entries(snapshot.stores)) {
        const entry = storeRegistry.get(name)
        if (entry) {
          entry.internalStore.hydrateForTimeTravel(storeState)
        }
      }

      // Restore logs
      state.logs = snapshot.logs
      state.activeLogId = null
      state.isTimeTraveling = false
      notify()
    },

    // ── Basic controls ──────────────────────────────────
    clear() {
      if (state.isTimeTraveling) {
        this.resume()
      }
      state.logs = []
      notify()
    },

    open() {
      state.isOpen = true
      notify()
    },

    close() {
      state.isOpen = false
      notify()
    },

    toggle() {
      state.isOpen = !state.isOpen
      notify()
    },

    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    // ── Store registry ──────────────────────────────────
    registerStore(name, publicStore, internalStore) {
      storeRegistry.set(name, { store: publicStore, internalStore })
    },

    getStoreRegistry() {
      return storeRegistry
    }
  }
}

// ─────────────────────────────────────────────────────
// INSTANCE GLOBALE — singleton partagé entre tous les stores
// Uses globalThis to survive across multiple bundle copies
// ─────────────────────────────────────────────────────

const DEVTOOLS_KEY = '__NGSTATO_DEVTOOLS__'
export const devTools: DevToolsInstance =
  (globalThis as any)[DEVTOOLS_KEY] ??
  ((globalThis as any)[DEVTOOLS_KEY] = createDevTools())

// ─────────────────────────────────────────────────────
// PLUGIN — connecte un store aux DevTools
// ─────────────────────────────────────────────────────

export function connectDevTools(store: any, storeName: string) {
  if (!devTools) return

  let prevState: any = {}

  // Accès aux hooks via __store__
  const internalStore = store.__store__

  if (!internalStore) return

  const wasRegistered = devTools.getStoreRegistry().has(storeName)

  // Register in store registry for time-travel
  devTools.registerStore(storeName, store, internalStore)

  // Sauvegarder les hooks existants
  const hooksObj = internalStore['_hooks']
  const existingOnAction      = hooksObj.onAction
  const existingOnActionDone  = hooksObj.onActionDone
  const existingOnError       = hooksObj.onError

  // Mutate the hooks IN-PLACE so the store's internal this._hooks reference sees the change
  hooksObj.onAction = (name: string, args: unknown[]) => {
    prevState = store.getState()
    existingOnAction?.(name, args)
  }

  hooksObj.onActionDone = (name: string, duration: number) => {
    const nextState = store.getState()
    devTools.logAction({
      name:      `[${storeName}] ${name}`,
      storeName,
      args:      [],
      duration,
      status:    'success',
      prevState: { ...prevState },
      nextState: { ...nextState }
    })
    existingOnActionDone?.(name, duration)
  }

  hooksObj.onError = (error: Error, actionName: string) => {
    devTools.logAction({
      name:      `[${storeName}] ${actionName}`,
      storeName,
      args:      [],
      duration:  0,
      status:    'error',
      error:     error.message,
      prevState: { ...prevState },
      nextState: { ...prevState }
    })
    existingOnError?.(error, actionName)
  }

  // Log an initial snapshot so the DevTools UI isn't empty before the first action.
  // This also helps in environments where actions are not triggered immediately.
  if (!wasRegistered) {
    try {
      const nextState = store.getState()
      devTools.logAction({
        name:      `[${storeName}] @@INIT`,
        storeName,
        args:      [],
        duration:  0,
        status:    'success',
        prevState: {},
        nextState: { ...nextState }
      })
    } catch {
      // ignore
    }
  }
}