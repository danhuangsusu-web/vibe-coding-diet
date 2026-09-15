import { z } from 'zod'

import { nonEmptyTextSchema } from './common'

export const apiErrorCodeSchema = z.enum([
  'AI_NOT_CONFIGURED',
  'AI_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'NO_MEAL_DETECTED',
  'IMAGE_TOO_LARGE',
  'IMAGE_UNSUPPORTED',
  'IMAGE_COMPRESS_FAILED',
  'PROFILE_INVALID_RANGE',
  'DB_UNAVAILABLE',
  'MEAL_NOT_FOUND',
  'VALIDATION_FAILED',
  'UNKNOWN_DISH'
])

function errorVariant<
  TCode extends z.infer<typeof apiErrorCodeSchema>,
  TRetryable extends boolean
>(
  code: TCode,
  retryable: TRetryable
) {
  return z
    .object({
      code: z.literal(code),
      message: nonEmptyTextSchema,
      retryable: z.literal(retryable)
    })
    .strict()
}

export const apiErrorSchema = z.discriminatedUnion('code', [
  errorVariant('AI_NOT_CONFIGURED', false),
  errorVariant('AI_TIMEOUT', true),
  errorVariant('AI_INVALID_OUTPUT', false),
  errorVariant('NO_MEAL_DETECTED', false),
  errorVariant('IMAGE_TOO_LARGE', false),
  errorVariant('IMAGE_UNSUPPORTED', false),
  errorVariant('IMAGE_COMPRESS_FAILED', true),
  errorVariant('PROFILE_INVALID_RANGE', false),
  errorVariant('DB_UNAVAILABLE', true),
  errorVariant('MEAL_NOT_FOUND', false),
  errorVariant('VALIDATION_FAILED', false),
  errorVariant('UNKNOWN_DISH', false)
])

export const apiErrorResponseSchema = z
  .object({
    error: apiErrorSchema
  })
  .strict()

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
