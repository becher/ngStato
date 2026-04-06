// ─────────────────────────────────────────────────────
// @ngstato/core — withProps()
// Attach read-only properties (services, configs) to the store
// ─────────────────────────────────────────────────────

/**
 * withProps() — Attach external properties to a store config.
 *
 * Properties are accessible on the store instance but NOT part of the state.
 * Use this to expose injected services on the store object.
 *
 * @example
 * ```ts
 * // Pattern 1: Expose services on the store
 * export const UsersStore = StatoStore(() => {
 *   const api     = inject(ApiService)
 *   const notifier = inject(NotificationService)
 *
 *   const store = createStore({
 *     users:   [] as User[],
 *     loading: false,
 *
 *     actions: {
 *       async loadUsers(state) {
 *         state.loading = true
 *         state.users = await api.getUsers()   // closure over injected service
 *         state.loading = false
 *       },
 *
 *       async deleteUser(state, id: string) {
 *         await api.deleteUser(id)
 *         state.users = state.users.filter(u => u.id !== id)
 *         notifier.success('User deleted')
 *       }
 *     }
 *   })
 *
 *   // Attach props to the store — accessible but not in state
 *   return withProps(store, { api, notifier })
 * })
 *
 * // In a component:
 * store = injectStore(UsersStore)
 * store.users()            // Signal<User[]>
 * store.loadUsers()        // action
 * store.api                // ApiService — read-only, not in state
 * ```
 *
 * @example
 * ```ts
 * // Pattern 2: Configuration props
 * return withProps(store, {
 *   storeName: 'Users',
 *   version:   '1.0.0',
 *   config:    { pageSize: 20, cacheTTL: 60_000 }
 * })
 * ```
 */
export function withProps<S extends object, P extends Record<string, unknown>>(
  store: S,
  props: P
): S & Readonly<P> {
  const enhanced = store as any

  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(enhanced, key, {
      get:          () => value,
      enumerable:   true,
      configurable: false
    })
  }

  return enhanced as S & Readonly<P>
}
