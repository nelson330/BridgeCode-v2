export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  })

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
