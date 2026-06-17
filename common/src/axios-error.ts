import * as axios from 'axios'

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token'
])

const SENSITIVE_FIELD_NAMES = new Set([
  'token',
  'password',
  'secret',
  'passphrase',
  'startup_script',
  'gh-pat',
  'gh_pat',
  'controller-auth-cert',
  'controller-auth-cert-key',
  'controller-root-token'
])

const REDACTED = '[REDACTED]'

function redactHeaderName(name: string): boolean {
  return SENSITIVE_HEADER_NAMES.has(name.toLowerCase())
}

function redactFieldName(name: string): boolean {
  return SENSITIVE_FIELD_NAMES.has(name.toLowerCase())
}

function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return redactValue(JSON.parse(trimmed))
      } catch {
        return value
      }
    }
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => redactValue(item))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, fieldValue]) => [
          key,
          redactFieldName(key) ? REDACTED : redactValue(fieldValue)
        ]
      )
    )
  }

  return value
}

function redactHeaders(
  headers: axios.AxiosRequestHeaders | axios.RawAxiosResponseHeaders | undefined
): Record<string, unknown> | undefined {
  if (!headers) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      redactHeaderName(name) ? REDACTED : value
    ])
  )
}

function formatRequest(
  config: axios.InternalAxiosRequestConfig | undefined
): Record<string, unknown> {
  if (!config) {
    return {}
  }

  const request: Record<string, unknown> = {
    method: config.method?.toUpperCase(),
    url: axios.default.getUri(config)
  }

  const headers = redactHeaders(config.headers)
  if (headers && Object.keys(headers).length > 0) {
    request.headers = headers
  }

  if (config.auth) {
    request.auth = {
      username: config.auth.username ?? '',
      password: config.auth.password ? REDACTED : undefined
    }
  }

  if (config.data !== undefined && config.data !== '') {
    request.body = redactValue(config.data)
  }

  if (config.params && Object.keys(config.params).length > 0) {
    request.params = redactValue(config.params)
  }

  return request
}

function formatResponse(
  response: axios.AxiosResponse
): Record<string, unknown> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: redactHeaders(response.headers),
    body: redactValue(response.data)
  }
}

export function createAxiosError(error: unknown): Error {
  if (!(error instanceof axios.AxiosError)) {
    if (error instanceof Error) {
      return error
    }
    return new Error(String(error))
  }

  if (error.response) {
    const details = {
      request: formatRequest(error.config),
      response: formatResponse(error.response)
    }
    return new Error(`HTTP request failed: ${JSON.stringify(details, null, 2)}`)
  }

  if (error.request) {
    const details = {
      request: formatRequest(error.config),
      message: error.message
    }
    return new Error(
      `HTTP request failed (no response): ${JSON.stringify(details, null, 2)}`
    )
  }

  return new Error(error.message)
}
