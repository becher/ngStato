// ─────────────────────────────────────────────────────
// Stato Demo — Student model
// ─────────────────────────────────────────────────────

export interface Student {
  id:     string
  name:   string
  email:  string
  grade:  number   // note sur 20
  active: boolean
}

export interface StudentCreate {
  name:   string
  email:  string
  grade:  number
  active: boolean
}

export interface StudentUpdate {
  name?:   string
  email?:  string
  grade?:  number
  active?: boolean
}

export interface StudentNotification {
  type:      'added' | 'updated' | 'deleted'
  studentId: string
  at:        string
}

export interface StudentState {
  students:      Student[]
  selected:      Student | null
  isLoading:     boolean
  error:         string | null
  searchQuery:   string
  notifications: StudentNotification[]
}