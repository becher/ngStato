import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment.prod';
import { StatoDevToolsComponent } from '@ngstato/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, StatoDevToolsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'student-demo';
   isProd = environment.production
}
