// ─────────────────────────────────────────────────────
// @ngstato/core — API publique complète
// ─────────────────────────────────────────────────────

// Store
export { createStore }                          from './store'

// HTTP
export { StatoHttp, createHttp, configureHttp, http } from './http'
export type { RequestOptions }                  from './http'

// Helpers
export { abortable }                            from './helpers/abortable'
export { debounced }                            from './helpers/debounced'
export { throttled }                            from './helpers/throttled'
export { retryable }                            from './helpers/retryable'
export { fromStream }                           from './helpers/from-stream'
export { optimistic }                           from './helpers/optimistic'

// Types
export type {
  StatoStoreConfig,
  StatoStoreInstance,
  StatoConfig,
  StatoHooks
}                                               from './types'
export { StatoHttpError }                       from './types'

export { devTools, createDevTools, connectDevTools } from './devtools'
export type { ActionLog, DevToolsState, DevToolsInstance } from './devtools'