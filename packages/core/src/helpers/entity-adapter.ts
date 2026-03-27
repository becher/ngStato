// ─────────────────────────────────────────────────────
// @ngstato/core — createEntityAdapter()
// CRUD collections normalisees (style NgRx Entity, plus simple)
// ─────────────────────────────────────────────────────

export type EntityId = string | number

export interface EntityState<T> {
  ids: EntityId[]
  entities: Record<string, T>
}

export type Update<T> = {
  id: EntityId
  changes: Partial<T>
}

type SelectId<T> = (entity: T) => EntityId

export interface EntityAdapterOptions<T> {
  selectId?: SelectId<T>
  sortComparer?: (a: T, b: T) => number
}

function defaultSelectId<T extends { id: EntityId }>(entity: T): EntityId {
  return entity.id
}

function idKey(id: EntityId): string {
  return String(id)
}

function ensureSort<T>(
  state: EntityState<T>,
  sortComparer: ((a: T, b: T) => number) | undefined
) {
  if (!sortComparer) return
  state.ids.sort((a, b) => {
    const ea = state.entities[idKey(a)]
    const eb = state.entities[idKey(b)]
    if (!ea || !eb) return 0
    return sortComparer(ea, eb)
  })
}

export function createEntityAdapter<T extends Record<string, any>>(
  options: EntityAdapterOptions<T> = {}
) {
  const selectId = (options.selectId ??
    defaultSelectId) as SelectId<T>
  const sortComparer = options.sortComparer

  const getInitialState = <E extends object = {}>(extra?: E): EntityState<T> & E => {
    return {
      ids: [],
      entities: {},
      ...(extra ?? ({} as E))
    }
  }

  const addOne = (entity: T, state: EntityState<T>): void => {
    const id = selectId(entity)
    const key = idKey(id)
    if (state.entities[key]) return
    state.ids.push(id)
    state.entities[key] = entity
    ensureSort(state, sortComparer)
  }

  const addMany = (entities: T[], state: EntityState<T>): void => {
    for (const entity of entities) addOne(entity, state)
  }

  const setAll = (entities: T[], state: EntityState<T>): void => {
    state.ids = []
    state.entities = {}
    for (const entity of entities) {
      const id = selectId(entity)
      state.ids.push(id)
      state.entities[idKey(id)] = entity
    }
    ensureSort(state, sortComparer)
  }

  const upsertOne = (entity: T, state: EntityState<T>): void => {
    const id = selectId(entity)
    const key = idKey(id)
    const exists = !!state.entities[key]
    state.entities[key] = entity
    if (!exists) state.ids.push(id)
    ensureSort(state, sortComparer)
  }

  const upsertMany = (entities: T[], state: EntityState<T>): void => {
    for (const entity of entities) upsertOne(entity, state)
  }

  const updateOne = (update: Update<T>, state: EntityState<T>): void => {
    const key = idKey(update.id)
    const current = state.entities[key]
    if (!current) return
    state.entities[key] = { ...current, ...update.changes }
    ensureSort(state, sortComparer)
  }

  const removeOne = (id: EntityId, state: EntityState<T>): void => {
    const key = idKey(id)
    if (!state.entities[key]) return
    delete state.entities[key]
    state.ids = state.ids.filter((x) => !Object.is(x, id))
  }

  const removeMany = (ids: EntityId[], state: EntityState<T>): void => {
    const removeSet = new Set(ids.map(idKey))
    for (const key of Object.keys(state.entities)) {
      if (removeSet.has(key)) delete state.entities[key]
    }
    state.ids = state.ids.filter((id) => !removeSet.has(idKey(id)))
  }

  const removeAll = (state: EntityState<T>): void => {
    state.ids = []
    state.entities = {}
  }

  const getSelectors = <S = EntityState<T>>(
    selectState?: (state: S) => EntityState<T>
  ) => {
    const pick = (state: S | EntityState<T>) =>
      (selectState ? selectState(state as S) : (state as EntityState<T>))

    return {
      selectIds: (state: S | EntityState<T>) => pick(state).ids,
      selectEntities: (state: S | EntityState<T>) => pick(state).entities,
      selectAll: (state: S | EntityState<T>) => {
        const s = pick(state)
        return s.ids.map((id) => s.entities[idKey(id)]).filter(Boolean)
      },
      selectTotal: (state: S | EntityState<T>) => pick(state).ids.length,
      selectById: (state: S | EntityState<T>, id: EntityId) => pick(state).entities[idKey(id)]
    }
  }

  return {
    selectId,
    sortComparer,
    getInitialState,
    addOne,
    addMany,
    setAll,
    upsertOne,
    upsertMany,
    updateOne,
    removeOne,
    removeMany,
    removeAll,
    getSelectors
  }
}

