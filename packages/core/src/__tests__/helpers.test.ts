// ─────────────────────────────────────────────────────
// @ngstato/core — tests helpers approfondis
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { abortable }  from '../helpers/abortable'
import { debounced }  from '../helpers/debounced'
import { throttled }  from '../helpers/throttled'
import { retryable }  from '../helpers/retryable'
import { fromStream } from '../helpers/from-stream'
import { optimistic } from '../helpers/optimistic'
import { withPersist } from '../helpers/with-persist'
import { exclusive } from '../helpers/exclusive'
import { queued }    from '../helpers/queued'
import { distinctUntilChanged } from '../helpers/distinct-until-changed'
import { combineLatest } from '../helpers/combine-latest'
import { combineLatestStream } from '../helpers/combine-latest-stream'
import { forkJoin } from '../helpers/fork-join'
import { race } from '../helpers/race'
import { createStore } from '../store'

// ─────────────────────────────────────────────────────
// TESTS — abortable()
// ─────────────────────────────────────────────────────

describe('abortable()', () => {

  it('exécute l action normalement', async () => {
    const fn     = vi.fn(async (state: any, query: string, { signal }: any) => {
      state.result = query
    })
    const action = abortable(fn)
    const state  = { result: '' }

    await action(state, 'hello')
    expect(state.result).toBe('hello')
  })

  it('annule la requête précédente si appelé deux fois rapidement', async () => {
    const calls: string[] = []

    const fn = abortable(async (state: any, query: string, { signal }: any) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { calls.push(query); resolve() }, 50)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const state = {}
    const p1    = fn(state, 'premier')
    const p2    = fn(state, 'deuxieme')

    await Promise.allSettled([p1, p2])

    expect(calls).toEqual(['deuxieme'])
    expect(calls).not.toContain('premier')
  })

  it('trois appels rapides — seul le dernier aboutit', async () => {
    const calls: string[] = []

    const fn = abortable(async (state: any, query: string, { signal }: any) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { calls.push(query); resolve() }, 50)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const state = {}
    const p1    = fn(state, 'un')
    const p2    = fn(state, 'deux')
    const p3    = fn(state, 'trois')

    await Promise.allSettled([p1, p2, p3])

    expect(calls).toEqual(['trois'])
  })

  it('state non modifié si annulé', async () => {
    const fn = abortable(async (state: any, query: string, { signal }: any) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          state.result = query
          resolve()
        }, 50)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const state = { result: 'initial' }
    const p1    = fn(state, 'premier')
    fn(state, 'deuxieme')

    await Promise.allSettled([p1])

    // p1 annulé — state.result ne doit pas être 'premier'
    expect(state.result).not.toBe('premier')
  })

  it('ignore silencieusement l erreur AbortError', async () => {
    const fn = abortable(async (state: any, query: string, { signal }: any) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 100)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const state = {}
    const p1    = fn(state, 'premier')
    fn(state, 'deuxieme')

    await expect(p1).resolves.toBeUndefined()
  })

  it('remonte les erreurs non-AbortError', async () => {
    const fn = abortable(async (state: any, _query: string, _opts: any) => {
      throw new Error('vraie erreur')
    })

    await expect(fn({}, 'test')).rejects.toThrow('vraie erreur')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — debounced()
// ─────────────────────────────────────────────────────

describe('debounced()', () => {

  beforeEach(() => { void vi.useFakeTimers() })
  afterEach(()  => { void vi.useRealTimers() })

  it('exécute l action après le délai', async () => {
    const fn     = vi.fn(async (state: any, v: string) => { state.value = v })
    const action = debounced(fn, 300)
    const state  = { value: '' }

    action(state, 'test')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    await Promise.resolve()

    expect(fn).toHaveBeenCalledWith(state, 'test')
  })

  it('délai par défaut est 300ms', async () => {
    const fn     = vi.fn(async () => {})
    const action = debounced(fn)   // pas de délai explicite

    action({})
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(299)
    await Promise.resolve()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('annule les appels précédents dans le délai', async () => {
    const fn     = vi.fn(async (state: any, v: string) => { state.value = v })
    const action = debounced(fn, 300)
    const state  = { value: '' }

    action(state, 'premier')
    action(state, 'deuxieme')
    action(state, 'troisieme')

    vi.advanceTimersByTime(300)
    await Promise.resolve()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(state, 'troisieme')
  })

  it('appels successifs après délai écoulé — tous exécutés', async () => {
    const fn     = vi.fn(async () => {})
    const action = debounced(fn, 300)

    action({})
    vi.advanceTimersByTime(300)
    await Promise.resolve()

    action({})
    vi.advanceTimersByTime(300)
    await Promise.resolve()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('erreur dans fn — propagée correctement', async () => {
    const fn     = vi.fn(async () => { throw new Error('erreur debounce') })
    const action = debounced(fn, 300)

    const p = action({})
    vi.advanceTimersByTime(300)

    await expect(p).rejects.toThrow('erreur debounce')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — throttled()
// ─────────────────────────────────────────────────────

describe('throttled()', () => {

  beforeEach(() => { void vi.useFakeTimers() })
  afterEach(()  => { void vi.useRealTimers() })

  it('exécute immédiatement le premier appel', async () => {
    const fn     = vi.fn(async (state: any) => { state.count++ })
    const action = throttled(fn, 300)
    const state  = { count: 0 }

    await action(state)
    expect(state.count).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignore les appels dans la fenêtre de throttle', async () => {
    const fn     = vi.fn(async (state: any) => { state.count++ })
    const action = throttled(fn, 300)
    const state  = { count: 0 }

    await action(state)
    action(state)
    action(state)

    vi.advanceTimersByTime(100)
    await Promise.resolve()

    expect(state.count).toBe(1)
  })

  it('exécute après la fenêtre de throttle', async () => {
    const fn     = vi.fn(async (state: any) => { state.count++ })
    const action = throttled(fn, 300)
    const state  = { count: 0 }

    await action(state)
    vi.advanceTimersByTime(300)
    action(state)
    vi.advanceTimersByTime(300)
    await Promise.resolve()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('erreur dans fn — propagée correctement', async () => {
    const fn     = vi.fn(async () => { throw new Error('erreur throttle') })
    const action = throttled(fn, 300)

    await expect(action({})).rejects.toThrow('erreur throttle')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — retryable()
// ─────────────────────────────────────────────────────

describe('retryable()', () => {

  it('exécute l action normalement si pas d erreur', async () => {
    const fn     = vi.fn(async (state: any) => { state.data = 'ok' })
    const action = retryable(fn, { attempts: 3, backoff: 'fixed', delay: 10 })
    const state  = { data: '' }

    await action(state)
    expect(state.data).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('réessaie le bon nombre de fois', async () => {
    let count = 0
    const fn  = async (state: any) => {
      count++
      if (count < 3) throw new Error('échec')
      state.data = 'succès au 3ème essai'
    }

    const action = retryable(fn, { attempts: 3, backoff: 'fixed', delay: 10 })
    const state  = { data: '' }

    await action(state)
    expect(count).toBe(3)
    expect(state.data).toBe('succès au 3ème essai')
  })

  it('lance l erreur après tous les essais épuisés', async () => {
    const fn     = vi.fn(async () => { throw new Error('toujours échoue') })
    const action = retryable(fn, { attempts: 3, backoff: 'fixed', delay: 10 })

    await expect(action({})).rejects.toThrow('toujours échoue')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('backoff fixed — délai constant entre les tentatives', async () => {
    vi.useFakeTimers()
    const delays: number[] = []
    let   lastTime         = Date.now()
    let   count            = 0

    const fn = async () => {
      const now = Date.now()
      if (count > 0) delays.push(now - lastTime)
      lastTime = now
      count++
      if (count < 3) throw new Error('échec')
    }

    const action = retryable(fn, { attempts: 3, backoff: 'fixed', delay: 100 })
    const p      = action({})

    await vi.runAllTimersAsync()
    await p

    // Tous les délais doivent être ~100ms
    delays.forEach(d => expect(d).toBeGreaterThanOrEqual(100))
    vi.useRealTimers()
  })

  it('backoff exponential — délais croissants', async () => {
    vi.useFakeTimers()
    const delays: number[] = []
    let   lastTime         = Date.now()
    let   count            = 0

    const fn = async () => {
      const now = Date.now()
      if (count > 0) delays.push(now - lastTime)
      lastTime = now
      count++
      if (count < 4) throw new Error('échec')
    }

    const action = retryable(fn, { attempts: 4, backoff: 'exponential', delay: 100 })
    const p      = action({})

    await vi.runAllTimersAsync()
    await p

    // Délais : 100ms, 200ms, 400ms
    expect(delays[0]).toBeGreaterThanOrEqual(100)
    expect(delays[1]).toBeGreaterThanOrEqual(200)
    expect(delays[2]).toBeGreaterThanOrEqual(400)
    vi.useRealTimers()
  })

  it('appelle onRetry à chaque tentative échouée', async () => {
    const onRetry = vi.fn()
    let   count   = 0
    const fn      = async () => {
      count++
      if (count < 3) throw new Error('échec')
    }

    const action = retryable(fn, {
      attempts: 3,
      backoff:  'fixed',
      delay:    10,
      onRetry
    })

    await action({})
    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error))
  })
})

// ─────────────────────────────────────────────────────
// TESTS — fromStream()
// ─────────────────────────────────────────────────────

describe('fromStream()', () => {

  it('met à jour le state à chaque émission', () => {
    const emissions: number[] = []
    const mockObservable      = {
      subscribe: (observer: any) => {
        observer.next(1)
        observer.next(2)
        observer.next(3)
        return { unsubscribe: vi.fn() }
      }
    }

    const action = fromStream(
      (_state: any) => mockObservable,
      (state: any, value: number) => {
        state.value = value
        emissions.push(value)
      }
    )

    const state = { value: 0 }
    action(state)

    expect(emissions).toEqual([1, 2, 3])
    expect(state.value).toBe(3)
  })

  it('state correct après chaque émission', () => {
    const snapshots: number[] = []
    const mockObservable      = {
      subscribe: (observer: any) => {
        observer.next(10)
        observer.next(20)
        observer.next(30)
        return { unsubscribe: vi.fn() }
      }
    }

    const action = fromStream(
      () => mockObservable,
      (state: any, value: number) => {
        state.value = value
        snapshots.push(state.value)
      }
    )

    action({ value: 0 })
    expect(snapshots).toEqual([10, 20, 30])
  })

  it('retourne une fonction de cleanup', () => {
    const unsubscribe    = vi.fn()
    const mockObservable = {
      subscribe: (_observer: any) => ({ unsubscribe })
    }

    const action  = fromStream(() => mockObservable, () => {})
    const cleanup = action({})

    expect(typeof cleanup).toBe('function')
  })

  it('unsubscribe appelé au cleanup', () => {
    const unsubscribe    = vi.fn()
    const mockObservable = {
      subscribe: (_observer: any) => ({ unsubscribe })
    }

    const action  = fromStream(() => mockObservable, () => {})
    const cleanup = action({})

    cleanup()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('appelle onError si le stream émet une erreur', () => {
    const onError        = vi.fn()
    const mockObservable = {
      subscribe: (observer: any) => {
        observer.error(new Error('stream error'))
        return { unsubscribe: vi.fn() }
      }
    }

    const action = fromStream(
      () => mockObservable,
      () => {},
      { onError }
    )

    action({})
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('appelle onComplete quand le stream se termine', () => {
    const onComplete     = vi.fn()
    const mockObservable = {
      subscribe: (observer: any) => {
        observer.complete()
        return { unsubscribe: vi.fn() }
      }
    }

    const action = fromStream(
      () => mockObservable,
      () => {},
      { onComplete }
    )

    action({})
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────
// TESTS — optimistic()
// ─────────────────────────────────────────────────────

describe('optimistic()', () => {

  it('applique la modification immédiatement', async () => {
    const confirm = vi.fn(async () => {})
    const action  = optimistic(
      (state: any) => { state.liked = true },
      confirm
    )

    const state = { liked: false }
    const p     = action(state)

    expect(state.liked).toBe(true)
    await p
  })

  it('garde la modification si l API réussit', async () => {
    const action = optimistic(
      (state: any) => { state.liked = true },
      async ()    => {}
    )

    const state = { liked: false }
    await action(state)
    expect(state.liked).toBe(true)
  })

  it('rollback automatique si l API échoue', async () => {
    const action = optimistic(
      (state: any) => { state.liked = true },
      async ()    => { throw new Error('API indisponible') }
    )

    const state = { liked: false }
    await expect(action(state)).rejects.toThrow('API indisponible')
    expect(state.liked).toBe(false)
  })

  it('rollback restaure l état complet', async () => {
    const action = optimistic(
      (state: any) => { state.liked = true; state.count = state.count + 1 },
      async ()    => { throw new Error('échec') }
    )

    const state = { liked: false, count: 5 }
    await expect(action(state)).rejects.toThrow()

    expect(state.liked).toBe(false)
    expect(state.count).toBe(5)
  })

  it('erreur remontée après rollback', async () => {
    const action = optimistic(
      (state: any) => { state.value = 'modifié' },
      async ()    => { throw new Error('erreur confirm') }
    )

    const state = { value: 'original' }
    await expect(action(state)).rejects.toThrow('erreur confirm')
    expect(state.value).toBe('original')
  })

  it('confirm reçoit les bons arguments', async () => {
    const confirm = vi.fn(async () => {})
    const action  = optimistic(
      (state: any, id: string) => { state.liked = true },
      confirm
    )

    await action({ liked: false }, 'post-42')
    expect(confirm).toHaveBeenCalledWith(
      expect.any(Object),
      'post-42'
    )
  })
})

describe('withPersist()', () => {
  function createMemoryStorage() {
    const map = new Map<string, string>()
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value)
      },
      removeItem: (key: string) => {
        map.delete(key)
      }
    }
  }

  it('hydrate le state au démarrage depuis le storage', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'students',
      JSON.stringify({
        v: 1,
        data: { count: 42, theme: 'dark' }
      })
    )

    const store = createStore(
      withPersist(
        {
          count: 0,
          theme: 'light'
        },
        { key: 'students', storage }
      )
    )
    store.__store__.init(store)

    expect(store.count).toBe(42)
    expect(store.theme).toBe('dark')
  })

  it('persiste uniquement les clés pickées', async () => {
    const storage = createMemoryStorage()
    const store = createStore(
      withPersist(
        {
          count: 0,
          loading: false,
          actions: {
            inc(state: any) {
              state.count++
            },
            toggle(state: any) {
              state.loading = !state.loading
            }
          }
        },
        {
          key: 'counter',
          storage,
          pick: ['count']
        }
      )
    )

    await store.inc()
    await store.toggle()

    const raw = storage.getItem('counter')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.data.count).toBe(1)
    expect(parsed.data.loading).toBeUndefined()
  })

  it('utilise migrate si version différente', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'vstore',
      JSON.stringify({
        v: 1,
        data: { legacyCount: 7 }
      })
    )

    const store = createStore(
      withPersist(
        {
          count: 0
        },
        {
          key: 'vstore',
          version: 2,
          storage,
          migrate: (data: any) => ({ count: data.legacyCount ?? 0 })
        }
      )
    )
    store.__store__.init(store)

    expect(store.count).toBe(7)
  })
})

// ─────────────────────────────────────────────────────
// TESTS — exclusive()
// ─────────────────────────────────────────────────────

describe('exclusive()', () => {
  it('exécute une seule fois quand plusieurs appels arrivent pendant l\'exécution', async () => {
    const calls: string[] = []
    const fn = vi.fn(async (state: any, query: string) => {
      calls.push(query)
      await new Promise<void>(resolve => setTimeout(resolve, 30))
      state.value = query
    })

    const action = exclusive(fn)
    const state  = { value: '' }

    const p1 = action(state, 'premier')
    const p2 = action(state, 'deuxieme')

    await Promise.all([p1, p2])

    expect(calls).toEqual(['premier'])
    expect(state.value).toBe('premier')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('réexécute après erreur', async () => {
    const fn = vi.fn(async (_state: any, _query: string) => {
      throw new Error('boom')
    })

    const action = exclusive(fn)
    const state  = { value: '' }

    await expect(action(state, 'a')).rejects.toThrow('boom')

    ;(fn as any).mockImplementationOnce(async (_state: any, q: string) => {
      state.value = q
    })

    await action(state, 'b')
    expect(state.value).toBe('b')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — queued()
// ─────────────────────────────────────────────────────

describe('queued()', () => {
  it('exécute les appels dans l ordre d arrivée (concatMap)', async () => {
    const calls: string[] = []
    const fn = vi.fn(async (state: any, query: string) => {
      calls.push(query)
      await new Promise<void>(resolve => setTimeout(resolve, 30))
      state.value = query
    })

    const action = queued(fn)
    const state  = { value: '' }

    const p1 = action(state, 'un')
    const p2 = action(state, 'deux')

    await Promise.all([p1, p2])

    expect(calls).toEqual(['un', 'deux'])
    expect(state.value).toBe('deux')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('stoppe la file si une exécution échoue', async () => {
    const fn = vi.fn(async (state: any, query: string) => {
      if (query === 'un') throw new Error('boom')
      state.value = query
    })

    const action = queued(fn)
    const state  = { value: '' }

    const p1 = action(state, 'un')
    const p2 = action(state, 'deux')

    await expect(p1).rejects.toThrow('boom')
    await expect(p2).rejects.toThrow('boom')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(state.value).toBe('')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — distinctUntilChanged()
// ─────────────────────────────────────────────────────

describe('distinctUntilChanged()', () => {
  it('ignore les appels quand la clé ne change pas', async () => {
    const fn = vi.fn(async (state: any, q: string) => {
      state.q = q
    })

    const action = distinctUntilChanged(
      fn,
      (q: string) => q.trim().toLowerCase()
    )

    const state: any = { q: '' }
    await action(state, ' Alice ')
    await action(state, 'alice')
    await action(state, 'ALICE   ')
    await action(state, 'bob')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(state.q).toBe('bob')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — combineLatest()
// ─────────────────────────────────────────────────────

describe('combineLatest()', () => {
  it('compose plusieurs deps dans un tuple', () => {
    const deps = combineLatest<any>()(
      (s) => s.a,
      (s) => s.b,
      (s) => s.a + s.b
    )

    expect(deps({ a: 1, b: 2 })).toEqual([1, 2, 3])
  })
})

describe('combineLatestStream()', () => {
  function createSubject<T>() {
    const observers = new Set<{
      next?: (v: T) => void
      error?: (e: unknown) => void
      complete?: () => void
    }>()

    return {
      observable: {
        subscribe(observer: any) {
          observers.add(observer)
          return { unsubscribe: () => observers.delete(observer) }
        }
      },
      next(v: T) {
        observers.forEach(o => o.next?.(v))
      },
      error(e: unknown) {
        observers.forEach(o => o.error?.(e))
      },
      complete() {
        observers.forEach(o => o.complete?.())
      }
    }
  }

  it('n émet qu après que toutes les sources ont émis au moins une fois', () => {
    const a = createSubject<number>()
    const b = createSubject<string>()

    const emitted: Array<[number, string]> = []
    const combined = combineLatestStream(a.observable as any, b.observable as any)
    const sub = combined.subscribe({
      next: (v) => emitted.push(v as any)
    })

    a.next(1)
    expect(emitted).toEqual([])

    b.next('x')
    expect(emitted).toEqual([[1, 'x']])

    a.next(2)
    expect(emitted).toEqual([[1, 'x'], [2, 'x']])

    sub.unsubscribe()
  })

  it('propage error et se ferme', () => {
    const a = createSubject<number>()
    const b = createSubject<string>()

    const errors: unknown[] = []
    const emitted: any[] = []

    const sub = combineLatestStream(a.observable as any, b.observable as any).subscribe({
      next: (v) => emitted.push(v),
      error: (e) => errors.push(e)
    })

    a.next(1)
    b.error(new Error('boom'))

    // Après error, on ne doit plus émettre
    b.next('x')
    a.next(2)

    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('boom')
    expect(emitted).toEqual([])

    sub.unsubscribe()
  })
})

// ─────────────────────────────────────────────────────
// TESTS — forkJoin() / race()
// ─────────────────────────────────────────────────────

describe('forkJoin()', () => {
  it('attend toutes les tâches et retourne un objet', async () => {
    const result = await forkJoin({
      a: async () => {
        await new Promise(r => setTimeout(r, 10))
        return 1
      },
      b: () => 'ok'
    })

    expect(result).toEqual({ a: 1, b: 'ok' })
  })
})

describe('race()', () => {
  it('retourne la première tâche qui se termine', async () => {
    const result = await race<number>([
      async () => {
        await new Promise(r => setTimeout(r, 30))
        return 2
      },
      async () => {
        await new Promise(r => setTimeout(r, 10))
        return 1
      }
    ])

    expect(result).toBe(1)
  })
})