// ─────────────────────────────────────────────────────
// @ngstato/core — stream operators (RxJS-like, sans RxJS)
// ─────────────────────────────────────────────────────

import type { StatoObservable } from './from-stream'

type Observer<T> = {
  next?: (value: T) => void
  error?: (error: unknown) => void
  complete?: () => void
}

type Subscription = { unsubscribe(): void }

type MaybeObservable<T> = StatoObservable<T> | Promise<T> | T

export type StreamOperator<I, O> = (source: StatoObservable<I>) => StatoObservable<O>

export function pipeStream<T>(
  source: StatoObservable<T>
): StatoObservable<T>
export function pipeStream<T, A>(
  source: StatoObservable<T>,
  op1: StreamOperator<T, A>
): StatoObservable<A>
export function pipeStream<T, A, B>(
  source: StatoObservable<T>,
  op1: StreamOperator<T, A>,
  op2: StreamOperator<A, B>
): StatoObservable<B>
export function pipeStream<T, A, B, C>(
  source: StatoObservable<T>,
  op1: StreamOperator<T, A>,
  op2: StreamOperator<A, B>,
  op3: StreamOperator<B, C>
): StatoObservable<C>
export function pipeStream(
  source: StatoObservable<unknown>,
  ...ops: Array<StreamOperator<any, any>>
) {
  return ops.reduce((acc, op) => op(acc), source)
}

function isObservable<T>(value: MaybeObservable<T>): value is StatoObservable<T> {
  return !!value && typeof value === 'object' && typeof (value as any).subscribe === 'function'
}

function toObservable<T>(value: MaybeObservable<T>): StatoObservable<T> {
  if (isObservable(value)) return value

  return {
    subscribe(observer: Observer<T>) {
      let closed = false
      Promise.resolve(value)
        .then((resolved) => {
          if (closed) return
          observer.next?.(resolved)
          observer.complete?.()
        })
        .catch((error) => {
          if (closed) return
          observer.error?.(error)
        })

      return { unsubscribe: () => { closed = true } }
    }
  }
}

export function mapStream<I, O>(
  mapFn: (value: I) => O
): StreamOperator<I, O> {
  return (source) => ({
    subscribe(observer) {
      return source.subscribe({
        next: (value) => observer.next?.(mapFn(value)),
        error: (error) => observer.error?.(error),
        complete: () => observer.complete?.()
      })
    }
  })
}

export function filterStream<T>(
  predicate: (value: T) => boolean
): StreamOperator<T, T> {
  return (source) => ({
    subscribe(observer) {
      return source.subscribe({
        next: (value) => {
          if (predicate(value)) observer.next?.(value)
        },
        error: (error) => observer.error?.(error),
        complete: () => observer.complete?.()
      })
    }
  })
}

type Mapper<I, O> = (value: I, ctx: { signal: AbortSignal }) => MaybeObservable<O>

function closeSubs(subs: Subscription[]) {
  for (const sub of subs) {
    try { sub.unsubscribe() } catch { /* ignore */ }
  }
}

export function switchMapStream<I, O>(
  mapper: Mapper<I, O>
): StreamOperator<I, O> {
  return (source) => ({
    subscribe(observer) {
      let closed = false
      let sourceDone = false
      let innerSub: Subscription | null = null
      let innerActive = false
      let controller: AbortController | null = null

      const maybeComplete = () => {
        if (!closed && sourceDone && !innerActive) {
          closed = true
          observer.complete?.()
        }
      }

      const sourceSub = source.subscribe({
        next: (value) => {
          if (closed) return

          controller?.abort()
          innerSub?.unsubscribe()
          controller = new AbortController()
          innerActive = true

          innerSub = toObservable(mapper(value, { signal: controller.signal })).subscribe({
            next: (v) => {
              if (!closed) observer.next?.(v)
            },
            error: (error) => {
              if (closed) return
              closed = true
              observer.error?.(error)
              sourceSub.unsubscribe()
              innerSub?.unsubscribe()
            },
            complete: () => {
              innerActive = false
              maybeComplete()
            }
          })
        },
        error: (error) => {
          if (closed) return
          closed = true
          observer.error?.(error)
          controller?.abort()
          innerSub?.unsubscribe()
        },
        complete: () => {
          sourceDone = true
          maybeComplete()
        }
      })

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          controller?.abort()
          sourceSub.unsubscribe()
          innerSub?.unsubscribe()
        }
      }
    }
  })
}

export function concatMapStream<I, O>(
  mapper: Mapper<I, O>
): StreamOperator<I, O> {
  return (source) => ({
    subscribe(observer) {
      let closed = false
      let sourceDone = false
      const queue: I[] = []
      let running = false
      let currentSub: Subscription | null = null
      let currentController: AbortController | null = null

      const maybeComplete = () => {
        if (!closed && sourceDone && !running && queue.length === 0) {
          closed = true
          observer.complete?.()
        }
      }

      const runNext = () => {
        if (closed || running || queue.length === 0) {
          maybeComplete()
          return
        }
        running = true
        const value = queue.shift() as I
        currentController = new AbortController()
        currentSub = toObservable(mapper(value, { signal: currentController.signal })).subscribe({
          next: (v) => {
            if (!closed) observer.next?.(v)
          },
          error: (error) => {
            if (closed) return
            closed = true
            observer.error?.(error)
            sourceSub.unsubscribe()
            currentController?.abort()
            currentSub?.unsubscribe()
            queue.length = 0
          },
          complete: () => {
            running = false
            runNext()
          }
        })
      }

      const sourceSub = source.subscribe({
        next: (value) => {
          if (closed) return
          queue.push(value)
          runNext()
        },
        error: (error) => {
          if (closed) return
          closed = true
          observer.error?.(error)
          currentController?.abort()
          currentSub?.unsubscribe()
          queue.length = 0
        },
        complete: () => {
          sourceDone = true
          maybeComplete()
        }
      })

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          sourceSub.unsubscribe()
          currentController?.abort()
          currentSub?.unsubscribe()
          queue.length = 0
        }
      }
    }
  })
}

export function exhaustMapStream<I, O>(
  mapper: Mapper<I, O>
): StreamOperator<I, O> {
  return (source) => ({
    subscribe(observer) {
      let closed = false
      let sourceDone = false
      let running = false
      let currentSub: Subscription | null = null
      let controller: AbortController | null = null

      const maybeComplete = () => {
        if (!closed && sourceDone && !running) {
          closed = true
          observer.complete?.()
        }
      }

      const sourceSub = source.subscribe({
        next: (value) => {
          if (closed || running) return
          running = true
          controller = new AbortController()
          currentSub = toObservable(mapper(value, { signal: controller.signal })).subscribe({
            next: (v) => {
              if (!closed) observer.next?.(v)
            },
            error: (error) => {
              if (closed) return
              closed = true
              observer.error?.(error)
              sourceSub.unsubscribe()
              controller?.abort()
              currentSub?.unsubscribe()
            },
            complete: () => {
              running = false
              maybeComplete()
            }
          })
        },
        error: (error) => {
          if (closed) return
          closed = true
          observer.error?.(error)
          controller?.abort()
          currentSub?.unsubscribe()
        },
        complete: () => {
          sourceDone = true
          maybeComplete()
        }
      })

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          sourceSub.unsubscribe()
          controller?.abort()
          currentSub?.unsubscribe()
        }
      }
    }
  })
}

export function mergeMapStream<I, O>(
  mapper: Mapper<I, O>,
  options?: { concurrency?: number }
): StreamOperator<I, O> {
  const concurrency = Math.max(1, options?.concurrency ?? Number.POSITIVE_INFINITY)

  return (source) => ({
    subscribe(observer) {
      let closed = false
      let sourceDone = false
      const queue: I[] = []
      const active = new Set<Subscription>()
      const controllers = new Set<AbortController>()

      const maybeComplete = () => {
        if (!closed && sourceDone && active.size === 0 && queue.length === 0) {
          closed = true
          observer.complete?.()
        }
      }

      const spawn = (value: I) => {
        const controller = new AbortController()
        controllers.add(controller)
        const sub = toObservable(mapper(value, { signal: controller.signal })).subscribe({
          next: (v) => {
            if (!closed) observer.next?.(v)
          },
          error: (error) => {
            if (closed) return
            closed = true
            observer.error?.(error)
            sourceSub.unsubscribe()
            closeSubs(Array.from(active))
            active.clear()
            for (const c of controllers) c.abort()
            controllers.clear()
            queue.length = 0
          },
          complete: () => {
            active.delete(sub)
            controllers.delete(controller)
            drain()
            maybeComplete()
          }
        })
        active.add(sub)
      }

      const drain = () => {
        while (!closed && active.size < concurrency && queue.length > 0) {
          spawn(queue.shift() as I)
        }
      }

      const sourceSub = source.subscribe({
        next: (value) => {
          if (closed) return
          queue.push(value)
          drain()
        },
        error: (error) => {
          if (closed) return
          closed = true
          observer.error?.(error)
          closeSubs(Array.from(active))
          active.clear()
          for (const c of controllers) c.abort()
          controllers.clear()
          queue.length = 0
        },
        complete: () => {
          sourceDone = true
          maybeComplete()
        }
      })

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          sourceSub.unsubscribe()
          closeSubs(Array.from(active))
          active.clear()
          for (const c of controllers) c.abort()
          controllers.clear()
          queue.length = 0
        }
      }
    }
  })
}

export function distinctUntilChangedStream<T, K = T>(
  keySelector?: (value: T) => K,
  comparator: (prev: K, next: K) => boolean = Object.is
): StreamOperator<T, T> {
  return (source) => ({
    subscribe(observer) {
      let initialized = false
      let prevKey: K
      return source.subscribe({
        next: (value) => {
          const nextKey = keySelector ? keySelector(value) : (value as unknown as K)
          if (initialized && comparator(prevKey, nextKey)) return
          initialized = true
          prevKey = nextKey
          observer.next?.(value)
        },
        error: (error) => observer.error?.(error),
        complete: () => observer.complete?.()
      })
    }
  })
}

export function debounceStream<T>(ms: number): StreamOperator<T, T> {
  return (source) => ({
    subscribe(observer) {
      let timer: ReturnType<typeof setTimeout> | null = null
      let sourceDone = false
      let lastValue: T | undefined
      let hasValue = false
      let closed = false

      const flush = () => {
        if (!hasValue || closed) return
        observer.next?.(lastValue as T)
        hasValue = false
        lastValue = undefined
      }

      const maybeComplete = () => {
        if (sourceDone && !timer && !closed) {
          closed = true
          observer.complete?.()
        }
      }

      const sub = source.subscribe({
        next: (value) => {
          if (closed) return
          lastValue = value
          hasValue = true
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            timer = null
            flush()
            maybeComplete()
          }, ms)
        },
        error: (error) => {
          if (closed) return
          closed = true
          if (timer) clearTimeout(timer)
          observer.error?.(error)
        },
        complete: () => {
          sourceDone = true
          if (!timer) {
            maybeComplete()
          }
        }
      })

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          if (timer) clearTimeout(timer)
          sub.unsubscribe()
        }
      }
    }
  })
}

export function throttleStream<T>(ms: number): StreamOperator<T, T> {
  return (source) => ({
    subscribe(observer) {
      let throttled = false
      let timer: ReturnType<typeof setTimeout> | null = null
      let closed = false
      const sub = source.subscribe({
        next: (value) => {
          if (closed || throttled) return
          observer.next?.(value)
          throttled = true
          timer = setTimeout(() => {
            throttled = false
            timer = null
          }, ms)
        },
        error: (error) => {
          if (closed) return
          closed = true
          if (timer) clearTimeout(timer)
          observer.error?.(error)
        },
        complete: () => {
          if (closed) return
          closed = true
          if (timer) clearTimeout(timer)
          observer.complete?.()
        }
      })

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          if (timer) clearTimeout(timer)
          sub.unsubscribe()
        }
      }
    }
  })
}

export function catchErrorStream<T>(
  handler: (error: unknown) => MaybeObservable<T>
): StreamOperator<T, T> {
  return (source) => ({
    subscribe(observer) {
      let closed = false
      let fallbackSub: Subscription | null = null
      const sourceSub = source.subscribe({
        next: (value) => {
          if (!closed) observer.next?.(value)
        },
        error: (error) => {
          if (closed) return
          fallbackSub = toObservable(handler(error)).subscribe({
            next: (value) => {
              if (!closed) observer.next?.(value)
            },
            error: (innerErr) => {
              if (closed) return
              closed = true
              observer.error?.(innerErr)
            },
            complete: () => {
              if (closed) return
              closed = true
              observer.complete?.()
            }
          })
        },
        complete: () => {
          if (closed) return
          closed = true
          observer.complete?.()
        }
      })

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          sourceSub.unsubscribe()
          fallbackSub?.unsubscribe()
        }
      }
    }
  })
}

export function retryStream<T>(
  options: {
    attempts?: number
    delay?: number
    backoff?: 'fixed' | 'exponential'
  } = {}
): StreamOperator<T, T> {
  const attempts = Math.max(1, options.attempts ?? 3)
  const delay = Math.max(0, options.delay ?? 0)
  const backoff = options.backoff ?? 'fixed'

  return (source) => ({
    subscribe(observer) {
      let closed = false
      let attempt = 0
      let activeSub: Subscription | null = null
      let retryTimer: ReturnType<typeof setTimeout> | null = null

      const subscribeOnce = () => {
        if (closed) return
        attempt++
        activeSub = source.subscribe({
          next: (value) => {
            if (!closed) observer.next?.(value)
          },
          complete: () => {
            if (closed) return
            closed = true
            observer.complete?.()
          },
          error: (error) => {
            if (closed) return
            if (attempt >= attempts) {
              closed = true
              observer.error?.(error)
              return
            }
            const wait = backoff === 'exponential'
              ? delay * Math.pow(2, attempt - 1)
              : delay
            retryTimer = setTimeout(() => {
              retryTimer = null
              subscribeOnce()
            }, wait)
          }
        })
      }

      subscribeOnce()

      return {
        unsubscribe() {
          if (closed) return
          closed = true
          if (retryTimer) clearTimeout(retryTimer)
          activeSub?.unsubscribe()
        }
      }
    }
  })
}

