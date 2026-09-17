import type { LanguageModel } from 'ai'
import { describe, expect, it, vi } from 'vitest'

import {
  AI_IMAGE_MEAL_INSTRUCTIONS,
  AI_IMAGE_MEAL_PROMPT_VERSION,
  AI_MEAL_PROMPT_VERSION,
  AiMealInvalidOutputError,
  AiMealProviderError,
  AiMealTimeoutError,
  NoMealDetectedError,
  calculateAiMealCostCny,
  createAiMealParser,
  type AiMealCallMetrics,
  type StructuredMealGenerator
} from './ai-meal-parser'

const MODEL = {} as LanguageModel
const VALID_OUTPUT = {
  mealDetected: true,
  items: [
    {
      displayName: '番茄炒蛋',
      ingredients: ['EGG', 'OTHER'],
      otherIngredients: ['番茄'],
      cookingMethods: ['STIR_FRIED'],
      otherCookingMethods: [],
      portionLevel: 'regular',
      confidence: 0.86,
      uncertainties: ['用油量无法从文字确认']
    }
  ]
}

function modelProvider() {
  return { model: MODEL, modelVersion: 'test-model' }
}

describe('AI text meal parser', () => {
  it('calculates the documented qwen3.8-flash list price from token usage', () => {
    expect(
      calculateAiMealCostCny('qwen3.8-flash', {
        inputTokens: 458,
        outputTokens: 582,
        totalTokens: 1040
      })
    ).toBeCloseTo(0.0019378, 10)
    expect(
      calculateAiMealCostCny('unknown-model', {
        inputTokens: 458,
        outputTokens: 582
      })
    ).toBeNull()
  })

  it('returns a shared-schema ParsedMeal and records sanitized usage metrics', async () => {
    const metrics: AiMealCallMetrics[] = []
    const generate = vi.fn<StructuredMealGenerator>(async () => ({
      output: VALID_OUTPUT,
      usage: { inputTokens: 120, outputTokens: 80, totalTokens: 200 }
    }))
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate,
      logger: (metric) => metrics.push(metric),
      now: (() => {
        let value = 1000
        return () => (value += 25)
      })()
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: '番茄炒蛋和米饭' })
    ).resolves.toEqual({ items: VALID_OUTPUT.items })

    expect(generate).toHaveBeenCalledOnce()
    expect(generate.mock.calls[0]?.[0].prompt).toContain('番茄炒蛋和米饭')
    expect(generate.mock.calls[0]?.[0].instructions).toContain('OTHER')
    expect(generate.mock.calls[0]?.[0].instructions).toContain('番茄炒鸡蛋')
    expect(metrics).toEqual([
      expect.objectContaining({
        event: 'ai_meal_parse',
        status: 'success',
        modelVersion: 'test-model',
        promptVersion: AI_MEAL_PROMPT_VERSION,
        durationMs: 25,
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        costCny: null
      })
    ])
    expect(JSON.stringify(metrics)).not.toContain('番茄炒蛋和米饭')
  })

  it('sends one image to the model with menu-screenshot constraints', async () => {
    const metrics: AiMealCallMetrics[] = []
    const generate = vi.fn<StructuredMealGenerator>(async () => ({
      output: VALID_OUTPUT,
      usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 }
    }))
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate,
      logger: (metric) => metrics.push(metric)
    })
    const image = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

    await expect(
      parser({ sourceType: 'IMAGE', image, mediaType: 'image/jpeg' })
    ).resolves.toEqual({ items: VALID_OUTPUT.items })

    const generation = generate.mock.calls[0]?.[0]
    expect(generation?.instructions).toBe(AI_IMAGE_MEAL_INSTRUCTIONS)
    expect(generation?.instructions).toContain('菜单截图')
    expect(generation?.instructions).toContain('价格')
    expect(generation?.prompt).toEqual([
      {
        role: 'user',
        content: [
          expect.objectContaining({ type: 'text' }),
          { type: 'file', data: image, mediaType: 'image/jpeg' }
        ]
      }
    ])
    expect(metrics[0]).toMatchObject({
      status: 'success',
      promptVersion: AI_IMAGE_MEAL_PROMPT_VERSION
    })
    expect(JSON.stringify(metrics)).not.toContain(String(image))
  })

  it('preserves unknown values only through OTHER companion fields', async () => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => ({ output: VALID_OUTPUT, usage: {} }),
      logger: () => undefined
    })

    const result = await parser({
      sourceType: 'TEXT',
      sourceText: '番茄炒蛋'
    })

    expect(result.items[0]).toMatchObject({
      ingredients: ['EGG', 'OTHER'],
      otherIngredients: ['番茄']
    })
  })

  it('normalizes unsupported vocabulary and missing empty arrays before final validation', async () => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => ({
        output: {
          mealDetected: true,
          items: [
            {
              displayName: '番茄炒鸡蛋',
              ingredients: ['TOMATO', 'egg', 'EGG'],
              cookingMethods: ['stir_fried'],
              portionLevel: 'REGULAR',
              confidence: 0.9
            }
          ]
        },
        usage: {}
      }),
      logger: () => undefined
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: '番茄炒鸡蛋' })
    ).resolves.toEqual({
      items: [
        {
          displayName: '番茄炒鸡蛋',
          ingredients: ['OTHER', 'EGG'],
          otherIngredients: ['TOMATO'],
          cookingMethods: ['STIR_FRIED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          confidence: 0.9,
          uncertainties: []
        }
      ]
    })
  })

  it('adds OTHER when a model supplies companion values without the marker', async () => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => ({
        output: {
          ...VALID_OUTPUT,
          items: [
            {
              ...VALID_OUTPUT.items[0],
              ingredients: ['EGG'],
              otherIngredients: ['番茄']
            }
          ]
        },
        usage: {}
      }),
      logger: () => undefined
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: '番茄炒鸡蛋' })
    ).resolves.toMatchObject({
      items: [
        {
          ingredients: ['EGG', 'OTHER'],
          otherIngredients: ['番茄']
        }
      ]
    })
  })

  it.each([
    {
      ...VALID_OUTPUT,
      items: [{ ...VALID_OUTPUT.items[0], otherIngredients: [] }]
    },
    {
      ...VALID_OUTPUT,
      items: [{ ...VALID_OUTPUT.items[0], portionLevel: 'medium' }]
    },
    {
      ...VALID_OUTPUT,
      items: [{ ...VALID_OUTPUT.items[0], calories: 300 }]
    }
  ])('still rejects unsafe or ambiguous output %#', async (output) => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => ({ output, usage: {} }),
      logger: () => undefined
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: '番茄炒鸡蛋' })
    ).rejects.toBeInstanceOf(AiMealInvalidOutputError)
  })

  it('rejects non-JSON text before it can reach the confirmation page', async () => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => ({ output: 'not json', usage: {} }),
      logger: () => undefined
    })

    try {
      await parser({ sourceType: 'TEXT', sourceText: '番茄炒蛋' })
      expect.fail('expected invalid output')
    } catch (error) {
      expect(error).toBeInstanceOf(AiMealInvalidOutputError)
      expect(error).toMatchObject({ stage: 'json_parse', issuePaths: [] })
    }
  })

  it('distinguishes no meal from malformed model output', async () => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => ({
        output: { mealDetected: false, items: [] },
        usage: {}
      }),
      logger: () => undefined
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: '今天心情不错' })
    ).rejects.toBeInstanceOf(NoMealDetectedError)
  })

  it('aborts and reports timeout at the configured limit', async () => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      timeoutMs: 10,
      generate: ({ abortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal.addEventListener('abort', () => reject(new Error('aborted')))
        }),
      logger: () => undefined
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: '番茄炒蛋' })
    ).rejects.toBeInstanceOf(AiMealTimeoutError)
  })

  it('aborts model generation when the calling request is cancelled', async () => {
    const metrics: AiMealCallMetrics[] = []
    const caller = new AbortController()
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: ({ abortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal.addEventListener('abort', () => reject(new Error('aborted')))
        }),
      logger: (metric) => metrics.push(metric)
    })

    const result = parser(
      { sourceType: 'TEXT', sourceText: '番茄炒蛋' },
      { signal: caller.signal }
    )
    caller.abort()

    await expect(result).rejects.toMatchObject({ name: 'AiMealCancelledError' })
    expect(metrics).toEqual([
      expect.objectContaining({ status: 'cancelled' })
    ])
  })

  it('preserves only sanitized provider error classification', async () => {
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => {
        const error = new Error('secret provider response') as Error & {
          statusCode: number
          code: string
        }
        error.statusCode = 401
        error.code = 'invalid_api_key'
        throw error
      },
      logger: () => undefined
    })

    try {
      await parser({ sourceType: 'TEXT', sourceText: '番茄炒蛋' })
      expect.fail('expected provider error')
    } catch (error) {
      expect(error).toBeInstanceOf(AiMealProviderError)
      expect(error).toMatchObject({
        category: 'configuration',
        statusCode: 401,
        providerCode: 'invalid_api_key'
      })
      expect(String(error)).not.toContain('secret provider response')
    }
  })

  it('extracts only safe status details from a wrapped provider cause', async () => {
    const metrics: AiMealCallMetrics[] = []
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => {
        const cause = new Error('private response body') as Error & {
          statusCode: number
          responseBody: string
        }
        cause.statusCode = 400
        cause.responseBody = JSON.stringify({
          error: { code: 'unsupported_multimodal_input', private: 'secret' }
        })
        throw new Error('wrapper', { cause })
      },
      logger: (metric) => metrics.push(metric)
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: '番茄炒蛋' })
    ).rejects.toMatchObject({ category: 'configuration', statusCode: 400 })
    expect(metrics[0]).toMatchObject({
      providerStatusCode: 400,
      providerErrorCode: 'unsupported_multimodal_input'
    })
    expect(JSON.stringify(metrics)).not.toContain('private response body')
    expect(JSON.stringify(metrics)).not.toContain('secret')
  })

  it('does not log arbitrary provider error labels', async () => {
    const metrics: AiMealCallMetrics[] = []
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => {
        const error = new Error('private') as Error & { code: string }
        error.name = 'provider error with spaces'
        error.code = 'private meal description'
        throw error
      },
      logger: (metric) => metrics.push(metric)
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: 'private meal description' })
    ).rejects.toBeInstanceOf(AiMealProviderError)
    expect(JSON.stringify(metrics)).not.toContain('private meal description')
    expect(metrics[0]).not.toHaveProperty('providerErrorCode')
    expect(metrics[0]).not.toHaveProperty('providerErrorName')
  })

  it('logs only invalid-output stages and schema paths', async () => {
    const metrics: AiMealCallMetrics[] = []
    const parser = createAiMealParser({
      getModelConfiguration: modelProvider,
      generate: async () => ({
        output: {
          ...VALID_OUTPUT,
          items: [
            {
              ...VALID_OUTPUT.items[0],
              privateModelField: 'private-model-field'
            }
          ]
        },
        usage: {}
      }),
      logger: (metric) => metrics.push(metric)
    })

    await expect(
      parser({ sourceType: 'TEXT', sourceText: 'private meal description' })
    ).rejects.toBeInstanceOf(AiMealInvalidOutputError)
    expect(metrics[0]).toMatchObject({
      status: 'invalid_output',
      invalidOutputStage: 'transport_schema',
      invalidOutputPaths: ['items.0']
    })
    expect(JSON.stringify(metrics)).not.toContain('private meal description')
    expect(JSON.stringify(metrics)).not.toContain('private-model-field')
  })
})
