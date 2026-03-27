import { inject } from '@angular/core'
import {
  createStore,
  abortable,
  debounced,
  exclusive,
  optimistic,
  fromStream,
  retryable,
  queued,
  connectDevTools,
  withPersist
} from '@ngstato/core'
import { StatoStore } from '@ngstato/angular'
import { StudentService } from '../services/student.service'
import type {
  Student,
  StudentCreate,
  StudentUpdate,
  StudentNotification
} from '../../../core/models/student.model'

export function createStudentStore(service: StudentService) {
  const store = createStore(
    withPersist({
      students: [] as Student[],
      selected: null as Student | null,
      isLoading: false,
      error: null as string | null,
      searchQuery: '',
      notifications: [] as StudentNotification[],

      selectors: {
        total: (state: any) =>
          state.students.length,

        average: (state: any) => {
          if (!state.students.length) return 0
          const sum = state.students.reduce(
            (acc: number, s: Student) => acc + s.grade, 0
          )
          return Math.round(sum / state.students.length * 10) / 10
        },

        passing: (state: any) =>
          state.students.filter((s: Student) => s.grade >= 10),

        failing: (state: any) =>
          state.students.filter((s: Student) => s.grade < 10),

        topStudents: (state: any) =>
          [...state.students]
            .sort((a: Student, b: Student) => b.grade - a.grade)
            .slice(0, 3),

        filtered: (state: any) => {
          if (!state.searchQuery) return state.students
          const q = state.searchQuery.toLowerCase()
          return state.students.filter((s: Student) =>
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q)
          )
        }
      },

      actions: {
      loadStudents: retryable(
        async (state: any) => {
          state.isLoading = true
          state.error = null
          state.students = await service.getAll()
          state.isLoading = false
        },
        { attempts: 3, backoff: 'fixed', delay: 1000 }
      ),

      async addStudent(state: any, student: StudentCreate) {
        state.isLoading = true
        const created = await service.create(student)
        state.students = [...state.students, created]
        state.isLoading = false
      },

      async updateStudent(state: any, id: string, updates: StudentUpdate) {
        state.isLoading = true
        if (!id.startsWith('local-')) {
          await service.update(id, updates)
        }
        state.students = state.students.map((s: Student) =>
          s.id === id ? { ...s, ...updates } : s
        )
        if (state.selected?.id === id) {
          state.selected = { ...state.selected, ...updates }
        }
        state.isLoading = false
      },

      deleteStudent: optimistic(
        (state: any, id: string) => {
          state.students = state.students.filter((s: Student) => s.id !== id)
          if (state.selected?.id === id) state.selected = null
        },
        async (state: any, id: string) => {
          await service.delete(id)
        }
      ),

      selectStudent(state: any, student: Student | null) {
        state.selected = student
      },

      search: debounced(
        (state: any, query: string) => {
          state.searchQuery = query
        },
        300
      ),

      searchRemote: abortable(
        async (state: any, query: string, { signal }: any) => {
          if (!query.trim()) {
            state.searchQuery = ''
            return
          }
          state.isLoading = true
          state.students = await service.search(query)
          state.searchQuery = query
          state.isLoading = false
        }
      ),

      // Démo async helpers — exclusive vs queued
      // exclusive : ignore les appels pendant l'exécution courante
      searchRemoteExclusive: exclusive(async (state: any, query: string) => {
        if (!query.trim()) {
          state.searchQuery = ''
          return
        }

        state.isLoading = true
        await new Promise<void>(resolve => setTimeout(resolve, 600))
        state.students = await service.search(query)
        state.searchQuery = query
        state.isLoading = false
      }),

      // queued : exécute les appels dans l'ordre d'arrivée
      searchRemoteQueued: queued(async (state: any, query: string) => {
        if (!query.trim()) {
          state.searchQuery = ''
          return
        }

        state.isLoading = true
        await new Promise<void>(resolve => setTimeout(resolve, 600))
        state.students = await service.search(query)
        state.searchQuery = query
        state.isLoading = false
      }),

      listenNotifications: fromStream(
        (_state: any) => ({
          subscribe: (observer: any) => {
            let count = 0
            const timer = setInterval(() => {
              count++
              observer.next({
                type: 'updated',
                studentId: String(count),
                at: new Date().toISOString()
              })
              if (count >= 5) {
                observer.complete()
                clearInterval(timer)
              }
            }, 3000)
            return { unsubscribe: () => clearInterval(timer) }
          }
        }),
        (state: any, notification: StudentNotification) => {
          state.notifications = [...state.notifications, notification]
        },
        {
          onError: (err: any) => console.error('[StudentStore]', err),
          onComplete: () => console.log('[StudentStore] complete')
        }
      ),

      reset(state: any) {
        state.students = []
        state.selected = null
        state.isLoading = false
        state.error = null
        state.searchQuery = ''
        state.notifications = []
      }
    },

      hooks: {
        onStateChange: (prev: any, next: any) => {
          if (prev.students.length !== next.students.length) {
            console.log(
              `[StudentStore] students: ${prev.students.length} → ${next.students.length}`
            )
          }
        }
      }
    }, {
      key: 'ngstato:student-store',
      version: 1,
      pick: ['students', 'selected', 'searchQuery']
    })
  )

  connectDevTools(store, 'StudentStore')
  return store
}

export const StudentStore = StatoStore(() => {
  const service = inject(StudentService)
  return createStudentStore(service)
})
