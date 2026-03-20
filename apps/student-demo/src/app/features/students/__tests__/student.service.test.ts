import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StudentService } from '../services/student.service'
import { configureHttp }  from '@ngstato/core'

// ─── Mock http ────────────────────────────────────────────────────────────────

vi.mock('@ngstato/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ngstato/core')>()
  return {
    ...actual,
    http: {
      get:    vi.fn(),
      post:   vi.fn(),
      put:    vi.fn(),
      patch:  vi.fn(),
      delete: vi.fn()
    }
  }
})

import { http } from '@ngstato/core'

// ─── SETUP ────────────────────────────────────────────────────────────────────

const mockUsers = [
  { id: 1, name: 'Alice Martin',  email: 'alice@test.com'  },
  { id: 2, name: 'Bob Dupont',    email: 'bob@test.com'    },
  { id: 3, name: 'Carol Bernard', email: 'carol@test.com'  },
]

let service: StudentService

beforeEach(() => {
  service = new StudentService()
  vi.clearAllMocks()
})

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('StudentService', () => {

  describe('getAll()', () => {
    it('retourne les étudiants mappés depuis l\'API', async () => {
      vi.mocked(http.get).mockResolvedValue(mockUsers)

      const result = await service.getAll()

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        id:    '1',
        name:  'Alice Martin',
        email: 'alice@test.com'
      })
      expect(result[0].grade).toBeGreaterThanOrEqual(8)
      expect(result[0].grade).toBeLessThanOrEqual(20)
      expect(result[0].active).toBe(true)
    })

    it('appelle /users', async () => {
      vi.mocked(http.get).mockResolvedValue(mockUsers)
      await service.getAll()
      expect(http.get).toHaveBeenCalledWith('/users')
    })

    it('retourne un tableau vide si l\'API retourne []', async () => {
      vi.mocked(http.get).mockResolvedValue([])
      const result = await service.getAll()
      expect(result).toHaveLength(0)
    })

    it('propage les erreurs HTTP', async () => {
      vi.mocked(http.get).mockRejectedValue(new Error('Network error'))
      await expect(service.getAll()).rejects.toThrow('Network error')
    })
  })

  describe('getById()', () => {
    it('retourne l\'étudiant mappé', async () => {
      vi.mocked(http.get).mockResolvedValue(mockUsers[0])

      const result = await service.getById('1')

      expect(result).toMatchObject({ id: '1', name: 'Alice Martin' })
      expect(http.get).toHaveBeenCalledWith('/users/1')
    })
  })

  describe('create()', () => {
    it('crée un étudiant et retourne avec id local unique', async () => {
      vi.mocked(http.post).mockResolvedValue({ id: 11 })

      const student = { name: 'Dave', email: 'dave@test.com', grade: 14, active: true }
      const result  = await service.create(student)

      expect(result.name).toBe('Dave')
      expect(result.id).toMatch(/^local-\d+$/)
      expect(http.post).toHaveBeenCalledWith('/users', student)
    })

    it('appelle /users en POST', async () => {
      vi.mocked(http.post).mockResolvedValue({ id: 11 })
      await service.create({ name: 'Test', email: 't@t.com', grade: 10, active: true })
      expect(http.post).toHaveBeenCalledTimes(1)
    })
  })

  describe('update()', () => {
    it('appelle /users/:id en PUT', async () => {
      vi.mocked(http.put).mockResolvedValue(undefined)

      await service.update('1', { name: 'Alice Updated' })

      expect(http.put).toHaveBeenCalledWith('/users/1', { name: 'Alice Updated' })
    })

    it('ne retourne rien', async () => {
      vi.mocked(http.put).mockResolvedValue(undefined)
      const result = await service.update('1', { grade: 15 })
      expect(result).toBeUndefined()
    })
  })

  describe('delete()', () => {
    it('appelle /users/:id en DELETE', async () => {
      vi.mocked(http.delete).mockResolvedValue(undefined)

      await service.delete('1')

      expect(http.delete).toHaveBeenCalledWith('/users/1')
    })

    it('ne retourne rien', async () => {
      vi.mocked(http.delete).mockResolvedValue(undefined)
      const result = await service.delete('1')
      expect(result).toBeUndefined()
    })
  })

  describe('search()', () => {
    it('appelle /users avec le paramètre q', async () => {
      vi.mocked(http.get).mockResolvedValue(mockUsers)

      await service.search('alice')

      expect(http.get).toHaveBeenCalledWith('/users', { params: { q: 'alice' } })
    })

    it('retourne les résultats mappés', async () => {
      vi.mocked(http.get).mockResolvedValue([mockUsers[0]])
      const result = await service.search('alice')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Alice Martin')
    })
  })
})