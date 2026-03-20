import {
  makeEnvironmentProviders,
  InjectionToken,
  isDevMode
}                          from '@angular/core'
import { configureHttp, devTools } from '@ngstato/core'
import type { StatoConfig }        from '@ngstato/core'

export interface StatoAngularConfig {
  http?:     StatoConfig
  devtools?: boolean
}

export const STATO_CONFIG = new InjectionToken<StatoAngularConfig>('STATO_CONFIG')

export function provideStato(config: StatoAngularConfig = {}) {

  if (config.http) {
    configureHttp(config.http)
  }

  // DevTools — ignorés automatiquement en production
  // isDevMode() est géré par Angular au build
  // → false en prod même si devtools: true
  if (config.devtools && isDevMode()) {
    console.info(
      '%c[Stato] 🛠 DevTools activés',
      'background:#1e40af;color:white;padding:4px 8px;border-radius:4px;font-weight:bold'
    )
    devTools.open()
  }

  return makeEnvironmentProviders([
    {
      provide:  STATO_CONFIG,
      useValue: config
    }
  ])
}