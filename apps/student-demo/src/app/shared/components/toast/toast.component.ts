import { Component, Input } from '@angular/core'
import { CommonModule }     from '@angular/common'

@Component({
  selector:   'app-toast',
  standalone: true,
  imports:    [CommonModule],
  template: `
    @if (message) {
      <div class="toast" [class.toast--error]="type === 'error'">
        {{ message }}
      </div>
    }
  `,
  styles: [`
    .toast {
      position:      fixed;
      bottom:        1.5rem;
      right:         1.5rem;
      background:    #22c55e;
      color:         white;
      padding:       0.75rem 1.25rem;
      border-radius: 8px;
      font-size:     0.9rem;
      box-shadow:    0 4px 12px rgba(0,0,0,0.15);
      z-index:       999;
    }
    .toast--error {
      background: #ef4444;
    }
  `]
})
export class ToastComponent {
  @Input() message = ''
  @Input() type:  'success' | 'error' = 'success'
}