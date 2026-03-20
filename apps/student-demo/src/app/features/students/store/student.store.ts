// ─────────────────────────────────────────────────────
// Stato Demo — Student store
// ─────────────────────────────────────────────────────

import { inject }      from '@angular/core'
import {
  createStore,
  abortable,
  debounced,
  optimistic,
  fromStream,
  retryable
}                      from '@ngstato/core'
import { StudentService } from '../services/student.service'
import type {
  Student,
  StudentCreate,
  StudentUpdate,
  StudentNotification
}                      from '../../../core/models/student.model'

// ─────────────────────────────────────────────────────
// FACTORY — createStudentStore()
// Prend le service en paramètre — facilement testable
// ─────────────────────────────────────────────────────

export function createStudentStore(service: StudentService) {
  const store = createStore({

    // ─── STATE ─────────────────────────────────────
    students:      [] as Student[],
    selected:      null as Student | null,
    isLoading:     false,
    error:         null as string | null,
    searchQuery:   '',
    notifications: [] as StudentNotification[],

    // ─── COMPUTED ──────────────────────────────────
    computed: {
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

    // ─── ACTIONS ───────────────────────────────────
    actions: {

      // Charger tous les étudiants avec retry
      loadStudents: retryable(
        async (state: any) => {
          state.isLoading = true
          state.error     = null
          state.students  = await service.getAll()
          state.isLoading = false
        },
        { attempts: 3, backoff: 'fixed', delay: 1000 }
      ),

      // Ajouter un étudiant
      async addStudent(state: any, student: StudentCreate) {
        state.isLoading = true
        const created   = await service.create(student)
        state.students  = [...state.students, created]
        state.isLoading = false
      },

      // Mettre à jour un étudiant
    async updateStudent(state: any, id: string, updates: StudentUpdate) {
    state.isLoading = true

    // Si id local (ajouté en demo) — pas d'appel API
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

      // Supprimer avec optimistic update + rollback
      deleteStudent: optimistic(
        (state: any, id: string) => {
          state.students = state.students.filter((s: Student) => s.id !== id)
          if (state.selected?.id === id) state.selected = null
        },
        async (state: any, id: string) => {
          await service.delete(id)
        }
      ),

      // Sélectionner un étudiant
      selectStudent(state: any, student: Student | null) {
        state.selected = student
      },

      // Recherche locale avec debounce
      search: debounced(
        (state: any, query: string) => {
          state.searchQuery = query
        },
        300
      ),

      // Recherche distante avec annulation automatique
      searchRemote: abortable(
        async (state: any, query: string, { signal }: any) => {
          if (!query.trim()) {
            state.searchQuery = ''
            return
          }
          state.isLoading   = true
          state.students    = await service.search(query)
          state.searchQuery = query
          state.isLoading   = false
        }
      ),

      // Notifications temps réel
      listenNotifications: fromStream(
        (_state: any) => ({
          subscribe: (observer: any) => {
            // Simuler un stream de notifications
            let count    = 0
            const timer  = setInterval(() => {
              count++
              observer.next({
                type:      'updated',
                studentId: String(count),
                at:        new Date().toISOString()
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
          onError:    (err: any) => console.error('[StudentStore] stream:', err),
          onComplete: ()         => console.log('[StudentStore] stream terminé')
        }
      ),

      // Réinitialiser
      reset(state: any) {
        state.students      = []
        state.selected      = null
        state.isLoading     = false
        state.error         = null
        state.searchQuery   = ''
        state.notifications = []
      }
    },

    // ─── HOOKS ─────────────────────────────────────
 hooks: {
  onStateChange: (prev: any, next: any) => {
    if (prev.students.length !== next.students.length) {
      console.log(`[StudentStore] étudiants: ${prev.students.length} → ${next.students.length}`)
    }
  }
}
  })
    connectDevTools(store, 'StudentStore')  // ← une ligne
    return store
}

// ─────────────────────────────────────────────────────
// SERVICE ANGULAR — StudentStore injectable
// ─────────────────────────────────────────────────────

import { Injectable, OnDestroy } from '@angular/core'
import { devTools } from '@ngstato/core'
import { connectDevTools } from '@ngstato/core'

@Injectable({ providedIn: 'root' })
export class StudentStore implements OnDestroy {

  private _store = createStudentStore(inject(StudentService))

  // ─── State en lecture directe ───────────────────
  get students()      { return this._store.students      }
  get selected()      { return this._store.selected      }
  get isLoading()     { return this._store.isLoading     }
  get error()         { return this._store.error         }
  get searchQuery()   { return this._store.searchQuery   }
  get notifications() { return this._store.notifications }

  // ─── Computed ───────────────────────────────────
  get total()        { return this._store.total        }
  get average()      { return this._store.average      }
  get passing()      { return this._store.passing      }
  get failing()      { return this._store.failing      }
  get topStudents()  { return this._store.topStudents  }
  get filtered()     { return this._store.filtered     }

  // ─── Actions ────────────────────────────────────
  loadStudents        = (...args: any[]) => this._store.loadStudents(...args)
  addStudent          = (...args: any[]) => this._store.addStudent(...args)
  updateStudent       = (...args: any[]) => this._store.updateStudent(...args)
  deleteStudent       = (...args: any[]) => this._store.deleteStudent(...args)
  selectStudent       = (...args: any[]) => this._store.selectStudent(...args)
  search              = (...args: any[]) => this._store.search(...args)
  searchRemote        = (...args: any[]) => this._store.searchRemote(...args)
  listenNotifications = (...args: any[]) => this._store.listenNotifications(...args)
  reset               = (...args: any[]) => this._store.reset(...args)

  ngOnDestroy() {
    this._store.__store__.destroy(this._store)
  }
}