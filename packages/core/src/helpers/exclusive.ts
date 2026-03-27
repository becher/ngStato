// ─────────────────────────────────────────────────────
// @ngstato/core — exclusive()
// Équivalent “exhaustMap” : ignore les nouveaux appels
// pendant qu'une exécution est en cours.
// ─────────────────────────────────────────────────────

export function exclusive<S, A extends unknown[]>(
  fn: (state: S, ...args: A) => Promise<void>
) {
  let running = false
  let current: Promise<void> | null = null

  return (state: S, ...args: A): Promise<void> => {
    // Si déjà en cours : on renvoie la Promise courante.
    // Ainsi l'appelant peut await, mais aucun nouvel effet ne démarre.
    if (running && current) return current

    running = true

    current = (async () => {
      try {
        await fn(state, ...args)
      } finally {
        running = false
        current = null
      }
    })()

    return current
  }
}

