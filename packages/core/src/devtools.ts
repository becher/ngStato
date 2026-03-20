// ─────────────────────────────────────────────────────
// @ngstato/core — DevTools
// Logique pure — pas de dépendance Angular
// ─────────────────────────────────────────────────────

export interface ActionLog {
  id:        number
  name:      string
  args:      unknown[]
  duration:  number
  status:    'success' | 'error'
  error?:    string
  prevState: unknown
  nextState: unknown
  at:        string
}

export interface DevToolsState {
  logs:      ActionLog[]
  isOpen:    boolean
  maxLogs:   number
}

export interface DevToolsInstance {
  state:       DevToolsState
  logAction:   (log: Omit<ActionLog, 'id' | 'at'>) => void
  clear:       () => void
  open:        () => void
  close:       () => void
  toggle:      () => void
  subscribe:   (cb: (state: DevToolsState) => void) => () => void
}

// ─────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────

export function createDevTools(maxLogs = 50): DevToolsInstance {
  let counter = 0

  const state: DevToolsState = {
    logs:    [],
    isOpen:  false,
    maxLogs
  }

  const listeners = new Set<(state: DevToolsState) => void>()

  function notify() {
    listeners.forEach(cb => cb({ ...state, logs: [...state.logs] }))
  }

  return {
    state,

    logAction(log) {
      const entry: ActionLog = {
        ...log,
        id: ++counter,
        at: new Date().toISOString()
      }

      state.logs = [entry, ...state.logs].slice(0, maxLogs)
      notify()
    },

    clear() {
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
    }
  }
}

// ─────────────────────────────────────────────────────
// INSTANCE GLOBALE — singleton partagé entre tous les stores
// ─────────────────────────────────────────────────────

export const devTools = createDevTools()

// ─────────────────────────────────────────────────────
// PLUGIN — connecte un store aux DevTools
// ─────────────────────────────────────────────────────

export function connectDevTools(store: any, storeName: string) {
  if (!devTools) return

  let prevState: any = {}

  // Accès aux hooks via __store__
  const internalStore = store.__store__

  if (!internalStore) return

  // Sauvegarder les hooks existants
  const existingHooks = { ...internalStore['_hooks'] }

  // Remplacer les hooks
  internalStore['_hooks'] = {
    ...existingHooks,

    onAction(name: string, args: unknown[]) {
      prevState = store.getState()
      existingHooks.onAction?.(name, args)
    },

    onActionDone(name: string, duration: number) {
      const nextState = store.getState()
      devTools.logAction({
        name:      `[${storeName}] ${name}`,
        args:      [],
        duration,
        status:    'success',
        prevState: { ...prevState },
        nextState: { ...nextState }
      })
      existingHooks.onActionDone?.(name, duration)
    },

    onError(error: Error, actionName: string) {
      devTools.logAction({
        name:      `[${storeName}] ${actionName}`,
        args:      [],
        duration:  0,
        status:    'error',
        error:     error.message,
        prevState: { ...prevState },
        nextState: { ...prevState }
      })
      existingHooks.onError?.(error, actionName)
    },

    onStateChange: existingHooks.onStateChange
  }
}