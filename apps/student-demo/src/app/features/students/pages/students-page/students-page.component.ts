import { Component, OnDestroy, OnInit, signal } from '@angular/core'
import { CommonModule, DatePipe  }                      from '@angular/common'
import { StudentStore }                      from '../../store/student.store'
import { StudentListComponent }              from '../../components/student-list/student-list.component'
import { StudentFormComponent }              from '../../components/student-form/student-form.component'
import { StudentDetailComponent }            from '../../components/student-detail/student-detail.component'
import { SpinnerComponent }                  from '../../../../shared/components/spinner/spinner.component'
import { ToastComponent }                    from '../../../../shared/components/toast/toast.component'
import { injectStore } from '@ngstato/angular'
import { on } from '@ngstato/core'

@Component({
  selector:   'app-students-page',
  standalone: true,
  imports:    [
    CommonModule,
    StudentListComponent,
    StudentFormComponent,
    StudentDetailComponent,
    SpinnerComponent,
    ToastComponent
  ],
  template: `
    <div class="page">

      <!-- Header -->
      <header class="page__header">
        <div class="page__header-left">
          <h1>🎓 Gestion des étudiants</h1>
          <p>Propulsé par <strong>Stato</strong> — sans NgRx, sans RxJS</p>
        </div>
        <div class="page__header-right">
          <button
            class="btn btn--primary"
            [disabled]="store.isLoading"
            (click)="onReload()"
          >
            {{ store.isLoading ? 'Chargement...' : '↺ Recharger' }}
          </button>
          <button
            class="btn btn--secondary"
            (click)="toggleNotifications()"
          >
            🔔 Notifications ({{ store.notifications.length }})
          </button>
        </div>
      </header>

      <!-- Démo async helpers -->
      <section class="concurrency-demo">
        <h3>Async helpers : exclusive vs queued</h3>
        <p>
          Cliquez vite sur les deux boutons. En <b>exclusive</b>, le 2e appel est ignoré
          pendant que la requête précédente tourne. En <b>queued</b>, les appels passent
          dans l'ordre d'arrivée.
        </p>
        <div class="concurrency-demo__actions">
          <button
            class="btn btn--secondary"
            [disabled]="store.isLoading"
            (click)="runExclusiveDemo()"
          >
            exclusive (exhaustMap)
          </button>
          <button
            class="btn btn--secondary"
            [disabled]="store.isLoading"
            (click)="runQueuedDemo()"
          >
            queued (concatMap)
          </button>
        </div>
        <div class="concurrency-demo__grid">
          <div class="concurrency-demo__card">
            <div class="concurrency-demo__label">exclusive (exhaustMap)</div>
            <div class="concurrency-demo__value">
              final = <b>{{ demoExclusiveFinal() || '—' }}</b>
            </div>
          </div>
          <div class="concurrency-demo__card">
            <div class="concurrency-demo__label">queued (concatMap)</div>
            <div class="concurrency-demo__value">
              final = <b>{{ demoQueuedFinal() || '—' }}</b>
            </div>
          </div>
        </div>
        <p class="concurrency-demo__hint">
          (séquence test : <code>alice</code> puis <code>bob</code>)
        </p>
      </section>

      <!-- Spinner global -->
      @if (store.isLoading && !store.students.length) {
        <app-spinner />
      }

      <!-- Erreur -->
      @if (store.error) {
        <div class="error-banner">
          ⚠️ {{ store.error }}
          <button (click)="onReload()">Réessayer</button>
        </div>
      }

      <!-- Contenu principal -->
      @if (store.students.length || !store.isLoading) {
        <div class="page__content">

          <!-- Colonne gauche — liste -->
          <div class="page__left">
            <app-student-list />
          </div>

          <!-- Colonne droite — form + détail -->
           <div class="page__right">
            @if (store.selected) {
                <app-student-form [selected]="store.selected" />
            } @else {
                <app-student-form />
            }
            <app-student-detail />
            </div>

        </div>
      }

      <!-- Panel notifications -->
      @if (showNotifications()) {
        <div class="notifications-panel">
          <div class="notifications-panel__header">
            <h3>Notifications temps réel</h3>
            <button (click)="toggleNotifications()">✕</button>
          </div>
          <ul>
            @for (n of store.notifications; track n.at) {
              <li>
                <span class="notif-type notif-type--{{ n.type }}">{{ n.type }}</span>
                étudiant {{ n.studentId }} — {{ formatTime(n.at) }}
              </li>
            } @empty {
              <li class="notif-empty">Aucune notification</li>
            }
          </ul>
        </div>
      }

    <!-- Toast -->
      <app-toast
        [message]="toastMessage()"
        [type]="toastType()"
      />

    </div>
  `,
  styles: [`
    .page {
      max-width:  1200px;
      margin:     0 auto;
      padding:    2rem 1.5rem;
      font-family: system-ui, sans-serif;
      color:      #1e293b;
    }

    .page__header {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
      margin-bottom:   2rem;
      padding-bottom:  1.5rem;
      border-bottom:   2px solid #e2e8f0;
    }

    .page__header h1 { margin: 0; font-size: 1.5rem; }
    .page__header p  { margin: 0.3rem 0 0; font-size: 0.9rem; color: #64748b; }

    .page__header-right { display: flex; gap: 0.75rem; }

    .page__content {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap:     2rem;
      align-items: start;
    }

    .page__left  { display: flex; flex-direction: column; gap: 1rem; }
    .page__right { display: flex; flex-direction: column; gap: 1rem; }

    .error-banner {
      background:    #fee2e2;
      border:        1px solid #fca5a5;
      border-radius: 8px;
      padding:       0.75rem 1rem;
      margin-bottom: 1rem;
      display:       flex;
      justify-content: space-between;
      align-items:   center;
      color:         #b91c1c;
    }
    .error-banner button {
      background: #b91c1c;
      color:      white;
      border:     none;
      padding:    0.3rem 0.8rem;
      border-radius: 6px;
      cursor:     pointer;
    }

    .notifications-panel {
      position:      fixed;
      right:         1.5rem;
      top:           1.5rem;
      width:         320px;
      background:    white;
      border:        1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow:    0 8px 24px rgba(0,0,0,0.12);
      z-index:       100;
    }

    .notifications-panel__header {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
      padding:         1rem 1.25rem;
      border-bottom:   1px solid #e2e8f0;
    }
    .notifications-panel__header h3 { margin: 0; font-size: 0.95rem; }
    .notifications-panel__header button {
      background: none;
      border:     none;
      cursor:     pointer;
      color:      #64748b;
    }

    .notifications-panel ul {
      list-style: none;
      padding:    0.5rem 0;
      margin:     0;
      max-height: 300px;
      overflow-y: auto;
    }

    .notifications-panel li {
      padding:     0.6rem 1.25rem;
      font-size:   0.85rem;
      display:     flex;
      align-items: center;
      gap:         0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .notif-type {
      padding:       0.15rem 0.5rem;
      border-radius: 999px;
      font-size:     0.75rem;
      font-weight:   600;
    }
    .notif-type--updated { background: #dbeafe; color: #1d4ed8; }
    .notif-type--added   { background: #dcfce7; color: #15803d; }
    .notif-type--deleted { background: #fee2e2; color: #b91c1c; }

    .notif-empty { color: #94a3b8; justify-content: center; }

    .btn {
      padding:       0.6rem 1.2rem;
      border:        none;
      border-radius: 8px;
      cursor:        pointer;
      font-size:     0.9rem;
      font-weight:   500;
      transition:    background 0.15s;
    }
    .btn--primary   { background: #3b82f6; color: white; }
    .btn--primary:hover    { background: #2563eb; }
    .btn--primary:disabled { background: #93c5fd; cursor: not-allowed; }
    .btn--secondary { background: #f1f5f9; color: #475569; }
    .btn--secondary:hover  { background: #e2e8f0; }

    .concurrency-demo {
      background:    #f8fafc;
      border:        1px solid #e2e8f0;
      border-radius: 12px;
      padding:       1rem;
      margin-bottom: 1.5rem;
    }
    .concurrency-demo h3 {
      margin: 0;
      font-size: 1rem;
      color: #0f172a;
    }
    .concurrency-demo p {
      margin: 0.5rem 0 0;
      color: #475569;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .concurrency-demo__actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.75rem;
    }
    .concurrency-demo__result {
      margin-top: 0.75rem;
      color: #334155;
      font-size: 0.9rem;
    }
    .concurrency-demo__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .concurrency-demo__card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.75rem;
    }
    .concurrency-demo__label {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .concurrency-demo__value {
      font-size: 0.95rem;
      color: #0f172a;
    }
    .concurrency-demo__hint {
      margin-top: 0.5rem;
      font-size: 0.82rem;
      color: #64748b;
    }
    .concurrency-demo__hint code {
      background: #e2e8f0;
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      font-size: 0.8rem;
      color: #0f172a;
    }

    @media (max-width: 768px) {
      .page__content { grid-template-columns: 1fr; }
      .page__header  { flex-direction: column; gap: 1rem; align-items: flex-start; }
      .concurrency-demo__grid { grid-template-columns: 1fr; }
    }
  `]
})
export class StudentsPageComponent implements OnInit, OnDestroy {

  store             = injectStore(StudentStore) as any  // ✅ Auto-inferred types, as any for templates
  showNotifications = signal(false)
  toastMessage      = signal('')
  toastType         = signal<'success' | 'error'>('success')
  demoExclusiveFinal = signal('')
  demoQueuedFinal    = signal('')
  private unsubActionToasts: Array<() => void> = []

  async ngOnInit() {
    await this.store.loadStudents()
    this.store.listenNotifications()

    // Démo `on()` — toast automatique à la fin d’une action
    this.unsubActionToasts.push(
      on(this.store.searchRemoteExclusive, (_store, event) => {
        if (!event) return
        if (event.status === 'success') {
          this.showToast(`exclusive terminé (${event.duration}ms)`, 'success')
        } else {
          this.showToast('exclusive erreur', 'error')
        }
      })
    )
    this.unsubActionToasts.push(
      on(this.store.searchRemoteQueued, (_store, event) => {
        if (!event) return
        if (event.status === 'success') {
          this.showToast(`queued terminé (${event.duration}ms)`, 'success')
        } else {
          this.showToast('queued erreur', 'error')
        }
      })
    )
  }

  ngOnDestroy() {
    for (const unsub of this.unsubActionToasts) unsub()
    this.unsubActionToasts = []
  }

  async onReload() {
    try {
      await this.store.loadStudents()
      this.showToast('Étudiants rechargés', 'success')
    } catch {
      this.showToast('Erreur lors du chargement', 'error')
    }
  }

  async runExclusiveDemo() {
    try {
      this.demoExclusiveFinal.set('')
      const p1 = this.store.searchRemoteExclusive('alice')
      const p2 = this.store.searchRemoteExclusive('bob')
      await Promise.all([p1, p2])

      this.demoExclusiveFinal.set(this.store.searchQuery || '')
      this.showToast(
        `exclusive => état final: ${this.store.searchQuery}`,
        'success'
      )
    } catch {
      this.showToast('exclusive => erreur démo', 'error')
    }
  }

  async runQueuedDemo() {
    try {
      this.demoQueuedFinal.set('')
      const p1 = this.store.searchRemoteQueued('alice')
      const p2 = this.store.searchRemoteQueued('bob')
      await Promise.all([p1, p2])

      this.demoQueuedFinal.set(this.store.searchQuery || '')
      this.showToast(
        `queued => état final: ${this.store.searchQuery}`,
        'success'
      )
    } catch {
      this.showToast('queued => erreur démo', 'error')
    }
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v)
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message)
    this.toastType.set(type)
    setTimeout(() => this.toastMessage.set(''), 3000)
  }

  formatTime(iso: string): string {
    return new Date(iso).toTimeString().slice(0, 8)
  }
}