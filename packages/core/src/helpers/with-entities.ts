import type { StatoStoreConfig, ActionsMap } from '../types'
import type {
  EntityId,
  EntityState,
  Update
} from './entity-adapter'

type EntityAdapter<T> = {
  getInitialState: <E extends object = {}>(extra?: E) => EntityState<T> & E
  addOne: (entity: T, state: EntityState<T>) => void
  addMany: (entities: T[], state: EntityState<T>) => void
  setAll: (entities: T[], state: EntityState<T>) => void
  upsertOne: (entity: T, state: EntityState<T>) => void
  upsertMany: (entities: T[], state: EntityState<T>) => void
  updateOne: (update: Update<T>, state: EntityState<T>) => void
  removeOne: (id: EntityId, state: EntityState<T>) => void
  removeMany: (ids: EntityId[], state: EntityState<T>) => void
  removeAll: (state: EntityState<T>) => void
  getSelectors: <S = EntityState<T>>(
    selectState?: (state: S) => EntityState<T>
  ) => {
    selectIds: (state: S | EntityState<T>) => EntityId[]
    selectEntities: (state: S | EntityState<T>) => Record<string, T>
    selectAll: (state: S | EntityState<T>) => T[]
    selectTotal: (state: S | EntityState<T>) => number
    selectById: (state: S | EntityState<T>, id: EntityId) => T | undefined
  }
}

export type WithEntitiesSelectorsNames = Partial<{
  ids: string
  entities: string
  all: string
  total: string
  byId: string
}>

export type WithEntitiesActionsNames = Partial<{
  addOne: string
  addMany: string
  setAll: string
  upsertOne: string
  upsertMany: string
  updateOne: string
  removeOne: string
  removeMany: string
  removeAll: string
}>

export type WithEntitiesOptions<T> = {
  key: string
  adapter: EntityAdapter<T>
  initial?: T[]
  selectors?: WithEntitiesSelectorsNames
  actions?: WithEntitiesActionsNames
}

function cloneEntityState<T>(state: EntityState<T>): EntityState<T> {
  return {
    ids: [...state.ids],
    entities: { ...state.entities }
  }
}

export function withEntities<S extends object, T>(
  config: S & StatoStoreConfig<S>,
  options: WithEntitiesOptions<T>
): S & StatoStoreConfig<S> {
  const { key, adapter, initial } = options

  const initialSlice = adapter.getInitialState()
  if (initial?.length) {
    adapter.setAll(initial, initialSlice)
  }

  const baseSelectors = config.selectors ?? {}
  const baseActions = config.actions ?? {}

  const scopedSelectors = adapter.getSelectors<any>((s) => (s as any)[key])

  const selectorNames: Required<WithEntitiesSelectorsNames> = {
    ids: options.selectors?.ids ?? `${key}Ids`,
    entities: options.selectors?.entities ?? `${key}Entities`,
    all: options.selectors?.all ?? `${key}All`,
    total: options.selectors?.total ?? `${key}Total`,
    byId: options.selectors?.byId ?? `${key}ById`
  }

  const actionNames: Required<WithEntitiesActionsNames> = {
    addOne: options.actions?.addOne ?? `${key}AddOne`,
    addMany: options.actions?.addMany ?? `${key}AddMany`,
    setAll: options.actions?.setAll ?? `${key}SetAll`,
    upsertOne: options.actions?.upsertOne ?? `${key}UpsertOne`,
    upsertMany: options.actions?.upsertMany ?? `${key}UpsertMany`,
    updateOne: options.actions?.updateOne ?? `${key}UpdateOne`,
    removeOne: options.actions?.removeOne ?? `${key}RemoveOne`,
    removeMany: options.actions?.removeMany ?? `${key}RemoveMany`,
    removeAll: options.actions?.removeAll ?? `${key}RemoveAll`
  }

  // Note: `selectors` dans le core autorise (fn | unknown[]), donc on garde
  // le type large pour rester compatible DTS/build.
  const nextSelectors: NonNullable<StatoStoreConfig<any>['selectors']> = {
    ...(baseSelectors as any),
    [selectorNames.ids]: (state: any) => scopedSelectors.selectIds(state),
    [selectorNames.entities]: (state: any) => scopedSelectors.selectEntities(state),
    [selectorNames.all]: (state: any) => scopedSelectors.selectAll(state),
    [selectorNames.total]: (state: any) => scopedSelectors.selectTotal(state),
    [selectorNames.byId]: (state: any) => (id: EntityId) => scopedSelectors.selectById(state, id)
  }

  const nextActions: ActionsMap<any> = {
    ...baseActions,
    [actionNames.addOne]: (state: any, entity: T) => {
      const prev = (state as any)[key] as EntityState<T>
      const next = cloneEntityState(prev)
      adapter.addOne(entity, next)
      ;(state as any)[key] = next
    },
    [actionNames.addMany]: (state: any, entities: T[]) => {
      const prev = (state as any)[key] as EntityState<T>
      const next = cloneEntityState(prev)
      adapter.addMany(entities, next)
      ;(state as any)[key] = next
    },
    [actionNames.setAll]: (state: any, entities: T[]) => {
      const next = adapter.getInitialState()
      adapter.setAll(entities, next)
      ;(state as any)[key] = next
    },
    [actionNames.upsertOne]: (state: any, entity: T) => {
      const prev = (state as any)[key] as EntityState<T>
      const next = cloneEntityState(prev)
      adapter.upsertOne(entity, next)
      ;(state as any)[key] = next
    },
    [actionNames.upsertMany]: (state: any, entities: T[]) => {
      const prev = (state as any)[key] as EntityState<T>
      const next = cloneEntityState(prev)
      adapter.upsertMany(entities, next)
      ;(state as any)[key] = next
    },
    [actionNames.updateOne]: (state: any, update: Update<T>) => {
      const prev = (state as any)[key] as EntityState<T>
      const next = cloneEntityState(prev)
      adapter.updateOne(update, next)
      ;(state as any)[key] = next
    },
    [actionNames.removeOne]: (state: any, id: EntityId) => {
      const prev = (state as any)[key] as EntityState<T>
      const next = cloneEntityState(prev)
      adapter.removeOne(id, next)
      ;(state as any)[key] = next
    },
    [actionNames.removeMany]: (state: any, ids: EntityId[]) => {
      const prev = (state as any)[key] as EntityState<T>
      const next = cloneEntityState(prev)
      adapter.removeMany(ids, next)
      ;(state as any)[key] = next
    },
    [actionNames.removeAll]: (state: any) => {
      ;(state as any)[key] = adapter.getInitialState()
    }
  }

  return {
    ...(config as any),
    [key]: (config as any)[key] ?? initialSlice,
    actions: nextActions,
    selectors: nextSelectors
  }
}

