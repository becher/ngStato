import { Component } from '@angular/core'

@Component({
  selector:   'app-spinner',
  standalone: true,
  template: `
    <div class="spinner">
      <div class="spinner__circle"></div>
    </div>
  `,
  styles: [`
    .spinner {
      display:         flex;
      justify-content: center;
      padding:         2rem;
    }
    .spinner__circle {
      width:        40px;
      height:       40px;
      border:       4px solid #f3f3f3;
      border-top:   4px solid #3b82f6;
      border-radius: 50%;
      animation:    spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg) }
    }
  `]
})
export class SpinnerComponent {}