import { describe, it, expect } from 'vitest'
import { createStore } from '../store'
import { createEntityAdapter } from '../helpers/entity-adapter'

type Student = {
  id: string
  name: string
  grade: number
}

describe('createEntityAdapter()', () => {
  it('getInitialState initialise ids/entities', () => {
    const adapter = createEntityAdapter<Student>()
    const state = adapter.getInitialState({ loading: false })
    expect(state.ids).toEqual([])
    expect(state.entities).toEqual({})
    expect(state.loading).toBe(false)
  })

  it('addOne/addMany/setAll', () => {
    const adapter = createEntityAdapter<Student>()
    const state = adapter.getInitialState()

    adapter.addOne({ id: '1', name: 'Alice', grade: 12 }, state)
    adapter.addMany(
      [
        { id: '2', name: 'Bob', grade: 14 },
        { id: '3', name: 'Carol', grade: 10 }
      ],
      state
    )
    expect(state.ids).toEqual(['1', '2', '3'])

    adapter.setAll([{ id: '9', name: 'Zed', grade: 18 }], state)
    expect(state.ids).toEqual(['9'])
    expect(state.entities['9'].name).toBe('Zed')
  })

  it('upsert/update/remove', () => {
    const adapter = createEntityAdapter<Student>()
    const state = adapter.getInitialState()

    adapter.upsertOne({ id: '1', name: 'Alice', grade: 12 }, state)
    adapter.upsertOne({ id: '1', name: 'Alice2', grade: 13 }, state)
    expect(state.ids).toEqual(['1'])
    expect(state.entities['1'].name).toBe('Alice2')

    adapter.updateOne({ id: '1', changes: { grade: 20 } }, state)
    expect(state.entities['1'].grade).toBe(20)

    adapter.removeOne('1', state)
    expect(state.ids).toEqual([])
    expect(state.entities['1']).toBeUndefined()
  })

  it('sortComparer garde ids triés', () => {
    const adapter = createEntityAdapter<Student>({
      sortComparer: (a, b) => a.name.localeCompare(b.name)
    })
    const state = adapter.getInitialState()
    adapter.addMany(
      [
        { id: '2', name: 'Bob', grade: 14 },
        { id: '1', name: 'Alice', grade: 12 }
      ],
      state
    )
    expect(state.ids).toEqual(['1', '2'])
  })

  it('selectors locaux et via selectState', async () => {
    const adapter = createEntityAdapter<Student>()
    const base = adapter.getInitialState()
    adapter.addMany(
      [
        { id: '1', name: 'Alice', grade: 12 },
        { id: '2', name: 'Bob', grade: 14 }
      ],
      base
    )

    const local = adapter.getSelectors()
    expect(local.selectTotal(base)).toBe(2)
    expect(local.selectById(base, '1')?.name).toBe('Alice')

    const wrapped = { students: base }
    const scoped = adapter.getSelectors<typeof wrapped>((s) => s.students)
    expect(scoped.selectAll(wrapped).map((x) => x.name)).toEqual(['Alice', 'Bob'])

    // mini integration createStore
    const store = createStore({
      students: adapter.getInitialState(),
      actions: {
        load(state: any) {
          adapter.setAll(
            [
              { id: '1', name: 'Alice', grade: 12 },
              { id: '2', name: 'Bob', grade: 14 }
            ],
            state.students
          )
        }
      },
      selectors: {
        allStudents: (state: any) => scoped.selectAll({ students: state.students }),
        totalStudents: (state: any) => scoped.selectTotal({ students: state.students })
      }
    })

    await store.load()
    expect(store.totalStudents).toBe(2)
    expect(store.allStudents[0].name).toBe('Alice')
  })
})

