import type { ApiErrorCode } from '@food-sense/shared'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tarojs/taro', () => ({ default: {} }))

import { MealApiError } from './meal-api'
import { mealErrorPresentation } from './meal-error-presentation'

const EXPECTED_RECOVERY: Record<
  ApiErrorCode,
  ReturnType<typeof mealErrorPresentation>['recovery']
> = {
  AI_NOT_CONFIGURED: 'USE_OFFLINE_SAMPLE',
  AI_TIMEOUT: 'RETRY_OR_USE_TEXT',
  AI_INVALID_OUTPUT: 'EDIT_INPUT',
  NO_MEAL_DETECTED: 'EDIT_INPUT',
  IMAGE_TOO_LARGE: 'RESELECT_IMAGE',
  IMAGE_UNSUPPORTED: 'RESELECT_IMAGE',
  IMAGE_COMPRESS_FAILED: 'RETRY_OR_USE_TEXT',
  PROFILE_INVALID_RANGE: 'EDIT_PROFILE',
  DB_UNAVAILABLE: 'RETRY_LATER',
  MEAL_NOT_FOUND: 'REFRESH_RECORDS',
  VALIDATION_FAILED: 'EDIT_INPUT',
  UNKNOWN_DISH: 'CONFIRM_FALLBACK'
}

describe('meal error presentation', () => {
  it.each(Object.entries(EXPECTED_RECOVERY) as Array<[
    ApiErrorCode,
    (typeof EXPECTED_RECOVERY)[ApiErrorCode]
  ]>)('maps %s to a stable recovery action', (code, recovery) => {
    const retryable = [
      'AI_TIMEOUT',
      'IMAGE_COMPRESS_FAILED',
      'DB_UNAVAILABLE'
    ].includes(code)
    const presentation = mealErrorPresentation(
      new MealApiError(code, 'provider body must not be shown', retryable)
    )

    expect(presentation).toMatchObject({ code, recovery, retryable })
    expect(presentation.message).not.toContain('provider body')
  })

  it('uses a retryable network fallback without exposing unknown errors', () => {
    const presentation = mealErrorPresentation(
      new Error('database-url=private')
    )

    expect(presentation).toEqual({
      code: 'NETWORK_ERROR',
      message: '网络连接失败，你的内容仍然保留，可以稍后重试。',
      recovery: 'RETRY_LATER',
      retryable: true
    })
  })
})
