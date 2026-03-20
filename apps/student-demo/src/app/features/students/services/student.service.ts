// ─────────────────────────────────────────────────────
// Stato Demo — Student service
// Tous les appels HTTP via le client http de Stato
// ─────────────────────────────────────────────────────

import { Injectable }                         from '@angular/core'
import { http }                               from '@ngstato/core'
import type { Student, StudentCreate, StudentUpdate } from '../../../core/models/student.model'

@Injectable({ providedIn: 'root' })
export class StudentService {

  // Charger tous les étudiants
  async getAll(): Promise<Student[]> {
    const users = await http.get<any[]>('/users')

    return users.map((u, i) => ({
      id:     String(u.id),
      name:   u.name,
      email:  u.email,
      grade:  Math.round(8 + Math.random() * 12),
      active: true
    }))
  }

  // Charger un étudiant par id
  async getById(id: string): Promise<Student> {
    const user = await http.get<any>(`/users/${id}`)

    return {
      id:     String(user.id),
      name:   user.name,
      email:  user.email,
      grade:  Math.round(8 + Math.random() * 12),
      active: true
    }
  }

  // Créer un étudiant
  async create(student: StudentCreate): Promise<Student> {
    const created = await http.post<any>('/users', student)

    // jsonplaceholder retourne toujours id:11
  // on génère un id unique côté client
  return { ...student, id: `local-${Date.now()}` }
  }

  // Mettre à jour un étudiant
async update(id: string, updates: StudentUpdate): Promise<void> {
  await http.put(`/users/${id}`, updates)
}

  // Supprimer un étudiant
  async delete(id: string): Promise<void> {
    await http.delete(`/users/${id}`)
  }

  // Rechercher des étudiants
  async search(query: string): Promise<Student[]> {
    const users = await http.get<any[]>('/users', {
      params: { q: query }
    })

    return users.map(u => ({
      id:     String(u.id),
      name:   u.name,
      email:  u.email,
      grade:  Math.round(8 + Math.random() * 12),
      active: true
    }))
  }
}