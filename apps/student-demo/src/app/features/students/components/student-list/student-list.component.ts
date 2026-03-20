import { Component } from '@angular/core'
import { CommonModule }              from '@angular/common'
import { StudentStore }              from '../../store/student.store'
import { GradePipe }                 from '../../../../shared/pipes/grade.pipe'
import type { Student }              from '../../../../core/models/student.model'
import { injectStore } from '@ngstato/angular'

@Component({
  selector:   'app-student-list',
  standalone: true,
  imports:    [CommonModule, GradePipe],
  template: `
    <div class="student-list">

      <!-- Header -->
      <div class="student-list__header">
        <h2>Étudiants ({{ store.total }})</h2>
        <div class="student-list__stats">
          <span class="badge badge--blue">Moyenne : {{ store.average }}/20</span>
          <span class="badge badge--green">Reçus : {{ store.passing.length }}</span>
          <span class="badge badge--red">Échoués : {{ store.failing.length }}</span>
        </div>
      </div>

      <!-- Recherche -->
      <input
        class="search-input"
        type="text"
        placeholder="Rechercher un étudiant..."
        [value]="store.searchQuery"
        (input)="onSearch($event)"
      />

      <!-- Liste -->
      <ul class="student-list__items">
        @for (student of store.filtered; track student.id) {
          <li
            class="student-item"
            [class.student-item--selected]="store.selected?.id === student.id"
            [class.student-item--failing]="student.grade < 10"
            (click)="onSelect(student)"
          >
            <div class="student-item__info">
              <span class="student-item__name">{{ student.name }}</span>
              <span class="student-item__email">{{ student.email }}</span>
            </div>
            <div class="student-item__right">
              <span class="student-item__grade">{{ student.grade | grade }}</span>
              <button
                class="btn btn--danger btn--sm"
                (click)="onDelete(student.id, $event)"
              >
                Supprimer
              </button>
            </div>
          </li>
        } @empty {
          <li class="student-list__empty">
            Aucun étudiant trouvé
          </li>
        }
      </ul>

      <!-- Top 3 -->
      @if (store.topStudents.length) {
        <div class="top-students">
          <h3>🏆 Top 3</h3>
          <ol>
            @for (s of store.topStudents; track s.id) {
              <li>{{ s.name }} — {{ s.grade }}/20</li>
            }
          </ol>
        </div>
      }

    </div>
  `,
  styles: [`
    .student-list { display: flex; flex-direction: column; gap: 1rem; }

    .student-list__header {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
    }

    .student-list__stats { display: flex; gap: 0.5rem; }

    .badge {
      padding:       0.25rem 0.75rem;
      border-radius: 999px;
      font-size:     0.8rem;
      font-weight:   600;
    }
    .badge--blue  { background: #dbeafe; color: #1d4ed8; }
    .badge--green { background: #dcfce7; color: #15803d; }
    .badge--red   { background: #fee2e2; color: #b91c1c; }

    .search-input {
      width:         100%;
      padding:       0.6rem 1rem;
      border:        1px solid #e2e8f0;
      border-radius: 8px;
      font-size:     0.95rem;
      outline:       none;
      box-sizing:    border-box;
    }
    .search-input:focus { border-color: #3b82f6; }

    .student-list__items { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }

    .student-item {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
      padding:         0.75rem 1rem;
      border:          1px solid #e2e8f0;
      border-radius:   8px;
      cursor:          pointer;
      transition:      all 0.15s;
    }
    .student-item:hover             { background: #f8fafc; }
    .student-item--selected         { border-color: #3b82f6; background: #eff6ff; }
    .student-item--failing          { border-left: 3px solid #ef4444; }

    .student-item__info { display: flex; flex-direction: column; gap: 0.2rem; }
    .student-item__name  { font-weight: 600; }
    .student-item__email { font-size: 0.8rem; color: #64748b; }

    .student-item__right { display: flex; align-items: center; gap: 0.75rem; }
    .student-item__grade { font-size: 0.85rem; color: #475569; }

    .student-list__empty { text-align: center; padding: 2rem; color: #94a3b8; }

    .top-students {
      background:    #fefce8;
      border:        1px solid #fde68a;
      border-radius: 8px;
      padding:       1rem;
    }
    .top-students h3 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .top-students ol { margin: 0; padding-left: 1.2rem; }
    .top-students li { font-size: 0.9rem; padding: 0.2rem 0; }

    .btn {
      padding:       0.4rem 0.8rem;
      border:        none;
      border-radius: 6px;
      cursor:        pointer;
      font-size:     0.85rem;
      font-weight:   500;
    }
    .btn--danger { background: #fee2e2; color: #b91c1c; }
    .btn--danger:hover { background: #fecaca; }
    .btn--sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
  `]
})
export class StudentListComponent {

  store = injectStore(StudentStore)

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value
    this.store.search(query)
  }

  onSelect(student: Student) {
    const isSame = this.store.selected?.id === student.id
    this.store.selectStudent(isSame ? null : student)
  }

  onDelete(id: string, event: Event) {
    event.stopPropagation()
    this.store.deleteStudent(id)
  }
}