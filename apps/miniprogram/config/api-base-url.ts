const DEVELOPMENT_API_BASE_URL = 'http://127.0.0.1:3000'

export function resolveApiBaseUrl(
  nodeEnv: string | undefined,
  configuredValue = ''
) {
  const normalizedValue = configuredValue.trim().replace(/\/+$/, '')

  if (normalizedValue) {
    return normalizedValue
  }

  return nodeEnv === 'production' ? '' : DEVELOPMENT_API_BASE_URL
}
