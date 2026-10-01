import { useSyncExternalStore } from 'react'

let mutationCount = 0
const mutationListeners = new Set<() => void>()
const inFlight = new Map<string, Promise<unknown>>()
function publishMutation() {
  for (const listener of mutationListeners) listener()
}
export function usePendingMutation() {
  return useSyncExternalStore(
    (listener) => {
      mutationListeners.add(listener)
      return () => {
        mutationListeners.delete(listener)
      }
    },
    () => mutationCount > 0
  )
}

export function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  if (!mutation) return performFetch<T>(endpoint, options)
  const key =
    !options.signal && (typeof options.body === 'string' || !options.body)
      ? `${method}:${endpoint}:${options.body || ''}`
      : null
  if (key && inFlight.has(key)) return inFlight.get(key) as Promise<T>
  mutationCount++
  publishMutation()
  const request = performFetch<T>(endpoint, options).finally(() => {
    if (key) inFlight.delete(key)
    mutationCount--
    publishMutation()
  })
  if (key) inFlight.set(key, request)
  return request
}

async function performFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.')
  }

  if (!response.ok) {
    let errorJson: {
      error?: { code?: string; message?: string; details?: Array<{ path?: string; message?: string }> }
    } = {}
    try {
      errorJson = await response.json()
    } catch {
      // response is not JSON
    }

    let message = errorJson.error?.message || `HTTP ${response.status}: ${response.statusText}`
    if (Array.isArray(errorJson.error?.details) && errorJson.error.details.length > 0) {
      const detailedMessages = errorJson.error.details
        .map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))
        .filter(Boolean)
        .join(' | ')
      if (detailedMessages) {
        message = `${message}: ${detailedMessages}`
      }
    }

    const error = new Error(message) as Error & { code?: string; status: number; details?: any }
    error.code = errorJson.error?.code
    error.status = response.status
    error.details = errorJson.error?.details
    throw error
  }

  if (response.status === 204) {
    return null as unknown as T
  }

  return response.json()
}
