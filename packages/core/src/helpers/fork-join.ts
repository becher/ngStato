// ─────────────────────────────────────────────────────
// @ngstato/core — forkJoin()
// Exécute plusieurs tâches en parallèle, attend tout (Promise.all)
// ─────────────────────────────────────────────────────

export type TaskContext = { signal: AbortSignal }
export type Task<T> = (ctx: TaskContext) => Promise<T> | T

export type ForkJoinOptions = {
  signal?: AbortSignal
}

export async function forkJoin<T extends Record<string, Task<any>>>(
  tasks: T,
  options?: ForkJoinOptions
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const controller = new AbortController()
  const signal = options?.signal

  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const entries = Object.entries(tasks) as Array<[keyof T, T[keyof T]]>
  const results = await Promise.all(entries.map(async ([key, task]) => {
    const value = await task({ signal: controller.signal })
    return [key, value] as const
  }))

  return Object.fromEntries(results) as { [K in keyof T]: Awaited<ReturnType<T[K]>> }
}

