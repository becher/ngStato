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
export { withPersist }                          from './helpers/with-persist'

// Types
export type {
  StatoStoreConfig,
  StatoStoreInstance,
  StatoConfig,
  StatoHooks,
  EffectEntry,
  EffectDepsFn,
  EffectRunner
}                                               from './types'
export type { PersistOptions, PersistStorage } from './helpers/with-persist'
export { StatoHttpError }                       from './types'

export { devTools, createDevTools, connectDevTools } from './devtools'
export type { ActionLog, DevToolsState, DevToolsInstance } from './devtools'