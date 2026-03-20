// ─────────────────────────────────────────────────────
// @ngstato/core — fromStream()
// Pont entre un flux Observable/callback et le state
// Pour : Firebase, Supabase, WebSocket, SSE
// RxJS optionnel — pas obligatoire
// ─────────────────────────────────────────────────────

// Interface minimale d'un Observable
// Compatible RxJS sans l'importer
export interface StatoObservable<T> {
  subscribe(observer: {
    next?:     (value: T) => void
    error?:    (error: unknown) => void
    complete?: () => void
  }): { unsubscribe(): void }
}

export interface StreamOptions {
  // Appelé quand le stream se termine normalement
  onComplete?: () => void
  // Appelé quand le stream rencontre une erreur
  onError?:    (error: unknown) => void
}

export function fromStream<S, T>(
  // setupFn — retourne l'Observable ou le flux
  setupFn:   (state: S) => StatoObservable<T>,
  // updateFn — appelé à chaque valeur émise
  updateFn:  (state: S, value: T) => void,
  options?:  StreamOptions
) {
  return (state: S): (() => void) => {
    // Démarrer le flux
    const stream$     = setupFn(state)
    const subscription = stream$.subscribe({

      next: (value: T) => {
        // Mettre à jour le state à chaque émission
        updateFn(state, value)
      },

      error: (error: unknown) => {
        options?.onError?.(error)
      },

      complete: () => {
        options?.onComplete?.()
      }
    })

    // Retourner la fonction de cleanup
    // appelée automatiquement à la destruction du store
    return () => subscription.unsubscribe()
  }
}