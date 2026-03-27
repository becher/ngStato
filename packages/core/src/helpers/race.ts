// ─────────────────────────────────────────────────────
// @ngstato/core — race()
// Retourne le résultat de la première tâche qui se termine.
// Les autres peuvent être annulées si elles respectent AbortSignal.
// ─────────────────────────────────────────────────────

export type TaskContext = { signal: AbortSignal }
export type Task<T> = (ctx: TaskContext) => Promise<T> | T

export type RaceOptions = {
  signal?: AbortSignal
}

export async function race<T>(
  tasks: Array<Task<T>>,
  options?: RaceOptions
): Promise<T> {
  const controller = new AbortController()
  const outer = options?.signal

  if (outer) {
    if (outer.aborted) controller.abort()
    else outer.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const wrapped = tasks.map((task) => (async () => task({ signal: controller.signal }))())

  try {
    return await Promise.race(wrapped)
  } finally {
    // best-effort cancellation
    controller.abort()
  }
}

