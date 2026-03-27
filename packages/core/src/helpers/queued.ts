// ─────────────────────────────────────────────────────
// @ngstato/core — queued()
// Équivalent “concatMap” : exécute les appels
// les uns après les autres, dans l'ordre d'arrivée.
// ─────────────────────────────────────────────────────

export function queued<S, A extends unknown[]>(
  fn: (state: S, ...args: A) => Promise<void>
) {
  type QueueItem = {
    state: S
    args: A
    resolve: () => void
    reject: (err: unknown) => void
  }

  const queue: QueueItem[] = []
  let processing = false

  const processNext = () => {
    if (processing) return
    processing = true

    const run = async () => {
      while (queue.length) {
        const item = queue.shift()
        if (!item) break

        try {
          await fn(item.state, ...item.args)
          item.resolve()
        } catch (err) {
          item.reject(err)
          // Pour coller à la logique “concatMap” : on stoppe et on rejette
          // les items restants (leur execution n'a pas de sens sans reprise).
          while (queue.length) {
            const rest = queue.shift()
            rest?.reject(err)
          }
          return
        }
      }
    }

    void run().finally(() => {
      processing = false
    })
  }

  return (state: S, ...args: A): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      queue.push({ state, args, resolve, reject })
      processNext()
    })
  }
}

