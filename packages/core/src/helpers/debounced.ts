// ─────────────────────────────────────────────────────
// @ngstato/core — debounced()
// Attend que l'utilisateur arrête de taper
// Remplace debounceTime de RxJS — sans RxJS
// ─────────────────────────────────────────────────────

export function debounced<S, A extends unknown[]>(
  fn:  (state: S, ...args: A) => void | Promise<void>,
  ms:  number = 300
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  // Stocker le dernier appel pour utiliser le state le plus récent
  let latestState: S
  let latestArgs: A

  return (state: S, ...args: A): Promise<void> => {
    // Annuler le timer précédent
    if (timer) clearTimeout(timer)

    // Sauvegarder le state et args les plus récents
    latestState = state
    latestArgs = args

    // Retourner une Promise qui se résout après le délai
    return new Promise((resolve, reject) => {
      timer = setTimeout(async () => {
        try {
          await fn(latestState, ...latestArgs)
          resolve()
        } catch (error) {
          reject(error)
        } finally {
          timer = null
        }
      }, ms)
    })
  }
}