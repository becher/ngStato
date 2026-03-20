// ─────────────────────────────────────────────────────
// @ngstato/core — retryable()
// Réessaie automatiquement en cas d'échec
// Remplace retryWhen de RxJS — sans RxJS
// ─────────────────────────────────────────────────────

export interface RetryOptions {
  attempts: number                          // nombre de tentatives
  backoff:  'fixed' | 'exponential'        // stratégie de délai
  delay?:   number                          // délai de base en ms (défaut 1000)
  onRetry?: (attempt: number, error: Error) => void  // callback optionnel
}

export function retryable<S, A extends unknown[]>(
  fn:      (state: S, ...args: A) => Promise<void>,
  options: RetryOptions = {
    attempts: 3,
    backoff:  'exponential',
    delay:    1000
  }
) {
  return async (state: S, ...args: A): Promise<void> => {
    const { attempts, backoff, delay = 1000, onRetry } = options

    for (let i = 0; i < attempts; i++) {
      try {
        await fn(state, ...args)
        return   // succès — on sort immédiatement

      } catch (error) {
        const isLastAttempt = i === attempts - 1

        // Dernière tentative — on remonte l'erreur
        if (isLastAttempt) throw error

        // Calculer le délai avant la prochaine tentative
        const waitMs = backoff === 'exponential'
          ? delay * Math.pow(2, i)   // 1s, 2s, 4s, 8s...
          : delay                     // fixe : toujours 1s

        // Callback optionnel — pour logger ou afficher un message
        onRetry?.(i + 1, error as Error)

        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, waitMs))
      }
    }
  }
}