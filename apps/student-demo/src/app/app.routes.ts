import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path:         '',
    redirectTo:   'students',
    pathMatch:    'full'
  },
  {
    path:         'students',
    loadComponent: () =>
      import('./features/students/pages/students-page/students-page.component')
        .then(m => m.StudentsPageComponent)
  },
  {
    path:         '**',
    redirectTo:   'students'
  }
]