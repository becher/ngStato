import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed
}                        from '@angular/core'
import { devTools }                           from '@ngstato/core'
import type { ActionLog, DevToolsState }       from '@ngstato/core'
import { JsonPipe, KeyValuePipe } from '@angular/common'

@Component({
  selector:   'ngstato-devtools, stato-devtools',
  standalone: true,
  imports:    [JsonPipe, KeyValuePipe],
  template: `
    <!-- Floating button -->
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
        [style.width.px]="isMinimized() ? 220 : panelWidth()"
        [style.height]="isMinimized() ? 'auto' : panelHeight() + 'px'"
      >

        <!-- Header — draggable -->
        <div
          class="devtools-header"
          (mousedown)="onDragStart($event)"
        >
          <span class="devtools-title">
            🛠 Stato
            @if (isTimeTraveling()) {
              <span class="tt-badge">TIME-TRAVEL</span>
            }
          </span>
          <div class="devtools-header-actions">
            @if (!isMinimized()) {
              <button class="btn-icon" (click)="clear()" title="Clear">🗑</button>
            }
            <button class="btn-icon" (click)="toggleMinimize()" title="Minimize">
              {{ isMinimized() ? '▲' : '▼' }}
            </button>
            <button class="btn-icon" (click)="toggle()" title="Close">✕</button>
          </div>
        </div>

        <!-- Resize handle -->
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

          <!-- Time-travel toolbar -->
          @if (activeTab() === 'actions' && logs().length) {
            <div class="tt-toolbar">
              <button
                class="tt-btn"
                (click)="onUndo()"
                [disabled]="!canUndo()"
                title="Undo (step back)"
              >⏪</button>
              <button
                class="tt-btn"
                (click)="onRedo()"
                [disabled]="!canRedo()"
                title="Redo (step forward)"
              >⏩</button>
              @if (isTimeTraveling()) {
                <button
                  class="tt-btn tt-btn--resume"
                  (click)="onResume()"
                  title="Resume live state"
                >▶ Live</button>
              }
              <div class="tt-spacer"></div>
              <button
                class="tt-btn tt-btn--export"
                (click)="onExport()"
                title="Export state snapshot (JSON)"
              >📤</button>
              <button
                class="tt-btn tt-btn--import"
                (click)="onImport()"
                title="Import state snapshot"
              >📥</button>
            </div>
          }

          <!-- Tab: Actions -->
          @if (activeTab() === 'actions') {
            <div class="devtools-content">
              @if (!logs().length) {
                <div class="devtools-empty">No actions yet</div>
              }
              @for (log of logs(); track log.id) {
                <div
                  class="log-item"
                  [class.log-item--error]="log.status === 'error'"
                  [class.log-item--active]="activeLogId() === log.id"
                  [class.log-item--future]="isFutureLog(log)"
                  (click)="onTravelTo(log)"
                >
                  <div class="log-item__left">
                    <span class="log-status">{{ log.status === 'success' ? '✓' : '✗' }}</span>
                    <span class="log-name">{{ log.name }}</span>
                  </div>
                  <div class="log-item__right">
                    @if (log.status === 'error') {
                      <span class="log-error-badge">error</span>
                    } @else {
                      <span class="log-duration">{{ log.duration }}ms</span>
                    }
                    <span class="log-time">{{ formatTime(log.at) }}</span>
                    <button
                      class="btn-icon btn-replay"
                      (click)="onReplay(log, $event)"
                      title="Replay this action"
                    >🔄</button>
                  </div>
                </div>

                @if (selectedLog()?.id === log.id) {
                  <div class="log-detail">
                    @if (log.error) {
                      <div class="log-detail__error">{{ log.error }}</div>
                    }
                    <div class="log-detail__section">
                      <span class="log-detail__label">Before</span>
                      <pre>{{ log.prevState | json }}</pre>
                    </div>
                    <div class="log-detail__section">
                      <span class="log-detail__label">After</span>
                      <pre>{{ log.nextState | json }}</pre>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- Tab: State -->
          @if (activeTab() === 'state') {
            <div class="devtools-content">
              @if (globalState().size) {
                @for (entry of globalState() | keyvalue; track entry.key) {
                  <div class="state-store-block">
                    <div class="state-store-name">{{ entry.key }}</div>
                    <pre class="state-view">{{ entry.value | json }}</pre>
                  </div>
                }
              } @else {
                <div class="devtools-empty">No state available</div>
              }
            </div>
          }
        }

      </div>
    }

    <!-- Hidden file input for import -->
    <input
      #fileInput
      type="file"
      accept=".json"
      style="display: none"
      (change)="onFileSelected($event)"
    />
  `,
  styles: [`
    :host { font-family: system-ui, -apple-system, sans-serif; }

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
      box-shadow:     0 8px 32px rgba(0,0,0,0.5);
      z-index:        9999;
      display:        flex;
      flex-direction: column;
      overflow:       hidden;
      font-family:    'Courier New', monospace;
      min-width:      200px;
      min-height:     40px;
      border:         1px solid #1e293b;
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
      display:     flex;
      align-items: center;
      gap:         0.4rem;
    }

    .tt-badge {
      background:    #7c3aed;
      color:         #fff;
      font-size:     0.6rem;
      padding:       0.12rem 0.4rem;
      border-radius: 4px;
      font-weight:   700;
      letter-spacing: 0.05em;
      animation:     tt-pulse 1.5s ease-in-out infinite;
    }
    @keyframes tt-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.6; }
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

    /* ── Tabs ─────────────────────────────────────────── */
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
      transition:  color 0.15s;
    }
    .tab:hover    { color: #e2e8f0; }
    .tab--active  { color: #3b82f6; border-bottom: 2px solid #3b82f6; }

    /* ── Time-travel toolbar ──────────────────────────── */
    .tt-toolbar {
      display:       flex;
      align-items:   center;
      gap:           0.2rem;
      padding:       0.3rem 0.5rem;
      background:    #0f172a;
      border-bottom: 1px solid #1e293b;
    }

    .tt-btn {
      background:    #1e293b;
      border:        1px solid #334155;
      color:         #94a3b8;
      padding:       0.2rem 0.5rem;
      border-radius: 4px;
      font-size:     0.72rem;
      cursor:        pointer;
      transition:    all 0.15s;
      font-family:   system-ui;
    }
    .tt-btn:hover:not(:disabled) {
      background: #334155;
      color:      #e2e8f0;
      border-color: #475569;
    }
    .tt-btn:disabled {
      opacity: 0.3;
      cursor:  not-allowed;
    }
    .tt-btn--resume {
      background: #7c3aed;
      border-color: #7c3aed;
      color: white;
      font-weight: 600;
    }
    .tt-btn--resume:hover:not(:disabled) {
      background: #6d28d9;
    }
    .tt-btn--export, .tt-btn--import {
      font-size: 0.68rem;
    }
    .tt-spacer { flex: 1; }

    /* ── Content ──────────────────────────────────────── */
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

    /* ── Log items ────────────────────────────────────── */
    .log-item {
      display:         flex;
      justify-content: space-between;
      align-items:     center;
      padding:         0.35rem 0.75rem;
      cursor:          pointer;
      border-bottom:   1px solid #1e293b;
      transition:      background 0.1s;
    }
    .log-item:hover     { background: #1e293b; }
    .log-item--error    { background: #1a0a0a; }
    .log-item--active   {
      background:  #1e1b4b !important;
      border-left: 3px solid #7c3aed;
    }
    .log-item--future {
      opacity: 0.35;
    }

    .log-item__left  { display: flex; align-items: center; gap: 0.4rem; overflow: hidden; flex: 1; }
    .log-item__right { display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; }

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

    .btn-replay {
      font-size: 0.65rem;
      opacity:   0.5;
    }
    .btn-replay:hover { opacity: 1; }

    /* ── Log detail ───────────────────────────────────── */
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

    /* ── State tab ────────────────────────────────────── */
    .state-store-block {
      border-bottom: 1px solid #1e293b;
    }
    .state-store-block:last-child { border-bottom: none; }
    .state-store-name {
      padding:       0.4rem 0.75rem 0.2rem;
      color:         #3b82f6;
      font-size:     0.72rem;
      font-family:   system-ui;
      font-weight:   600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .state-view {
      color:       #86efac;
      font-size:   0.7rem;
      padding:     0.25rem 0.75rem 0.75rem;
      margin:      0;
      white-space: pre-wrap;
      word-break:  break-all;
    }
  `]
})
export class StatoDevToolsComponent implements OnInit, OnDestroy {

  private unsub?: () => void

  // State UI
  isOpen          = signal(false)
  isMinimized     = signal(false)
  activeTab       = signal<'actions' | 'state'>('actions')
  logs            = signal<ActionLog[]>([])
  selectedLog     = signal<ActionLog | null>(null)
  activeLogId     = signal<number | null>(null)
  isTimeTraveling = signal(false)

  // Snapshot global — latest known state per store
  globalState = computed(() => {
    const seen = new Map<string, unknown>()
    for (const log of this.logs()) {
      if (!seen.has(log.storeName)) {
        seen.set(log.storeName, log.nextState)
      }
    }
    return seen
  })

  // Time-travel computed
  canUndo = computed(() => this.logs().length > 0)
  canRedo = computed(() => {
    if (!this.isTimeTraveling()) return false
    const id = this.activeLogId()
    if (id === null) return false
    if (id === -1) return this.logs().length > 0
    const idx = this.logs().findIndex(l => l.id === id)
    return idx > 0  // can go forward (lower index = newer)
  })

  // Position & size
  posX        = signal(24)
  posY        = signal(window.innerHeight - 520)
  panelWidth  = signal(440)
  panelHeight = signal(480)

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
    this.unsub = devTools.subscribe((state: DevToolsState) => {
      this.logs.set(state.logs)
      this.isOpen.set(state.isOpen)
      this.activeLogId.set(state.activeLogId)
      this.isTimeTraveling.set(state.isTimeTraveling)
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

  // ── Time-travel actions ────────────────────────────
  onTravelTo(log: ActionLog) {
    // Toggle detail view
    this.selectLog(log)
    // Jump to this action's state
    devTools.travelTo(log.id)
  }

  onUndo()   { devTools.undo() }
  onRedo()   { devTools.redo() }
  onResume() { devTools.resume() }

  onReplay(log: ActionLog, event: Event) {
    event.stopPropagation()
    devTools.replay(log.id)
  }

  isFutureLog(log: ActionLog): boolean {
    if (!this.isTimeTraveling()) return false
    const activeId = this.activeLogId()
    if (activeId === null) return false
    if (activeId === -1) return true  // all logs are "future"
    const activeIdx = this.logs().findIndex(l => l.id === activeId)
    const logIdx = this.logs().findIndex(l => l.id === log.id)
    return logIdx < activeIdx  // newer logs (lower index) are "future"
  }

  // ── Export/Import ──────────────────────────────────
  onExport() {
    const snapshot = devTools.exportSnapshot()
    const json = JSON.stringify(snapshot, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ngstato-snapshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  onImport() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    input?.click()
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const snapshot = JSON.parse(reader.result as string)
        devTools.importSnapshot(snapshot)
      } catch (e) {
        console.error('[ngStato DevTools] Invalid snapshot file:', e)
      }
    }
    reader.readAsText(file)
    // Reset input
    ;(event.target as HTMLInputElement).value = ''
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