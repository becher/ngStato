// ─────────────────────────────────────────────────────
// @ngstato/core — distinctUntilChanged()
// Ignore les appels si la “clé” n’a pas changé.
// ─────────────────────────────────────────────────────

export type Comparator<T> = (prev: T, next: T) => boolean

export function distinctUntilChanged<S, A extends unknown[], K>(
  fn: (state: S, ...args: A) => void | Promise<void>,
  keySelector: (...args: A) => K,
  comparator: Comparator<K> = Object.is
) {
  let initialized = false
  let prevKey: K

  return async (state: S, ...args: A): Promise<void> => {
    const nextKey = keySelector(...args)

    if (initialized && comparator(prevKey, nextKey)) {
      return
    }

    initialized = true
    prevKey = nextKey
    await fn(state, ...args)
  }
}

