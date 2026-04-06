// ─────────────────────────────────────────────────────
// @ngstato/core — API publique complète
// ─────────────────────────────────────────────────────

// Store
export { createStore }                          from './store'
export { on }                                  from './store'
export type { OnEvent }                         from './store'

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
export { exclusive }                           from './helpers/exclusive'
export { queued }                               from './helpers/queued'
export { distinctUntilChanged }                 from './helpers/distinct-until-changed'
export { forkJoin }                             from './helpers/fork-join'
export { race }                                 from './helpers/race'
export { combineLatest }                        from './helpers/combine-latest'
export { combineLatestStream }                  from './helpers/combine-latest-stream'
export { createEntityAdapter }                  from './helpers/entity-adapter'
export { withEntities }                         from './helpers/with-entities'
export {
  pipeStream,
  mapStream,
  filterStream,
  distinctUntilChangedStream,
  debounceStream,
  throttleStream,
  switchMapStream,
  concatMapStream,
  exhaustMapStream,
  mergeMapStream,
  catchErrorStream,
  retryStream
}                                               from './helpers/stream-operators'
export { withPersist }                          from './helpers/with-persist'
export { mergeFeatures }                        from './helpers/with-feature'
export { withProps }                            from './helpers/with-props'
export type { FeatureConfig, MergedFeature }    from './helpers/with-feature'
export type { EntityId, EntityState, Update, EntityAdapterOptions } from './helpers/entity-adapter'
export type { WithEntitiesOptions }             from './helpers/with-entities'

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
export type { ActionLog, DevToolsState, DevToolsInstance, DevToolsSnapshot } from './devtools'