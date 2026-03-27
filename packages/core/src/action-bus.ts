// ─────────────────────────────────────────────────────
// @ngstato/core — Action Bus (inter-stores)
// Permet d'écouter l'exécution d'une action spécifique.
// ─────────────────────────────────────────────────────

export type ActionEvent = {
  action:   Function
  name:     string
  args:     unknown[]
  store:    any
  status:   'success' | 'error'
  duration: number
  error?:   Error
}

type Listener = (event: ActionEvent) => void

const listenersByAction = new WeakMap<Function, Set<Listener>>()

export function emitActionEvent(event: ActionEvent) {
  const set = listenersByAction.get(event.action)
  if (!set?.size) return
  for (const listener of set) {
    try {
      listener(event)
    } catch {
      // Ne jamais casser le flux d'une action à cause d'un listener.
    }
  }
}

export function subscribeToAction(action: Function, listener: Listener): () => void {
  let set = listenersByAction.get(action)
  if (!set) {
    set = new Set()
    listenersByAction.set(action, set)
  }
  set.add(listener)
  return () => {
    set?.delete(listener)
  }
}

