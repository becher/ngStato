# @ngstato/angular

Adaptateur Angular pour @ngstato/core — Signals natifs, DevTools intégrés.

## Installation
```bash
npm install @ngstato/core @ngstato/angular
```

## Setup
```ts
// app.config.ts
import { provideStato }  from '@ngstato/angular'
import { isDevMode }     from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    provideStato({
      http:     { baseUrl: 'https://api.monapp.com' },
      devtools: isDevMode()
    })
  ]
}
```

## Créer un store
```ts
// user.store.ts
import { Injectable, OnDestroy, inject } from '@angular/core'
import { createStore }                   from '@ngstato/core'
import { injectStore }                   from '@ngstato/angular'

function createUserStore() {
  return createStore({
    users:     [] as User[],
    isLoading: false,

    actions: {
      async loadUsers(state) {
        state.isLoading = true
        state.users     = await http.get('/users')
        state.isLoading = false
      }
    }
  })
}

@Injectable({ providedIn: 'root' })
export class UserStore implements OnDestroy {
  private _store = createUserStore()

  get users()     { return this._store.users     }
  get isLoading() { return this._store.isLoading }

  loadUsers = (...a: any[]) => this._store.loadUsers(...a)

  ngOnDestroy() { this._store.__store__.destroy(this._store) }
}
```

## Dans un composant
```ts
@Component({ ... })
export class UserListComponent {
  store = injectStore(UserStore)
}
```

## DevTools
```ts
// app.component.ts
import { StatoDevToolsComponent } from '@ngstato/angular'

@Component({
  imports:  [RouterOutlet, StatoDevToolsComponent],
  template: `
    <router-outlet />
    <stato-devtools />
  `
})
export class AppComponent {}
```
```ts
// user.store.ts
import { connectDevTools } from '@ngstato/core'

const store = createStore({ ... })
connectDevTools(store, 'UserStore')
```

## Documentation

Voir [github.com/becher/ngstato](https://github.com/becher/ngstato)