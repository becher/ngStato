import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ElementRef,
  ViewChild,
  AfterViewInit
}                        from '@angular/core'
import { CommonModule }  from '@angular/common'
import { devTools }      from '@ngstato/core'
import type { ActionLog } from '@ngstato/core'
import { STATO_CONFIG }  from './provide-ngstato'

@Component({
  selector:   'ngstato-devtools',
  standalone: true,
  imports:    [CommonModule],
  template: `
    <!-- Bouton flottant -->
    @if (!isOpen()) {
      <button class="devtools-fab" (click)="toggle()">
        🛠 Stato
      </button>
    }

    <!-- Panel -->
    @if (isOpen()) {
      <div
        class="devtools-panel"
        [class.devtools-panel--minimized]="isMinimized()"
        [style.left.px]="posX()"
        [style.top.px]="posY()"
        [style.width.px]="isMinimized() ? 200 : panelWidth()"
        [style.height]="isMinimized() ? 'auto' : panelHeight() + 'px'"
      >

        <!-- Header — draggable -->
        <div
          class="devtools-header"
          (mousedown)="onDragStart($event)"
        >
          <span class="devtools-title">🛠 Stato</span>
          <div class="devtools-header-actions">
            @if (!isMinimized()) {
              <button class="btn-icon" (click)="clear()" title="Vider">🗑</button>
            }
            <button class="btn-icon" (click)="toggleMinimize()" title="Minimiser/Agrandir">
              {{ isMinimized() ? '▲' : '▼' }}
            </button>
            <button class="btn-icon" (click)="toggle()" title="Fermer">✕</button>
          </div>
        </div>

        <!-- Resize handle — coin bas droite -->
        @if (!isMinimized()) {
          <div
            class="devtools-resize"
            (mousedown)="onResizeStart($event)"
          >⊿</div>
        }

        @if (!isMinimized()) {

          <!-- Tabs -->
          <div class="devtools-tabs">
            <button
              class="tab"
              [class.tab--active]="activeTab() === 'actions'"
              (click)="activeTab.set('actions')"
            >
              Actions ({{ logs().length }})
            </button>
            <button
              class="tab"
              [class.tab--active]="activeTab() === 'state'"
              (click)="activeTab.set('state')"
            >
              State
            </button>
          </div>

          <!-- Tab Actions -->
          @if (activeTab() === 'actions') {
            <div class="devtools-content">
              @if (!logs().length) {
                <div class="devtools-empty">Aucune action pour l'instant</div>
              }
              @for (log of logs(); track log.id) {
                <div
                  class="log-item"
                  [class.log-item--error]="log.status === 'error'"
                  (click)="selectLog(log)"
                >
                  <div class="log-item__left">
                    <span class="log-status">{{ log.status === 'success' ? '✓' : '✗' }}</span>
                    <span class="log-name">{{ log.name }}</span>
                  </div>
                  <div class="log-item__right">
                    @if (log.status === 'error') {
                      <span class="log-error-badge">erreur</span>
                    } @else {
                      <span class="log-duration">{{ log.duration }}ms</span>
                    }
                    <span class="log-time">{{ formatTime(log.at) }}</span>
                  </div>
                </div>

                @if (selectedLog()?.id === log.id) {
                  <div class="log-detail">
                    @if (log.error) {
                      <div class="log-detail__error">{{ log.error }}</div>
                    }
                    <div class="log-detail__section">
                      <span class="log-detail__label">Avant</span>
                      <pre>{{ log.prevState | json }}</pre>
                    </div>
                    <div class="log-detail__section">
                      <span class="log-detail__label">Après</span>
                      <pre>{{ log.nextState | json }}</pre>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- Tab State -->
          @if (activeTab() === 'state') {
            <div class="devtools-content">
              @if (logs().length) {
                <pre class="state-view">{{ logs()[0].nextState | json }}</pre>
              } @else {
                <div class="devtools-empty">Aucun state disponible</div>
              }
            </div>
          }
        }

      </div>
    }
  `,
  styles: [`
    .devtools-fab {
      position:      fixed;
      bottom:        1.5rem;
      left:          1.5rem;
      background:    #1e293b;
      color:         white;
      border:        none;
      border-radius: 999px;
      padding:       0.5rem 1rem;
      font-size:     0.85rem;
      font-weight:   600;
      cursor:        pointer;
      z-index:       9999;
      box-shadow:    0 4px 12px rgba(0,0,0,0.3);
      transition:    background 0.15s;
    }
    .devtools-fab:hover { background: #334155; }

    .devtools-panel {
      position:       fixed;
      background:     #0f172a;
      border-radius:  12px;
      box-shadow:     0 8px 32px rgba(0,0,0,0.4);
      z-index:        9999;
      display:        flex;
      flex-direction: column;
      overflow:       hidden;
      font-family:    'Courier New', monospace;
      min-width:      200px;
      min-height:     40px;
    }

    .devtools-panel--minimized {
      border-radius: 8px;
    }

    .devtools-header {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
      padding:         0.6rem 0.75rem;
      background:      #1e293b;
      border-bottom:   1px solid #334155;
      cursor:          grab;
      user-select:     none;
    }
    .devtools-header:active { cursor: grabbing; }

    .devtools-title {
      color:       #e2e8f0;
      font-size:   0.82rem;
      font-weight: 600;
      font-family: system-ui;
    }

    .devtools-header-actions { display: flex; gap: 0.25rem; }

    .btn-icon {
      background:    transparent;
      color:         #64748b;
      border:        none;
      cursor:        pointer;
      font-size:     0.8rem;
      padding:       0.15rem 0.35rem;
      border-radius: 4px;
      line-height:   1;
    }
    .btn-icon:hover { background: #334155; color: white; }

    .devtools-resize {
      position:  absolute;
      bottom:    2px;
      right:     4px;
      color:     #334155;
      font-size: 0.9rem;
      cursor:    nwse-resize;
      user-select: none;
      line-height: 1;
    }
    .devtools-resize:hover { color: #64748b; }

    .devtools-tabs {
      display:       flex;
      background:    #1e293b;
      border-bottom: 1px solid #334155;
    }
    .tab {
      padding:     0.4rem 0.75rem;
      background:  transparent;
      color:       #64748b;
      border:      none;
      cursor:      pointer;
      font-size:   0.78rem;
      font-family: system-ui;
    }
    .tab:hover    { color: #e2e8f0; }
    .tab--active  { color: #3b82f6; border-bottom: 2px solid #3b82f6; }

    .devtools-content {
      overflow-y: auto;
      flex:       1;
      padding:    0.25rem 0;
    }

    .devtools-empty {
      padding:     2rem;
      text-align:  center;
      color:       #475569;
      font-size:   0.78rem;
      font-family: system-ui;
    }

    .log-item {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
      padding:         0.35rem 0.75rem;
      cursor:          pointer;
      border-bottom:   1px solid #1e293b;
    }
    .log-item:hover        { background: #1e293b; }
    .log-item--error       { background: #1a0a0a; }

    .log-item__left  { display: flex; align-items: center; gap: 0.4rem; overflow: hidden; }
    .log-item__right { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

    .log-status  { font-size: 0.72rem; color: #22c55e; flex-shrink: 0; }
    .log-item--error .log-status { color: #ef4444; }
    .log-name    { color: #e2e8f0; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .log-duration { color: #64748b; font-size: 0.7rem; }
    .log-time    { color: #475569; font-size: 0.68rem; }

    .log-error-badge {
      background:    #7f1d1d;
      color:         #fca5a5;
      font-size:     0.68rem;
      padding:       0.1rem 0.35rem;
      border-radius: 4px;
    }

    .log-detail {
      background:    #0a0f1a;
      padding:       0.6rem 0.75rem;
      border-left:   3px solid #3b82f6;
      margin:        0 0.4rem 0.4rem;
      border-radius: 0 4px 4px 0;
    }
    .log-detail__error   { color: #fca5a5; font-size: 0.72rem; margin-bottom: 0.4rem; }
    .log-detail__section { margin-bottom: 0.4rem; }
    .log-detail__label   {
      color:         #64748b;
      font-size:     0.68rem;
      display:       block;
      margin-bottom: 0.2rem;
      font-family:   system-ui;
    }
    pre {
      color:       #86efac;
      font-size:   0.7rem;
      margin:      0;
      white-space: pre-wrap;
      word-break:  break-all;
      max-height:  140px;
      overflow-y:  auto;
    }
    .state-view {
      color:       #86efac;
      font-size:   0.7rem;
      padding:     0.75rem;
      margin:      0;
      white-space: pre-wrap;
      word-break:  break-all;
    }
  `]
})
export class StatoDevToolsComponent implements OnInit, OnDestroy {

  private config  = inject(STATO_CONFIG, { optional: true })
  private unsub?: () => void

  // State UI
  isOpen      = signal(false)
  isMinimized = signal(false)
  activeTab   = signal<'actions' | 'state'>('actions')
  logs        = signal<ActionLog[]>([])
  selectedLog = signal<ActionLog | null>(null)

  // Position et taille
  posX        = signal(24)
  posY        = signal(window.innerHeight - 500)
  panelWidth  = signal(420)
  panelHeight = signal(460)

  // Drag state
  private isDragging  = false
  private isResizing  = false
  private dragOffsetX = 0
  private dragOffsetY = 0
  private startW      = 0
  private startH      = 0
  private startX      = 0
  private startY      = 0

  // Bound listeners
  private boundMouseMove = this.onMouseMove.bind(this)
  private boundMouseUp   = this.onMouseUp.bind(this)

  ngOnInit() {
    this.unsub = devTools.subscribe((state) => {
      this.logs.set(state.logs)
      this.isOpen.set(state.isOpen)
    })

    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup',   this.boundMouseUp)
  }

  ngOnDestroy() {
    this.unsub?.()
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup',   this.boundMouseUp)
  }

  // ── Toggle ─────────────────────────────────────────
  toggle()         { devTools.toggle() }
  toggleMinimize() { this.isMinimized.update(v => !v) }
  clear()          { devTools.clear(); this.selectedLog.set(null) }
  selectLog(log: ActionLog) {
    this.selectedLog.set(this.selectedLog()?.id === log.id ? null : log)
  }
  formatTime(iso: string): string {
    return new Date(iso).toTimeString().slice(0, 8)
  }

  // ── Drag ───────────────────────────────────────────
  onDragStart(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('btn-icon')) return
    this.isDragging  = true
    this.dragOffsetX = e.clientX - this.posX()
    this.dragOffsetY = e.clientY - this.posY()
    e.preventDefault()
  }

  // ── Resize ─────────────────────────────────────────
  onResizeStart(e: MouseEvent) {
    this.isResizing = true
    this.startW     = this.panelWidth()
    this.startH     = this.panelHeight()
    this.startX     = e.clientX
    this.startY     = e.clientY
    e.preventDefault()
    e.stopPropagation()
  }

  // ── Mouse Move ─────────────────────────────────────
  onMouseMove(e: MouseEvent) {
    if (this.isDragging) {
      this.posX.set(Math.max(0, e.clientX - this.dragOffsetX))
      this.posY.set(Math.max(0, e.clientY - this.dragOffsetY))
    }
    if (this.isResizing) {
      const newW = Math.max(300, this.startW + e.clientX - this.startX)
      const newH = Math.max(200, this.startH + e.clientY - this.startY)
      this.panelWidth.set(newW)
      this.panelHeight.set(newH)
    }
  }

  // ── Mouse Up ───────────────────────────────────────
  onMouseUp() {
    this.isDragging = false
    this.isResizing = false
  }
}