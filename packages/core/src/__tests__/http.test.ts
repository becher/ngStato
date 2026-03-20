// ─────────────────────────────────────────────────────
// @ngstato/core — tests StatoHttp
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StatoHttp, createHttp } from '../http'
import { StatoHttpError }        from '../types'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch    = mockFetch

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok:      status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json:    () => Promise.resolve(body),
    text:    () => Promise.resolve(JSON.stringify(body))
  })
}

describe('StatoHttp', () => {

  beforeEach(() => { mockFetch.mockReset() })

  it('GET — appelle la bonne URL', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 1 }))

    const http = createHttp({ baseUrl: 'https://api.test.com' })
    const data = await http.get('/users')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/users',
      expect.objectContaining({ method: 'GET' })
    )
    expect(data).toEqual({ id: 1 })
  })

  it('GET — ajoute les query params', async () => {
    mockFetch.mockReturnValue(mockResponse([]))

    const http = createHttp({ baseUrl: 'https://api.test.com' })
    await http.get('/users', { params: { q: 'Alice', limit: 10 } })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('q=Alice')
    expect(calledUrl).toContain('limit=10')
  })

  it('POST — envoie le body en JSON', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 2 }))

    const http = createHttp({ baseUrl: 'https://api.test.com' })
    await http.post('/users', { name: 'Alice' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/users',
      expect.objectContaining({
        method: 'POST',
        body:   JSON.stringify({ name: 'Alice' })
      })
    )
  })

  it('injecte le token auth automatiquement', async () => {
    mockFetch.mockReturnValue(mockResponse({}))

    const http = createHttp({
      baseUrl: 'https://api.test.com',
      auth:    () => 'mon-token-secret'
    })
    await http.get('/protected')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer mon-token-secret')
  })

  it('lance StatoHttpError si réponse non-ok', async () => {
    mockFetch.mockReturnValue(mockResponse({ message: 'Non autorisé' }, 401))

    const http = createHttp({ baseUrl: 'https://api.test.com' })

    await expect(http.get('/protected')).rejects.toThrow(StatoHttpError)
  })

  it('DELETE 204 — retourne undefined sans erreur', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok:      true,
      status:  204,
      headers: { get: () => null },
      json:    () => Promise.resolve(undefined),
      text:    () => Promise.resolve('')
    }))

    const http   = createHttp({ baseUrl: 'https://api.test.com' })
    const result = await http.delete('/users/1')

    expect(result).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────
// TESTS ADDITIONNELS — http.ts
// ─────────────────────────────────────────────────────

describe('StatoHttp — cas avancés', () => {

  beforeEach(() => mockFetch.mockReset())

  it('PUT — envoie le body correctement', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 1, name: 'Bob' }))

    const http = createHttp({ baseUrl: 'https://api.test.com' })
    await http.put('/users/1', { name: 'Bob' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/users/1',
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('PATCH — envoie le body correctement', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 1 }))

    const http = createHttp({ baseUrl: 'https://api.test.com' })
    await http.patch('/users/1', { active: false })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/users/1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('URL absolue — pas de baseUrl préfixé', async () => {
    mockFetch.mockReturnValue(mockResponse({}))

    const http = createHttp({ baseUrl: 'https://api.test.com' })
    await http.get('https://autre-api.com/data')

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toBe('https://autre-api.com/data')
    expect(calledUrl).not.toContain('api.test.com')
  })

  it('headers custom par requête', async () => {
    mockFetch.mockReturnValue(mockResponse({}))

    const http = createHttp({ baseUrl: 'https://api.test.com' })
    await http.get('/data', {
      headers: { 'X-Custom-Header': 'ma-valeur' }
    })

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['X-Custom-Header']).toBe('ma-valeur')
  })

  it('pas de token — pas de header Authorization', async () => {
    mockFetch.mockReturnValue(mockResponse({}))

    const http = createHttp({
      baseUrl: 'https://api.test.com',
      auth:    () => null   // pas de token
    })
    await http.get('/public')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBeUndefined()
  })

  it('configureHttp change l instance globale http', async () => {
    mockFetch.mockReturnValue(mockResponse({ ok: true }))

    const { configureHttp, http } = await import('../http')
    configureHttp({ baseUrl: 'https://nouvelle-api.com' })

    await http.get('/test')

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('nouvelle-api.com')
  })
})