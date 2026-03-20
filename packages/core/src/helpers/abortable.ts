// ─────────────────────────────────────────────────────
// @ngstato/core — abortable()
// Annule automatiquement la requête précédente
// Remplace switchMap de RxJS — sans RxJS
// ─────────────────────────────────────────────────────

export interface AbortableOptions {
  signal: AbortSignal
}

export function abortable<S, A extends unknown[]>(
  fn: (state: S, ...args: [...A, AbortableOptions]) => Promise<void>
) {
  let controller: AbortController | null = null

  return async (state: S, ...args: A): Promise<void> => {
    // Annuler la requête précédente si elle tourne encore
    if (controller) {
      controller.abort()
    }

    // Créer un nouveau controller pour cette requête
    controller = new AbortController()
    const signal = controller.signal

    try {
      await fn(state, ...args, { signal } as any)
    } catch (error: any) {
      // Ignorer silencieusement les erreurs d'annulation
      if (error?.name === 'AbortError') return
      throw error
    } finally {
      controller = null
    }
  }
}