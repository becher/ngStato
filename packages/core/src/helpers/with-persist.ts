import type { StateSlice, StatoStoreConfig, StatoHooks } from '../types'

export interface PersistStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface PersistEnvelope<T> {
  v: number
  data: Partial<T>
}

export interface PersistOptions<S extends object> {
  key: string
  version?: number
  storage?: PersistStorage
  pick?: (keyof S)[]
  migrate?: (data: unknown, fromVersion: number) => Partial<S>
  onError?: (error: Error) => void
}

function resolveStorage(custom?: PersistStorage): PersistStorage | null {
  if (custom) return custom
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function pickState<S extends object>(state: Partial<S>, keys?: (keyof S)[]) {
  if (!keys?.length) return state
  const picked: Partial<S> = {}
  for (const key of keys) {
    picked[key] = state[key]
  }
  return picked
}

export function withPersist<S extends object>(
  config: S & StatoStoreConfig<S>,
  options: PersistOptions<StateSlice<S>>
): S & StatoStoreConfig<S> {
  const {
    key,
    version = 1,
    storage: customStorage,
    pick,
    migrate,
    onError
  } = options

  const storage = resolveStorage(customStorage)
  const userHooks = config.hooks ?? {}

  const mergedHooks: StatoHooks<any> = {
    ...userHooks,
    onInit(store: any) {
      try {
        if (!storage) return userHooks.onInit?.(store)
        const raw = storage.getItem(key)
        if (!raw) return userHooks.onInit?.(store)

        const parsed = JSON.parse(raw) as PersistEnvelope<StateSlice<S>>
        const data =
          parsed.v === version
            ? parsed.data
            : migrate
              ? migrate(parsed.data, parsed.v)
              : parsed.data

        if (data && typeof data === 'object') {
          store.__store__?.hydrate?.(data)
        }
      } catch (error) {
        onError?.(error as Error)
      }
      return userHooks.onInit?.(store)
    },

    onStateChange(prev: any, next: any) {
      try {
        if (storage) {
          const payload: PersistEnvelope<StateSlice<S>> = {
            v: version,
            data: pickState(next, pick as (keyof StateSlice<S>)[] | undefined)
          }
          storage.setItem(key, JSON.stringify(payload))
        }
      } catch (error) {
        onError?.(error as Error)
      }
      userHooks.onStateChange?.(prev, next)
    },

    onDestroy(store: any) {
      return userHooks.onDestroy?.(store)
    },
    onAction(name: string, args: unknown[]) {
      return userHooks.onAction?.(name, args)
    },
    onActionDone(name: string, duration: number) {
      return userHooks.onActionDone?.(name, duration)
    },
    onError(error: Error, actionName: string) {
      return userHooks.onError?.(error, actionName)
    }
  }

  return {
    ...config,
    hooks: mergedHooks
  }
}

