/**
 * @ngstato/eslint-plugin
 *
 * ESLint rules for ngStato stores.
 *
 * Usage in eslint.config.js (flat config):
 * ```js
 * import ngstato from '@ngstato/eslint-plugin'
 *
 * export default [
 *   ngstato.configs.recommended
 * ]
 * ```
 *
 * Or individual rules:
 * ```js
 * import ngstato from '@ngstato/eslint-plugin'
 *
 * export default [{
 *   plugins: { ngstato },
 *   rules: {
 *     'ngstato/no-state-mutation-outside-action': 'error',
 *     'ngstato/no-async-without-error-handling':  'warn',
 *     'ngstato/require-devtools':                 'warn'
 *   }
 * }]
 * ```
 */

import { noStateMutationOutsideAction } from './rules/no-state-mutation-outside-action'
import { noAsyncWithoutErrorHandling } from './rules/no-async-without-error-handling'
import { requireDevtools } from './rules/require-devtools'

const rules = {
  'no-state-mutation-outside-action': noStateMutationOutsideAction,
  'no-async-without-error-handling': noAsyncWithoutErrorHandling,
  'require-devtools': requireDevtools
}

const configs = {
  recommended: {
    plugins: {
      ngstato: { rules }
    },
    rules: {
      'ngstato/no-state-mutation-outside-action': 'error' as const,
      'ngstato/no-async-without-error-handling':  'warn' as const,
      'ngstato/require-devtools':                 'warn' as const
    }
  }
}

export default { rules, configs }
export { rules, configs }
