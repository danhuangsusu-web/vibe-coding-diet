import { parsedMealSchema, type ParsedMeal } from '@food-sense/shared'
import { describe, expect, it, vi } from 'vitest'

import { DEMO_MEAL_SAMPLES } from './demo-meals'
import {
  MealParserConfigurationError,
  OfflineMealSampleNotFoundError,
  offlineMealParser,
  parseMeal,
  resolveMealParserMode,
  type MealParser
} from './meal-parser'

describe('meal parser mode', () => {
  it.each([
    [undefined, 'offline'],
    ['', 'offline'],
    ['offline', 'offline'],
    ['ai', 'ai']
  ] as const)('resolves %s as %s', (configuredMode, expected) => {
    expect(resolveMealParserMode(configuredMode)).toBe(expected)
  })

  it('rejects unsupported configuration values', () => {
    expect(() => resolveMealParserMode('mock')).toThrow(
      MealParserConfigurationError
    )
  })
})

describe('offline meal parser', () => {
  it.each(DEMO_MEAL_SAMPLES)(
    'parses the $title text sample through the shared schema',
    async (sample) => {
      const result = await offlineMealParser(sample.input)

      expect(result).toEqual(sample.parsedMeal)
      expect(parsedMealSchema.safeParse(result).success).toBe(true)
    }
  )

  it('accepts common separators without creating a second parser path', async () => {
    const result = await offlineMealParser({
      sourceType: 'TEXT',
      sourceText: '干煸芸豆 + 溜肉段 + 米饭'
    })

    expect(result).toEqual(DEMO_MEAL_SAMPLES[0]?.parsedMeal)
  })

  it('uses a selected sample for offline image input', async () => {
    const result = await offlineMealParser({
      sourceType: 'IMAGE',
      image: new Uint8Array([1, 2, 3]),
      mediaType: 'image/jpeg',
      demoSampleId: 'light-chicken-set'
    })

    expect(result).toEqual(DEMO_MEAL_SAMPLES[1]?.parsedMeal)
  })

  it('rejects text outside the two explicit demo samples', async () => {
    await expect(
      offlineMealParser({ sourceType: 'TEXT', sourceText: '未知的一餐' })
    ).rejects.toBeInstanceOf(OfflineMealSampleNotFoundError)
  })
})

describe('parseMeal', () => {
  it('uses offline mode without touching an AI parser', async () => {
    const aiParser = vi.fn<MealParser>()
    const sample = DEMO_MEAL_SAMPLES[0]

    if (!sample) throw new Error('Expected the first demo sample')

    await expect(
      parseMeal(sample.input, { mode: 'offline', aiParser })
    ).resolves.toEqual(sample.parsedMeal)
    expect(aiParser).not.toHaveBeenCalled()
  })

  it('delegates ai mode through the same contract', async () => {
    const sample = DEMO_MEAL_SAMPLES[1]

    if (!sample) throw new Error('Expected the second demo sample')

    const aiParser = vi.fn<MealParser>(async () => sample.parsedMeal)

    await expect(
      parseMeal(sample.input, { mode: 'ai', aiParser })
    ).resolves.toEqual(sample.parsedMeal)
    expect(aiParser).toHaveBeenCalledOnce()
    expect(aiParser).toHaveBeenCalledWith(sample.input)
  })

  it('rejects ai mode until an adapter is supplied', async () => {
    const sample = DEMO_MEAL_SAMPLES[0]

    if (!sample) throw new Error('Expected the first demo sample')

    await expect(parseMeal(sample.input, { mode: 'ai' })).rejects.toBeInstanceOf(
      MealParserConfigurationError
    )
  })

  it('validates every adapter result with the shared schema', async () => {
    const sample = DEMO_MEAL_SAMPLES[0]

    if (!sample) throw new Error('Expected the first demo sample')

    const invalidAiParser: MealParser = async () =>
      ({ items: [] }) as ParsedMeal

    await expect(
      parseMeal(sample.input, { mode: 'ai', aiParser: invalidAiParser })
    ).rejects.toThrow()
  })
})
