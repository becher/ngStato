// ─────────────────────────────────────────────────────
// @ngstato/core — throttled()
// Limite la fréquence d'exécution d'une action
// Remplace throttleTime de RxJS — sans RxJS
// ─────────────────────────────────────────────────────

export function throttled<S, A extends unknown[]>(
  fn:  (state: S, ...args: A) => void | Promise<void>,
  ms:  number = 300
) {
  let lastCall = 0
  let timer:    ReturnType<typeof setTimeout> | null = null
  // Stocker le dernier appel pour utiliser le state le plus récent
  let latestState: S
  let latestArgs: A

  return async (state: S, ...args: A): Promise<void> => {
    const now = Date.now()
    const remaining = ms - (now - lastCall)

    // Sauvegarder le state et args les plus récents
    latestState = state
    latestArgs = args

    if (remaining <= 0) {
      // Assez de temps passé — on exécute immédiatement
      lastCall = now
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      await fn(latestState, ...latestArgs)
    } else {
      // Trop tôt — on planifie pour la fin du délai
      if (timer) clearTimeout(timer)
      return new Promise((resolve, reject) => {
        timer = setTimeout(async () => {
          lastCall = Date.now()
          timer    = null
          try {
            await fn(latestState, ...latestArgs)
            resolve()
          } catch (error) {
            reject(error)
          }
        }, remaining)
      })
    }
  }
}