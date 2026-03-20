import { Component } from '@angular/core'
import { CommonModule }      from '@angular/common'
import { StudentStore }      from '../../store/student.store'
import { GradePipe }         from '../../../../shared/pipes/grade.pipe'
import { injectStore } from '@ngstato/angular'

@Component({
  selector:   'app-student-detail',
  standalone: true,
  imports:    [CommonModule, GradePipe],
  template: `
    @if (store.selected) {
      <div class="detail-card">

        <div class="detail-card__header">
          <h3>{{ store.selected.name }}</h3>
          <button class="btn btn--close" (click)="onClose()">✕</button>
        </div>

        <div class="detail-card__body">

          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">{{ store.selected.email }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Note</span>
            <span
              class="detail-value"
              [class.detail-value--pass]="store.selected.grade >= 10"
              [class.detail-value--fail]="store.selected.grade < 10"
            >
              {{ store.selected.grade | grade }}
            </span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Statut</span>
            <span
              class="badge"
              [class.badge--green]="store.selected.grade >= 10"
              [class.badge--red]="store.selected.grade < 10"
            >
              {{ store.selected.grade >= 10 ? 'Admis' : 'Ajourné' }}
            </span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Actif</span>
            <span class="badge" [class.badge--green]="store.selected.active" [class.badge--red]="!store.selected.active">
              {{ store.selected.active ? 'Oui' : 'Non' }}
            </span>
          </div>

        </div>

                <div class="detail-card__actions">
        <button
            class="btn btn--primary"
            (click)="onEdit()"
        >
            Modifier
        </button>
        <button
            class="btn btn--danger"
            [disabled]="store.isLoading"
            (click)="onDelete()"
        >
            Supprimer
        </button>
        </div>

      </div>
    } @else {
      <div class="detail-empty">
        <p>Sélectionne un étudiant pour voir ses détails</p>
      </div>
    }
  `,
  styles: [`
    .detail-card {
      background:    white;
      border:        1px solid #e2e8f0;
      border-radius: 12px;
      overflow:      hidden;
    }

    .detail-card__header {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
      padding:         1rem 1.25rem;
      background:      #f8fafc;
      border-bottom:   1px solid #e2e8f0;
    }
    .detail-card__header h3 { margin: 0; font-size: 1rem; }

    .detail-card__body {
      padding:        1.25rem;
      display:        flex;
      flex-direction: column;
      gap:            0.75rem;
    }

    .detail-row {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
    }

    .detail-label { font-size: 0.85rem; color: #64748b; }
    .detail-value { font-size: 0.9rem;  font-weight: 500; }
    .detail-value--pass { color: #15803d; }
    .detail-value--fail { color: #b91c1c; }

    .badge {
      padding:       0.2rem 0.6rem;
      border-radius: 999px;
      font-size:     0.78rem;
      font-weight:   600;
    }
    .badge--green { background: #dcfce7; color: #15803d; }
    .badge--red   { background: #fee2e2; color: #b91c1c; }

    .detail-card__actions {
      padding:     1rem 1.25rem;
      border-top:  1px solid #e2e8f0;
      background:  #f8fafc;
    }

    .btn {
      padding:       0.5rem 1rem;
      border:        none;
      border-radius: 8px;
      cursor:        pointer;
      font-size:     0.85rem;
      font-weight:   500;
    }
    .btn--close  { background: transparent; color: #64748b; font-size: 1rem; cursor: pointer; border: none; }
    .btn--close:hover { color: #1e293b; }
    .btn--danger { background: #fee2e2; color: #b91c1c; }
    .btn--danger:hover   { background: #fecaca; }
    .btn--danger:disabled { opacity: 0.5; cursor: not-allowed; }

    .detail-empty {
      padding:    2rem;
      text-align: center;
      color:      #94a3b8;
      font-size:  0.9rem;
    }
  `]
})
export class StudentDetailComponent {

  store = injectStore(StudentStore)

  onClose() {
    this.store.selectStudent(null)
  }

  async onDelete() {
    if (!this.store.selected) return
    await this.store.deleteStudent(this.store.selected.id)
  }

  onEdit() {
  // Le formulaire réagit déjà via ngOnChanges
  // On scroll vers le haut pour voir le formulaire
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
}