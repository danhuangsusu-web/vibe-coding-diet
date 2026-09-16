export const MAX_MEAL_IMAGE_EDGE = 1280
export const MAX_COMPRESSED_MEAL_IMAGE_BYTES = 1024 * 1024
export const MEAL_IMAGE_QUALITY = 75

export type MediaSelectionErrorKind =
  | 'cancelled'
  | 'permission-denied'
  | 'failed'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message

  if (
    typeof error === 'object' &&
    error !== null &&
    'errMsg' in error &&
    typeof error.errMsg === 'string'
  ) {
    return error.errMsg
  }

  return String(error)
}

export function classifyMediaSelectionError(
  error: unknown
): MediaSelectionErrorKind {
  const message = errorMessage(error).toLowerCase()

  if (message.includes('cancel')) return 'cancelled'

  if (
    message.includes('auth deny') ||
    message.includes('authorize') ||
    message.includes('permission') ||
    message.includes('scope.camera') ||
    message.includes('denied')
  ) {
    return 'permission-denied'
  }

  return 'failed'
}

export function getCompressedDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError('Image dimensions must be positive finite numbers')
  }

  const ratio = Math.min(1, MAX_MEAL_IMAGE_EDGE / Math.max(width, height))

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  }
}

export function isSupportedMealImage(type: string, path: string): boolean {
  const normalizedType = type.toLowerCase().replace('image/', '')
  const normalizedPath = path.toLowerCase().split('?')[0] ?? ''

  if (normalizedType === 'jpg' || normalizedType === 'jpeg' || normalizedType === 'png') {
    return true
  }

  return /\.(jpe?g|png)$/.test(normalizedPath)
}
