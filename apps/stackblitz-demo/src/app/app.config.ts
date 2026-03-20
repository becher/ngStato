import { ApplicationConfig } from '@angular/core'
import { isDevMode }         from '@angular/core'
import { provideStato }      from '@ngstato/angular'

export const appConfig: ApplicationConfig = {
  providers: [
    provideStato({
      devtools: isDevMode()
    })
  ]
}