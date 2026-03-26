import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core'
import { CommonModule }              from '@angular/common'
import { FormsModule }               from '@angular/forms'
import { StudentStore }              from '../../store/student.store'
import type { StudentCreate }        from '../../../../core/models/student.model'
import { injectStore }               from '@ngstato/angular'

@Component({
  selector:   'app-student-form',
  standalone: true,
  imports:    [CommonModule, FormsModule],
  template: `
    <div class="form-card">
      <h3>{{ isEditing() ? 'Modifier' : 'Ajouter' }} un étudiant</h3>

      <div class="form-group">
        <label>Nom complet</label>
        <input
          type="text"
          [(ngModel)]="name"
          placeholder="ex: Alice Martin"
          [class.input--error]="submitted() && !name"
        />
        @if (submitted() && !name) {
          <span class="error">Le nom est obligatoire</span>
        }
      </div>

      <div class="form-group">
        <label>Email</label>
        <input
          type="email"
          [(ngModel)]="email"
          placeholder="ex: alice@ecole.com"
          [class.input--error]="submitted() && !email"
        />
        @if (submitted() && !email) {
          <span class="error">L'email est obligatoire</span>
        } @else if (submitted() && !isValidEmail(email)) {
          <span class="error">L'email n'est pas valide</span>
        }
      </div>

      <div class="form-group">
        <label>Note (sur 20)</label>
        <input
          type="number"
          [(ngModel)]="grade"
          min="0"
          max="20"
          placeholder="ex: 14"
          [class.input--error]="submitted() && (grade < 0 || grade > 20)"
        />
        @if (submitted() && (grade < 0 || grade > 20)) {
          <span class="error">La note doit être entre 0 et 20</span>
        }
      </div>

      <div class="form-actions">
        <button
          class="btn btn--primary"
          [disabled]="store.isLoading"
          (click)="onSubmit()"
        >
          @if (store.isLoading) {
            Enregistrement...
          } @else {
            {{ isEditing() ? 'Modifier' : 'Ajouter' }}
          }
        </button>

        @if (isEditing()) {
          <button class="btn btn--secondary" (click)="onCancel()">
            Annuler
          </button>
        }
      </div>

    </div>
  `,
  styles: [`
    .form-card {
      background:    white;
      border:        1px solid #e2e8f0;
      border-radius: 12px;
      padding:       1.5rem;
      display:       flex;
      flex-direction: column;
      gap:           1rem;
    }
    h3 { margin: 0; font-size: 1rem; color: #1e293b; }
    .form-group { display: flex; flex-direction: column; gap: 0.3rem; }
    label { font-size: 0.85rem; font-weight: 500; color: #475569; }
    input {
      padding: 0.6rem 0.8rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus        { border-color: #3b82f6; }
    input.input--error { border-color: #ef4444; }
    .error { font-size: 0.78rem; color: #ef4444; }
    .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .btn {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.15s;
    }
    .btn--primary            { background: #3b82f6; color: white; }
    .btn--primary:hover      { background: #2563eb; }
    .btn--primary:disabled   { background: #93c5fd; cursor: not-allowed; }
    .btn--secondary          { background: #f1f5f9; color: #475569; }
    .btn--secondary:hover    { background: #e2e8f0; }
  `]
})
export class StudentFormComponent implements OnChanges {

  store     = injectStore(StudentStore) as any  // ✅ Auto-inferred, as any for templates
  @Input() selected: any = null

  name      = ''
  email     = ''
  grade     = 10

  submitted = signal(false)
  isEditing = signal(false)

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selected']) {
      const s = changes['selected'].currentValue
      if (s) {
        this.name  = s.name
        this.email = s.email
        this.grade = s.grade
        this.isEditing.set(true)
      } else {
        this.onReset()
      }
    }
  }

  async onSubmit() {
    this.submitted.set(true)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!this.name || !this.email || !emailRegex.test(this.email) || this.grade < 0 || this.grade > 20) return

    const student: StudentCreate = {
      name:   this.name,
      email:  this.email,
      grade:  this.grade,
      active: true
    }

    if (this.isEditing() && this.store.selected) {
      await this.store.updateStudent(this.store.selected.id, student)
    } else {
      await this.store.addStudent(student)
    }

    this.onReset()
  }

  onCancel() {
    this.store.selectStudent(null)
    this.onReset()
  }

  private onReset() {
    this.name  = ''
    this.email = ''
    this.grade = 10
    this.submitted.set(false)
    this.isEditing.set(false)
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}