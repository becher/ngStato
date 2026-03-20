// ─────────────────────────────────────────────────────
// TYPES PUBLICS DE @ngstato/core
// ─────────────────────────────────────────────────────

// Le state de base — tout sauf actions, computed, hooks
export type StateSlice<T> = Omit<T, 'actions' | 'computed' | 'hooks'>

// Une action — sync ou async
export type Action<S> = (state: S, ...args: any[]) => void | Promise<void> | (() => void)

// Map d'actions
export type ActionsMap<S> = Record<string, Action<S>>

// Computed — dérivé du state local
export type ComputedFn<S> = (state: S) => unknown

// Hooks lifecycle
export interface StatoHooks<S> {
  // Lifecycle du store
  onInit?:         (store: S) => void | Promise<void>
  onDestroy?:      (store: S) => void | Promise<void>

  // Lifecycle des actions
  onAction?:       (name: string, args: unknown[]) => void
  onActionDone?:   (name: string, duration: number) => void
  onError?:        (error: Error, actionName: string) => void

  // Lifecycle du state
  onStateChange?:  (prev: S, next: S) => void
}

// Configuration du store
export interface StatoStoreConfig<S extends object> {
  actions?:  ActionsMap<StateSlice<S>>
  computed?: Record<string, ComputedFn<StateSlice<S>> | unknown[]>
  hooks?:    StatoHooks<any>
  [key: string]: unknown
}

// Instance publique du store
export type StatoStoreInstance<S extends object> = {
  // readonly — on ne peut lire, jamais écrire directement
  readonly [K in keyof StateSlice<S>]: StateSlice<S>[K]
} & {
  // Les actions sont exposées sans le paramètre state
  [K in keyof S as S[K] extends Function ? K : never]:
    S[K] extends (state: any, ...args: infer A) => infer R
      ? (...args: A) => R
      : never
}

// Configuration du client HTTP
export interface StatoConfig {
  baseUrl?: string
  timeout?: number
  headers?: Record<string, string>
  auth?:    () => string | null | undefined
}

// Erreur HTTP
export class StatoHttpError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`HTTP ${status}: ${body}`)
    this.name = 'StatoHttpError'
  }
}