// ─────────────────────────────────────────────────────
// @ngstato/core — tests createStore()
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from '../store'

// ─────────────────────────────────────────────────────
// TESTS — STATE DE BASE
// ─────────────────────────────────────────────────────

describe('createStore — state de base', () => {

  it('expose les propriétés du state directement', () => {
    const store = createStore({
      count: 0,
      name: 'Stato',
      active: true
    })

    expect(store.count).toBe(0)
    expect(store.name).toBe('Stato')
    expect(store.active).toBe(true)
  })

  it('getState() retourne une copie du state', () => {
    const store = createStore({ count: 5 })
    const state = store.getState()

    expect(state.count).toBe(5)

    // Modifier la copie ne doit pas affecter le store
    ;(state as any).count = 99
    expect(store.count).toBe(5)
  })

    it('le state initial est immutable depuis l exterieur', () => {
    const store = createStore({ count: 0 })

    // Le store lance une erreur si on tente de modifier directement
    const s = store as any
    expect(() => { s.count = 99 }).toThrow()

    // Le state interne ne change pas
    expect(store.getState().count).toBe(0)
    })
})

// ─────────────────────────────────────────────────────
// TESTS — ACTIONS SYNC
// ─────────────────────────────────────────────────────

describe('createStore — actions synchrones', () => {

  it('exécute une action sync et met à jour le state', async () => {
    const store = createStore({
      count: 0,
      actions: {
        increment(state) { state.count++ },
        decrement(state) { state.count-- },
        reset(state)     { state.count = 0 }
      }
    })

    await store.increment()
    expect(store.count).toBe(1)

    await store.increment()
    expect(store.count).toBe(2)

    await store.decrement()
    expect(store.count).toBe(1)

    await store.reset()
    expect(store.count).toBe(0)
  })

  it('passe les arguments à l action', async () => {
    const store = createStore({
      count: 0,
      actions: {
        add(state, n: number) { state.count += n },
        setName(state, name: string) { (state as any).name = name }
      }
    })

    await store.add(5)
    expect(store.count).toBe(5)

    await store.add(3)
    expect(store.count).toBe(8)
  })

  it('lance une erreur si action introuvable', async () => {
    const store = createStore({ count: 0 }) as any

    await expect(
      store.__store__.dispatch('inexistante')
    ).rejects.toThrow('[Stato] Action "inexistante" introuvable')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — ACTIONS ASYNC
// ─────────────────────────────────────────────────────

describe('createStore — actions asynchrones', () => {

  it('exécute une action async et met à jour le state', async () => {
    const store = createStore({
      data: null as string | null,
      isLoading: false,
      actions: {
        async loadData(state) {
          state.isLoading = true
          // Simule un appel API
          await new Promise(r => setTimeout(r, 10))
          state.data      = 'résultat'
          state.isLoading = false
        }
      }
    })

    expect(store.isLoading).toBe(false)
    const promise = store.loadData()
    // Pendant le chargement
    expect(store.isLoading).toBe(true)
    await promise
    // Après le chargement
    expect(store.isLoading).toBe(false)
    expect(store.data).toBe('résultat')
  })

  it('gère les erreurs dans les actions async', async () => {
    const store = createStore({
      error: null as string | null,
      actions: {
        async failAction(state) {
          try {
            throw new Error('erreur simulée')
          } catch (e) {
            state.error = (e as Error).message
          }
        }
      }
    })

    await store.failAction()
    expect(store.error).toBe('erreur simulée')
  })
})

// ─────────────────────────────────────────────────────
// TESTS — SUBSCRIBE
// ─────────────────────────────────────────────────────

describe('createStore — subscribe', () => {

  it('notifie les abonnés à chaque changement', async () => {
    const store    = createStore({
      count: 0,
      actions: { increment(state) { state.count++ } }
    })
    const listener = vi.fn()

    store.subscribe(listener)
    await store.increment()
    await store.increment()

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('désabonnement fonctionne correctement', async () => {
    const store    = createStore({
      count: 0,
      actions: { increment(state) { state.count++ } }
    })
    const listener = vi.fn()

    const unsubscribe = store.subscribe(listener)
    await store.increment()
    expect(listener).toHaveBeenCalledTimes(1)

    // Se désabonner
    unsubscribe()
    await store.increment()
    // Ne doit plus être appelé
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────
// TESTS — COMPUTED
// ─────────────────────────────────────────────────────

describe('createStore — computed', () => {

  it('computed retourne une valeur dérivée du state', async () => {
    const store = createStore({
      items: [
        { id: 1, done: true },
        { id: 2, done: false },
        { id: 3, done: true }
      ],
      actions: {
        addItem(state, item: { id: number, done: boolean }) {
          state.items.push(item)
        }
      },
      computed: {
        doneItems:   (state: any) => state.items.filter((i: any) => i.done),
        activeItems: (state: any) => state.items.filter((i: any) => !i.done),
        total:       (state: any) => state.items.length
      }
    })

    expect(store.doneItems).toHaveLength(2)
    expect(store.activeItems).toHaveLength(1)
    expect(store.total).toBe(3)

    await store.addItem({ id: 4, done: false })
    expect(store.activeItems).toHaveLength(2)
    expect(store.total).toBe(4)
  })
})

// ─────────────────────────────────────────────────────
// TESTS — HOOKS
// ─────────────────────────────────────────────────────

describe('createStore — hooks', () => {

  it('onAction est appelé avant chaque action', async () => {
    const onAction = vi.fn()
    const store    = createStore({
      count: 0,
      actions: {
        increment(state) { state.count++ }
      },
      hooks: { onAction }
    })

    await store.increment()
    expect(onAction).toHaveBeenCalledWith('increment', [])
  })

  it('onActionDone est appelé après chaque action', async () => {
    const onActionDone = vi.fn()
    const store        = createStore({
      count: 0,
      actions: {
        increment(state) { state.count++ }
      },
      hooks: { onActionDone }
    })

    await store.increment()
    expect(onActionDone).toHaveBeenCalledWith('increment', expect.any(Number))
  })

  it('onError est appelé quand une action échoue', async () => {
    const onError = vi.fn()
    const store   = createStore({
      count: 0,
      actions: {
        async failAction() {
          throw new Error('test erreur')
        }
      },
      hooks: { onError }
    })

    await expect(store.failAction()).rejects.toThrow('test erreur')
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      'failAction'
    )
  })

  it('onStateChange est appelé après chaque mutation', async () => {
    const onStateChange = vi.fn()
    const store         = createStore({
      count: 0,
      actions: {
        increment(state) { state.count++ }
      },
      hooks: { onStateChange }
    })

    await store.increment()
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ count: 0 }),
      expect.objectContaining({ count: 1 })
    )
  })

  
})

// ─────────────────────────────────────────────────────
// TESTS ADDITIONNELS — store.ts
// ─────────────────────────────────────────────────────

describe('createStore — cas avancés', () => {

  it('plusieurs abonnés notifiés en même temps', async () => {
    const store = createStore({
      count: 0,
      actions: { increment(state) { state.count++ } }
    })

    const l1 = vi.fn()
    const l2 = vi.fn()
    const l3 = vi.fn()

    store.subscribe(l1)
    store.subscribe(l2)
    store.subscribe(l3)

    await store.increment()

    expect(l1).toHaveBeenCalledTimes(1)
    expect(l2).toHaveBeenCalledTimes(1)
    expect(l3).toHaveBeenCalledTimes(1)
  })

  it('computed se recalcule après mutation', async () => {
    const store = createStore({
      items: [1, 2, 3] as number[],
      actions: {
        addItem(state, n: number) { state.items.push(n) }
      },
      computed: {
        total: (state: any) => state.items.length
      }
    })

    expect(store.total).toBe(3)
    await store.addItem(4)
    expect(store.total).toBe(4)
    await store.addItem(5)
    expect(store.total).toBe(5)
  })

  it('state avec valeurs null undefined et array', () => {
    const store = createStore({
      name:   null as string | null,
      count:  undefined as number | undefined,
      tags:   [] as string[],
      active: false
    })

    expect(store.name).toBeNull()
    expect(store.count).toBeUndefined()
    expect(store.tags).toEqual([])
    expect(store.active).toBe(false)
  })

  it('action modifie plusieurs propriétés en même temps', async () => {
    const store = createStore({
      user:      null as string | null,
      isLoading: false,
      error:     null as string | null,
      actions: {
        async loadUser(state) {
          state.isLoading = true
          state.error     = null
          await new Promise(r => setTimeout(r, 10))
          state.user      = 'Alice'
          state.isLoading = false
        }
      }
    })

    await store.loadUser()

    expect(store.user).toBe('Alice')
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('actions multiples enchaînées', async () => {
    const store = createStore({
      count: 0,
      actions: {
        increment(state) { state.count++ },
        double(state)    { state.count *= 2 },
        reset(state)     { state.count = 0 }
      }
    })

    await store.increment()
    await store.increment()
    await store.double()
    expect(store.count).toBe(4)

    await store.reset()
    expect(store.count).toBe(0)
  })

  it('onInit hook appelé à l initialisation', () => {
    const onInit = vi.fn()
    const store  = createStore({
      count: 0,
      hooks: { onInit }
    })

    store.__store__.init(store)
    expect(onInit).toHaveBeenCalledTimes(1)
  })

  it('onDestroy hook appelé à la destruction', () => {
    const onDestroy = vi.fn()
    const store     = createStore({
      count: 0,
      hooks: { onDestroy }
    })

    store.__store__.destroy(store)
    expect(onDestroy).toHaveBeenCalledTimes(1)
  })

  it('destroy nettoie les abonnés', async () => {
    const store    = createStore({
      count: 0,
      actions: { increment(state) { state.count++ } }
    })
    const listener = vi.fn()

    store.subscribe(listener)
    store.__store__.destroy(store)

    await store.increment()
    expect(listener).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────
// TESTS ADDITIONNELS — cas manquants store.ts
// ─────────────────────────────────────────────────────

describe('createStore — computed avancé', () => {

  it('getComputed lance une erreur si computed inexistant', () => {
    const store = createStore({ count: 0 })

    expect(() =>
      store.__store__.getComputed('inexistant')
    ).toThrow('[Stato] Computed "inexistant" introuvable')
  })

  it('computed inter-stores — tableau de dépendances', () => {
    // Simule deux stores dont le computed dépend
    const storeA = createStore({
      value: 10,
      actions: {
        setValue(state: any, v: number) { state.value = v }
      }
    })

    const storeB = createStore({
      multiplier: 2,
      computed: {
        // Computed qui lit storeA
        result: (state: any) => storeA.value * state.multiplier
      }
    })

    expect(storeB.result).toBe(20)
  })

  it('computed avec state imbriqué', () => {
    const store = createStore({
      user: { name: 'Alice', age: 30 },
      computed: {
        displayName: (state: any) => `${state.user.name} (${state.user.age} ans)`
      }
    })

    expect(store.displayName).toBe('Alice (30 ans)')
  })
})

describe('createStore — selectors memoïzés', () => {
  it('recalcule seulement quand les dépendances lues changent', async () => {
    const calls = vi.fn((state: any) =>
      state.students.filter((s: any) => s.grade >= 10)
    )

    const store = createStore({
      students: [{ id: '1', grade: 12 }, { id: '2', grade: 8 }],
      uiLoading: false,
      selectors: {
        passing: calls
      },
      actions: {
        toggleLoading(state: any) {
          state.uiLoading = !state.uiLoading
        },
        addStudent(state: any, student: any) {
          state.students = [...state.students, student]
        }
      }
    })

    expect(store.passing).toHaveLength(1)
    expect(calls).toHaveBeenCalledTimes(1)

    // `students` inchangé -> selector ne recalcule pas
    await store.toggleLoading()
    expect(store.passing).toHaveLength(1)
    expect(calls).toHaveBeenCalledTimes(1)

    // `students` change -> selector recalcule
    await store.addStudent({ id: '3', grade: 16 })
    expect(store.passing).toHaveLength(2)
    expect(calls).toHaveBeenCalledTimes(2)
  })
})

describe('createStore — effects réactifs', () => {
  it('déclenche un effect au changement de dépendance', async () => {
    const effectSpy = vi.fn()
    const store = createStore({
      count: 0,
      effects: [
        [(state: any) => state.count, (count) => effectSpy(count)]
      ],
      actions: {
        inc(state: any) {
          state.count++
        }
      }
    })

    // Exécution initiale
    await new Promise((r) => setTimeout(r, 0))
    expect(effectSpy).toHaveBeenCalledWith(0)

    await store.inc()
    await new Promise((r) => setTimeout(r, 0))
    expect(effectSpy).toHaveBeenCalledWith(1)
  })

  it('n exécute pas un effect si ses deps ne changent pas', async () => {
    const effectSpy = vi.fn()
    const store = createStore({
      count: 0,
      loading: false,
      effects: [
        [(state: any) => state.count, () => effectSpy()]
      ],
      actions: {
        toggleLoading(state: any) {
          state.loading = !state.loading
        }
      }
    })

    await new Promise((r) => setTimeout(r, 0))
    expect(effectSpy).toHaveBeenCalledTimes(1)

    await store.toggleLoading()
    await new Promise((r) => setTimeout(r, 0))
    expect(effectSpy).toHaveBeenCalledTimes(1)
  })

  it('appelle le cleanup précédent avant rerun', async () => {
    const cleanupSpy = vi.fn()
    const store = createStore({
      count: 0,
      effects: [
        [
          (state: any) => state.count,
          () => () => cleanupSpy()
        ]
      ],
      actions: {
        inc(state: any) {
          state.count++
        }
      }
    })

    await new Promise((r) => setTimeout(r, 0))
    await store.inc()
    await new Promise((r) => setTimeout(r, 0))

    expect(cleanupSpy).toHaveBeenCalledTimes(1)
  })
})

describe('createStore — stateProxy avancé', () => {

  it('modification d un array dans une action', async () => {
    const store = createStore({
      items: [] as string[],
      actions: {
        addItem(state: any, item: string) {
          state.items = [...state.items, item]
        },
        removeItem(state: any, item: string) {
          state.items = state.items.filter((i: string) => i !== item)
        },
        clearItems(state: any) {
          state.items = []
        }
      }
    })

    await store.addItem('pomme')
    await store.addItem('banane')
    await store.addItem('cerise')
    expect(store.items).toEqual(['pomme', 'banane', 'cerise'])

    await store.removeItem('banane')
    expect(store.items).toEqual(['pomme', 'cerise'])

    await store.clearItems()
    expect(store.items).toEqual([])
  })

  it('modification d un objet imbriqué dans une action', async () => {
    const store = createStore({
      user: { name: 'Alice', age: 30 } as { name: string, age: number },
      actions: {
        updateName(state: any, name: string) {
          state.user = { ...state.user, name }
        },
        birthday(state: any) {
          state.user = { ...state.user, age: state.user.age + 1 }
        }
      }
    })

    await store.updateName('Bob')
    expect(store.user.name).toBe('Bob')

    await store.birthday()
    expect(store.user.age).toBe(31)
  })
it('actions parallèles — race condition documentée', async () => {
  const store = createStore({
    count: 0,
    actions: {
      async increment(state: any) {
        await new Promise(r => setTimeout(r, 10))
        state.count++
      }
    }
  })

  // Actions parallèles = race condition
  // Chaque action lit le state au moment de son démarrage
  await Promise.all([
    store.increment(),
    store.increment(),
    store.increment()
  ])

  // Résultat réel : 1 — pas 3
  // Pour avoir 3, il faut séquencer les actions
  expect(store.count).toBe(1)
})

it('actions séquentielles — résultat garanti', async () => {
  const store = createStore({
    count: 0,
    actions: {
      async increment(state: any) {
        await new Promise(r => setTimeout(r, 10))
        state.count++
      }
    }
  })

  await store.increment()
  await store.increment()
  await store.increment()

  expect(store.count).toBe(3)
})
})

describe('createStore — registerCleanup et destroy', () => {

  it('registerCleanup — cleanup appelé au destroy', () => {
    const cleanup = vi.fn()
    const store   = createStore({ count: 0 })

    store.__store__.registerCleanup(cleanup)
    store.__store__.destroy(store)

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('plusieurs cleanups — tous appelés au destroy', () => {
    const cleanup1 = vi.fn()
    const cleanup2 = vi.fn()
    const cleanup3 = vi.fn()
    const store    = createStore({ count: 0 })

    store.__store__.registerCleanup(cleanup1)
    store.__store__.registerCleanup(cleanup2)
    store.__store__.registerCleanup(cleanup3)

    store.__store__.destroy(store)

    expect(cleanup1).toHaveBeenCalledTimes(1)
    expect(cleanup2).toHaveBeenCalledTimes(1)
    expect(cleanup3).toHaveBeenCalledTimes(1)
  })

  it('destroy — cleanups vidés après appel', () => {
    const cleanup = vi.fn()
    const store   = createStore({ count: 0 })

    store.__store__.registerCleanup(cleanup)

    // Premier destroy
    store.__store__.destroy(store)
    expect(cleanup).toHaveBeenCalledTimes(1)

    // Deuxième destroy — cleanup ne doit pas être rappelé
    store.__store__.destroy(store)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('destroy — abonnés ne reçoivent plus rien après destroy', async () => {
    const store    = createStore({
      count: 0,
      actions: { increment(state: any) { state.count++ } }
    })
    const listener = vi.fn()

    store.subscribe(listener)
    store.__store__.destroy(store)

    await store.increment()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('createStore — state complexe', () => {

  it('state avec tous les types primitifs', () => {
    const store = createStore({
      str:   'hello',
      num:   42,
      bool:  true,
      nil:   null  as null,
      undef: undefined as undefined,
      arr:   [1, 2, 3],
      obj:   { a: 1, b: 2 }
    })

    expect(store.str).toBe('hello')
    expect(store.num).toBe(42)
    expect(store.bool).toBe(true)
    expect(store.nil).toBeNull()
    expect(store.undef).toBeUndefined()
    expect(store.arr).toEqual([1, 2, 3])
    expect(store.obj).toEqual({ a: 1, b: 2 })
  })

  it('plusieurs stores indépendants ne s interfèrent pas', async () => {
    const storeA = createStore({
      count: 0,
      actions: { inc(state: any) { state.count++ } }
    })

    const storeB = createStore({
      count: 100,
      actions: { inc(state: any) { state.count++ } }
    })

    await storeA.inc()
    await storeA.inc()
    await storeB.inc()

    expect(storeA.count).toBe(2)
    expect(storeB.count).toBe(101)
  })
})