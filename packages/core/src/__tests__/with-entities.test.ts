import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../store'
import { createEntityAdapter } from '../helpers/entity-adapter'
import { withEntities } from '../helpers/with-entities'

type Todo = { id: string; title: string; done: boolean }

describe('withEntities()', () => {
  it('injecte slice + actions + selectors et notifie subscribers', async () => {
    const adapter = createEntityAdapter<Todo>()
    const store = createStore(
      withEntities(
        {
          // UI state
          loading: false,
          // entity slice will be injected at key "todos"
        } as any,
        { key: 'todos', adapter }
      )
    ) as any

    const sub = vi.fn()
    store.subscribe(sub)

    await store.todosAddOne({ id: '1', title: 'A', done: false })
    expect(store.todosTotal).toBe(1)
    expect(store.todosAll[0].title).toBe('A')
    expect(sub).toHaveBeenCalledTimes(1)

    await store.todosUpdateOne({ id: '1', changes: { done: true } })
    expect(store.todosById('1')?.done).toBe(true)
    expect(sub).toHaveBeenCalledTimes(2)

    await store.todosRemoveOne('1')
    expect(store.todosTotal).toBe(0)
    expect(sub).toHaveBeenCalledTimes(3)
  })

  it('supporte initial entities et custom names', async () => {
    const adapter = createEntityAdapter<Todo>()
    const store = createStore(
      withEntities(
        {
          name: 'demo'
        } as any,
        {
          key: 'items',
          adapter,
          initial: [{ id: '1', title: 'X', done: false }],
          actions: { addOne: 'addItem' },
          selectors: { total: 'totalItems', all: 'allItems', byId: 'byId' }
        }
      )
    ) as any

    expect(store.totalItems).toBe(1)
    expect(store.allItems[0].title).toBe('X')
    expect(store.byId('1')?.title).toBe('X')

    await store.addItem({ id: '2', title: 'Y', done: true })
    expect(store.totalItems).toBe(2)
  })
})

