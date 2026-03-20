import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StudentService }  from '../services/student.service'

// ─── MOCK SERVICE ─────────────────────────────────────────────────────────────

const mockStudents = [
  { id: '1', name: 'Alice Martin',  email: 'alice@test.com',  grade: 15, active: true },
  { id: '2', name: 'Bob Dupont',    email: 'bob@test.com',    grade: 8,  active: true },
  { id: '3', name: 'Carol Laurent', email: 'carol@test.com',  grade: 12, active: true },
]

const mockService = {
  getAll:  vi.fn().mockResolvedValue(mockStudents),
  getById: vi.fn().mockResolvedValue(mockStudents[0]),
  create:  vi.fn().mockImplementation(async (s) => ({ ...s, id: `local-${Date.now()}` })),
  update:  vi.fn().mockResolvedValue(undefined),
  delete:  vi.fn().mockResolvedValue(undefined),
  search:  vi.fn().mockResolvedValue(mockStudents),
} as unknown as StudentService

// ─── IMPORT STORE ─────────────────────────────────────────────────────────────

// Import dynamique pour injecter le mock service
async function makeStore() {
  const { createStore, debounced, optimistic, retryable } = await import('@ngstato/core')

  return createStore({
    students:      [] as typeof mockStudents,
    selected:      null as (typeof mockStudents[0]) | null,
    isLoading:     false,
    error:         null as string | null,
    searchQuery:   '',
    notifications: [] as any[],

    computed: {
      total:       (s: any) => s.students.length,
      average:     (s: any) => {
        if (!s.students.length) return 0
        return Math.round(
          s.students.reduce((a: number, x: any) => a + x.grade, 0) / s.students.length * 10
        ) / 10
      },
      passing:     (s: any) => s.students.filter((x: any) => x.grade >= 10),
      failing:     (s: any) => s.students.filter((x: any) => x.grade < 10),
      topStudents: (s: any) => [...s.students]
        .sort((a: any, b: any) => b.grade - a.grade).slice(0, 3),
      filtered:    (s: any) => {
        if (!s.searchQuery) return s.students
        const q = s.searchQuery.toLowerCase()
        return s.students.filter((x: any) =>
          x.name.toLowerCase().includes(q) ||
          x.email.toLowerCase().includes(q)
        )
      }
    },

    actions: {
      async loadStudents(state: any) {
        state.isLoading = true
        state.error     = null
        state.students  = await mockService.getAll()
        state.isLoading = false
      },

      async addStudent(state: any, student: any) {
        state.isLoading = true
        const created   = await mockService.create(student)
        state.students  = [...state.students, created]
        state.isLoading = false
      },

      async updateStudent(state: any, id: string, updates: any) {
        await mockService.update(id, updates)
        state.students = state.students.map((s: any) =>
          s.id === id ? { ...s, ...updates } : s
        )
      },

      deleteStudent: optimistic(
        (state: any, id: string) => {
          state.students = state.students.filter((s: any) => s.id !== id)
          if (state.selected?.id === id) state.selected = null
        },
        async (_state: any, id: string) => {
          await mockService.delete(id)
        }
      ),

      selectStudent(state: any, student: any) {
        state.selected = student
      },

      search: debounced(
        (state: any, query: string) => { state.searchQuery = query },
        300
      ),

      reset(state: any) {
        state.students    = []
        state.selected    = null
        state.isLoading   = false
        state.error       = null
        state.searchQuery = ''
      }
    }
  })
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('StudentStore', () => {

  let store: Awaited<ReturnType<typeof makeStore>>

  beforeEach(async () => {
    store = await makeStore()
    vi.clearAllMocks()
  })

  // ── STATE INITIAL ──────────────────────────────────────────────────────────

  describe('state initial', () => {

    it('students est vide', () => {
      expect(store.students).toHaveLength(0)
    })

    it('isLoading est false', () => {
      expect(store.isLoading).toBe(false)
    })

    it('selected est null', () => {
      expect(store.selected).toBeNull()
    })

    it('searchQuery est vide', () => {
      expect(store.searchQuery).toBe('')
    })
  })

  // ── COMPUTED ───────────────────────────────────────────────────────────────

  describe('computed', () => {

    beforeEach(async () => {
      await store.loadStudents()
    })

    it('total retourne le nombre d\'étudiants', () => {
      expect(store.total).toBe(3)
    })

    it('average calcule la moyenne correcte', () => {
      // (15 + 8 + 12) / 3 = 11.7
      expect(store.average).toBe(11.7)
    })

    it('passing retourne les étudiants >= 10', () => {
      expect(store.passing).toHaveLength(2)
      expect(store.passing.map((s: any) => s.name)).toContain('Alice Martin')
      expect(store.passing.map((s: any) => s.name)).toContain('Carol Laurent')
    })

    it('failing retourne les étudiants < 10', () => {
      expect(store.failing).toHaveLength(1)
      expect(store.failing[0].name).toBe('Bob Dupont')
    })

    it('topStudents retourne les 3 meilleurs triés', () => {
      expect(store.topStudents[0].name).toBe('Alice Martin')
      expect(store.topStudents[0].grade).toBe(15)
    })

    it('filtered retourne tous si searchQuery vide', () => {
      expect(store.filtered).toHaveLength(3)
    })

    it('filtered filtre par nom', async () => {
      await store.search('alice')
      // attendre le debounce
      await new Promise(r => setTimeout(r, 350))
      expect(store.filtered).toHaveLength(1)
      expect(store.filtered[0].name).toBe('Alice Martin')
    })

    it('filtered filtre par email', async () => {
      await store.search('bob@')
      await new Promise(r => setTimeout(r, 350))
      expect(store.filtered).toHaveLength(1)
      expect(store.filtered[0].email).toBe('bob@test.com')
    })
  })

  // ── LOAD STUDENTS ──────────────────────────────────────────────────────────

  describe('loadStudents()', () => {

    it('charge les étudiants', async () => {
      await store.loadStudents()
      expect(store.students).toHaveLength(3)
    })

    it('isLoading passe à false après chargement', async () => {
      await store.loadStudents()
      expect(store.isLoading).toBe(false)
    })

    it('appelle service.getAll()', async () => {
      await store.loadStudents()
      expect(mockService.getAll).toHaveBeenCalledOnce()
    })

  it('reset error avant chargement', async () => {
  mockService.getAll = vi.fn()
    .mockRejectedValueOnce(new Error('fail'))
    .mockResolvedValue(mockStudents)

  try { await store.loadStudents() } catch {}

  await store.loadStudents()
  expect(store.error).toBeNull()
})
  })

  // ── ADD STUDENT ────────────────────────────────────────────────────────────

  describe('addStudent()', () => {

    beforeEach(async () => {
      await store.loadStudents()
    })

    it('ajoute un étudiant à la liste', async () => {
      const nouveau = { name: 'Dave', email: 'dave@test.com', grade: 14, active: true }
      await store.addStudent(nouveau)
      expect(store.students).toHaveLength(4)
    })

    it('le nouvel étudiant a un id local', async () => {
      const nouveau = { name: 'Dave', email: 'dave@test.com', grade: 14, active: true }
      await store.addStudent(nouveau)
      const last = store.students[store.students.length - 1]
      expect(last.id).toContain('local-')
    })

    it('isLoading passe à false après ajout', async () => {
      await store.addStudent({ name: 'X', email: 'x@test.com', grade: 10, active: true })
      expect(store.isLoading).toBe(false)
    })
  })

  // ── UPDATE STUDENT ─────────────────────────────────────────────────────────

  describe('updateStudent()', () => {

    beforeEach(async () => {
      await store.loadStudents()
    })

    it('met à jour la note d\'un étudiant', async () => {
      await store.updateStudent('1', { grade: 19 })
      const alice = store.students.find((s: any) => s.id === '1')
      expect(alice?.grade).toBe(19)
    })

    it('appelle service.update()', async () => {
      await store.updateStudent('2', { grade: 11 })
      expect(mockService.update).toHaveBeenCalledWith('2', { grade: 11 })
    })
  })

  // ── DELETE STUDENT ─────────────────────────────────────────────────────────

  describe('deleteStudent()', () => {

    beforeEach(async () => {
      await store.loadStudents()
    })

    it('supprime l\'étudiant de la liste', async () => {
      await store.deleteStudent('1')
      expect(store.students).toHaveLength(2)
      expect(store.students.find((s: any) => s.id === '1')).toBeUndefined()
    })

    it('désélectionne si l\'étudiant supprimé était sélectionné', async () => {
      store.selectStudent(mockStudents[0])
      expect(store.selected?.id).toBe('1')
      await store.deleteStudent('1')
      expect(store.selected).toBeNull()
    })

    it('optimistic — suppression immédiate avant API', async () => {
      let countBeforeApi = 0
      mockService.delete = vi.fn().mockImplementation(async () => {
        countBeforeApi = store.students.length
      })
      await store.deleteStudent('1')
      // Au moment où l'API est appelée, l'étudiant est déjà supprimé
      expect(countBeforeApi).toBe(2)
    })

  it('optimistic — rollback si API échoue', async () => {
  mockService.delete = vi.fn().mockRejectedValue(new Error('API error'))

  try {
    await store.deleteStudent('1')
  } catch {}

  expect(store.students).toHaveLength(3)
})
  })

  // ── SELECT STUDENT ─────────────────────────────────────────────────────────

  describe('selectStudent()', () => {

    it('sélectionne un étudiant', () => {
      store.selectStudent(mockStudents[0])
      expect(store.selected?.id).toBe('1')
    })

    it('désélectionne si null', () => {
      store.selectStudent(mockStudents[0])
      store.selectStudent(null)
      expect(store.selected).toBeNull()
    })
  })

  // ── RESET ──────────────────────────────────────────────────────────────────

  describe('reset()', () => {

    it('remet le state à zéro', async () => {
      await store.loadStudents()
      store.selectStudent(mockStudents[0])
      store.reset()

      expect(store.students).toHaveLength(0)
      expect(store.selected).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.searchQuery).toBe('')
    })
  })
})