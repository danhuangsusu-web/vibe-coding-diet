import {
  apiErrorResponseSchema,
  parsedMealSchema,
  type ParsedMeal
} from '@food-sense/shared'
import { describe, expect, it, vi } from 'vitest'

import {
  AI_MEAL_PROMPT_VERSION,
  AiMealInvalidOutputError,
  AiMealProviderError,
  AiMealTimeoutError,
  NoMealDetectedError
} from './ai-meal-parser'
import { AIProviderConfigurationError } from './ai-provider'
import { getDemoMealSample, OFFLINE_DEMO_MODEL_VERSION } from './demo-meals'
import { createMealParseHandlers } from './meal-parse-handlers'

function request(body: unknown): Request {
  return new Request('http://localhost/api/parse-meal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const VALID_MEAL: ParsedMeal = getDemoMealSample('light-chicken-set').parsedMeal

describe('meal parse POST handler', () => {
  it('returns validated text output and non-secret model metadata headers', async () => {
    const parse = vi.fn(async () => VALID_MEAL)
    const { POST } = createMealParseHandlers({
      parse,
      resolveMode: () => 'ai',
      getAiModelVersion: () => 'test-model'
    })

    const response = await POST(
      request({ sourceType: 'TEXT', sourceText: '白灼时蔬和鸡胸肉' })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(parsedMealSchema.parse(body)).toEqual(VALID_MEAL)
    expect(response.headers.get('x-food-sense-parser-mode')).toBe('ai')
    expect(response.headers.get('x-food-sense-model-version')).toBe('test-model')
    expect(response.headers.get('x-food-sense-prompt-version')).toBe(
      AI_MEAL_PROMPT_VERSION
    )
    expect(parse).toHaveBeenCalledWith(
      { sourceType: 'TEXT', sourceText: '白灼时蔬和鸡胸肉' },
      { mode: 'ai' }
    )
  })

  it('keeps direct offline parsing available through the same endpoint', async () => {
    const { POST } = createMealParseHandlers({
      resolveMode: () => 'offline'
    })
    const response = await POST(
      request({ sourceType: 'TEXT', sourceText: '干煸芸豆、溜肉段和米饭' })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-food-sense-parser-mode')).toBe('offline')
    expect(response.headers.get('x-food-sense-model-version')).toBe(
      OFFLINE_DEMO_MODEL_VERSION
    )
    expect(parsedMealSchema.safeParse(await response.json()).success).toBe(true)
  })

  it('rejects invalid JSON, images, blank text, and unknown fields', async () => {
    const { POST } = createMealParseHandlers()
    const invalidJson = new Request('http://localhost/api/parse-meal', {
      method: 'POST',
      body: '{'
    })

    for (const invalidRequest of [
      invalidJson,
      request({ sourceType: 'IMAGE', image: 'later' }),
      request({ sourceType: 'TEXT', sourceText: '   ' }),
      request({ sourceType: 'TEXT', sourceText: '米饭', extra: true })
    ]) {
      const response = await POST(invalidRequest)
      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_FAILED')
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
    }
  })

  it.each([
    [new AIProviderConfigurationError(), 'AI_NOT_CONFIGURED', 503],
    [new AiMealTimeoutError(), 'AI_TIMEOUT', 504],
    [new AiMealInvalidOutputError(), 'AI_INVALID_OUTPUT', 502],
    [new NoMealDetectedError(), 'NO_MEAL_DETECTED', 422]
  ] as const)('maps %s to %s without leaking internals', async (error, code, status) => {
    const parse = vi.fn(async () => {
      throw error
    })
    const { POST } = createMealParseHandlers({
      parse,
      resolveMode: () => 'ai',
      getAiModelVersion: () => 'secret-model-version'
    })

    const response = await POST(
      request({ sourceType: 'TEXT', sourceText: 'private meal description' })
    )
    const body = await response.json()
    const serialized = JSON.stringify(body)

    expect(response.status).toBe(status)
    expect(body.error.code).toBe(code)
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
    expect(serialized).not.toContain('private meal description')
    expect(serialized).not.toContain('secret-model-version')
  })

  it.each([
    [
      new AiMealProviderError({ category: 'configuration', statusCode: 401 }),
      'AI_NOT_CONFIGURED',
      false
    ],
    [
      new AiMealProviderError({ category: 'transient', statusCode: 429 }),
      'AI_TIMEOUT',
      true
    ]
  ] as const)('maps sanitized provider failures without exposing provider details', async (error, code, retryable) => {
    const { POST } = createMealParseHandlers({
      parse: async () => {
        throw error
      },
      resolveMode: () => 'ai'
    })

    const response = await POST(
      request({ sourceType: 'TEXT', sourceText: '米饭' })
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toMatchObject({ code, retryable })
    expect(JSON.stringify(body)).not.toContain('401')
    expect(JSON.stringify(body)).not.toContain('429')
  })
})
