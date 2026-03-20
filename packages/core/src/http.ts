// ─────────────────────────────────────────────────────
// @ngstato/core — StatoHttp
// Client HTTP natif — fetch + baseUrl + auth + timeout
// Zero dépendance — pas de HttpClient Angular
// ─────────────────────────────────────────────────────

import type { StatoConfig } from './types'
import { StatoHttpError }   from './types'

// ─────────────────────────────────────────────────────
// OPTIONS PAR REQUÊTE
// ─────────────────────────────────────────────────────

export interface RequestOptions {
  params?:  Record<string, string | number | boolean>
  headers?: Record<string, string>
  signal?:  AbortSignal   // pour abortable()
}

// ─────────────────────────────────────────────────────
// CLASSE PRINCIPALE
// ─────────────────────────────────────────────────────

export class StatoHttp {

  private _config: StatoConfig

  constructor(config: StatoConfig = {}) {
    this._config = config
  }

  // ── GET ───────────────────────────────────────────
  get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('GET', url, undefined, options)
  }

  // ── POST ──────────────────────────────────────────
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this._request<T>('POST', url, body, options)
  }

  // ── PUT ───────────────────────────────────────────
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this._request<T>('PUT', url, body, options)
  }

  // ── PATCH ─────────────────────────────────────────
  patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this._request<T>('PATCH', url, body, options)
  }

  // ── DELETE ────────────────────────────────────────
  delete<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('DELETE', url, undefined, options)
  }

  // ── MOTEUR INTERNE ────────────────────────────────
  private async _request<T>(
    method:   string,
    url:      string,
    body?:    unknown,
    options?: RequestOptions
  ): Promise<T> {

    // 1. Construire l'URL complète avec baseUrl + params
    const fullUrl = this._buildUrl(url, options?.params)

    // 2. Récupérer le token auth si configuré
    const token = this._config.auth?.()

    // 3. Construire les headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this._config.headers,
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }

    // 4. Configurer le timeout si défini
    let signal = options?.signal
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (this._config.timeout && !signal) {
      const controller = new AbortController()
      signal    = controller.signal
      timeoutId = setTimeout(
        () => controller.abort(),
        this._config.timeout
      )
    }

    // 5. Exécuter la requête
    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        signal,
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {}
        )
      })

      // 6. Gérer les erreurs HTTP automatiquement
      if (!response.ok) {
        const errorBody = await response.text()
        throw new StatoHttpError(response.status, errorBody)
      }

      // 7. Réponse vide — ex: DELETE 204
      const contentType = response.headers.get('content-type')
      if (
        response.status === 204 ||
        !contentType?.includes('application/json')
      ) {
        return undefined as T
      }

      // 8. Parser le JSON
      return response.json() as Promise<T>

    } finally {
      // Toujours nettoyer le timeout
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  // ── CONSTRUIRE L'URL AVEC PARAMS ──────────────────
  private _buildUrl(
    path:    string,
    params?: Record<string, string | number | boolean>
  ): string {

    // Si l'URL est absolue — on ne préfixe pas baseUrl
    const url = path.startsWith('http')
      ? path
      : `${this._config.baseUrl ?? ''}${path}`

    // Ajouter les query params si présents
    if (!params || Object.keys(params).length === 0) return url

    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString()

    return `${url}?${qs}`
  }
}

// ─────────────────────────────────────────────────────
// FACTORY FUNCTION — createHttp()
// ─────────────────────────────────────────────────────

export function createHttp(config: StatoConfig = {}): StatoHttp {
  return new StatoHttp(config)
}

// ─────────────────────────────────────────────────────
// INSTANCE GLOBALE — http
// Utilisée dans les actions des stores
// Configurée via provideStato()
// ─────────────────────────────────────────────────────

let _globalHttp: StatoHttp = new StatoHttp()

export function configureHttp(config: StatoConfig): void {
  _globalHttp = new StatoHttp(config)
}

// L'objet http — utilisé dans les actions
// await http.get('/api/users')
export const http = {
  get:    <T>(url: string, options?: RequestOptions) =>
            _globalHttp.get<T>(url, options),

  post:   <T>(url: string, body?: unknown, options?: RequestOptions) =>
            _globalHttp.post<T>(url, body, options),

  put:    <T>(url: string, body?: unknown, options?: RequestOptions) =>
            _globalHttp.put<T>(url, body, options),

  patch:  <T>(url: string, body?: unknown, options?: RequestOptions) =>
            _globalHttp.patch<T>(url, body, options),

  delete: <T>(url: string, options?: RequestOptions) =>
            _globalHttp.delete<T>(url, options),
}