// ─────────────────────────────────────────────────────
// @ngstato/core — optimistic()
// Mise à jour optimiste avec rollback automatique
// ─────────────────────────────────────────────────────

export function optimistic<S, A extends unknown[]>(
  // Action immédiate — modifie le state sans attendre
  immediate: (state: S, ...args: A) => void,
  // Confirmation API — si elle échoue → rollback
  confirm:   (state: S, ...args: A) => Promise<void>
) {
  return async (state: S, ...args: A): Promise<void> => {
    // 1. Snapshot PROFOND du state AVANT la modification
    // JSON deep clone — structuredClone fails on Proxy objects
    const snapshot = JSON.parse(JSON.stringify(state)) as S

    // 2. Appliquer la modification immédiatement
    immediate(state, ...args)

    try {
      // 3. Confirmer avec l'API
      await confirm(state, ...args)
      // Succès — le state optimiste est correct, rien à faire

    } catch (error) {
      // 4. Échec — restaurer le state d'avant
      Object.assign(state as object, snapshot)
      throw error
    }
  }
}