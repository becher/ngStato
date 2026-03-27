// ─────────────────────────────────────────────────────
// @ngstato/core — combineLatestStream()
// Combine plusieurs flux externes (RxJS compatible via subscribe)
// sans dépendre de RxJS.
// ─────────────────────────────────────────────────────

import type { StatoObservable } from './from-stream'

type Observer<T> = {
  next?: (value: T) => void
  error?: (error: unknown) => void
  complete?: () => void
}

type Subscription = { unsubscribe(): void }

export function combineLatestStream<T extends unknown[]>(
  ...sources: { [K in keyof T]: StatoObservable<T[K]> }
): StatoObservable<T> {
  return {
    subscribe(observer: Observer<T>): Subscription {
      const n = sources.length
      if (!n) {
        observer.complete?.()
        return { unsubscribe() {} }
      }

      const hasValue = new Array<boolean>(n).fill(false)
      const values = new Array<unknown>(n)
      let completed = 0
      let closed = false

      const subs: Subscription[] = []

      const tryEmit = () => {
        if (closed) return
        if (hasValue.every(Boolean)) {
          observer.next?.(values.slice() as unknown as T)
        }
      }

      const closeAll = () => {
        if (closed) return
        closed = true
        for (const s of subs) {
          try { s.unsubscribe() } catch { /* ignore */ }
        }
      }

      sources.forEach((src, index) => {
        const sub = src.subscribe({
          next: (v) => {
            if (closed) return
            values[index] = v
            hasValue[index] = true
            tryEmit()
          },
          error: (err) => {
            if (closed) return
            observer.error?.(err)
            closeAll()
          },
          complete: () => {
            if (closed) return
            completed++
            if (completed >= n) {
              observer.complete?.()
              closeAll()
            }
          }
        })
        subs.push(sub)
      })

      return {
        unsubscribe() {
          closeAll()
        }
      }
    }
  }
}

