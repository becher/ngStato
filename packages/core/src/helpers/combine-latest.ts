// ─────────────────────────────────────────────────────
// @ngstato/core — combineLatest()
// Compose plusieurs deps pour `effects`
// (équivalent combineLatest côté RxJS, mais sans streams)
// ─────────────────────────────────────────────────────

export type DepFn<S, T> = (state: S) => T

export function combineLatest<S>() {
  return <T extends unknown[]>(
    ...deps: { [K in keyof T]: DepFn<S, T[K]> }
  ) => {
    return (state: S): T => deps.map((fn) => fn(state)) as unknown as T
  }
}

