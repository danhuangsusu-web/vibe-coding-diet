import { describe, expect, it, vi } from 'vitest'

import { getDemoMealSample } from '../../../server/lib/demo-meals'

vi.mock('./meal-api', () => ({
  parseImageMeal: vi.fn(),
  parseTextMeal: vi.fn()
}))

import {
  parseMeal,
  parseMealWithMetadata
} from './meal-parser'

describe('miniprogram meal parser facade', () => {
  it('returns the same northeast text sample as the server parser', async () => {
    await expect(
      parseMeal({
        sourceType: 'TEXT',
        sourceText: '干煸芸豆 + 溜肉段 + 米饭'
      })
    ).resolves.toEqual(getDemoMealSample('northeast-combo').parsedMeal)
  })

  it('returns the same light meal text sample as the server parser', async () => {
    await expect(
      parseMeal({
        sourceType: 'TEXT',
        sourceText: '白灼时蔬、水煮鸡胸和小份米饭'
      })
    ).resolves.toEqual(getDemoMealSample('light-chicken-set').parsedMeal)
  })

  it('uploads a local image and preserves its server metadata', async () => {
    const parseImage = vi.fn(async () => ({
      parsedMeal: getDemoMealSample('light-chicken-set').parsedMeal,
      metadata: {
        isDemo: false,
        modelVersion: 'vision-model',
        promptVersion: 'image-meal-v1'
      }
    }))

    await expect(
      parseMealWithMetadata(
        {
          sourceType: 'IMAGE',
          localPath: 'wxfile://compressed-meal.jpg'
        },
        { parseImage }
      )
    ).resolves.toMatchObject({
      parsedMeal: getDemoMealSample('light-chicken-set').parsedMeal,
      metadata: { isDemo: false, modelVersion: 'vision-model' }
    })
    expect(parseImage).toHaveBeenCalledWith('wxfile://compressed-meal.jpg')
  })

  it('sends non-demo text to the server parser and preserves its metadata', async () => {
    const parseText = vi.fn(async () => ({
      parsedMeal: getDemoMealSample('light-chicken-set').parsedMeal,
      metadata: {
        isDemo: false,
        modelVersion: 'test-model',
        promptVersion: 'text-meal-v2'
      }
    }))

    await expect(
      parseMealWithMetadata(
        { sourceType: 'TEXT', sourceText: '一份番茄炒蛋' },
        { parseText }
      )
    ).resolves.toEqual({
      parsedMeal: getDemoMealSample('light-chicken-set').parsedMeal,
      metadata: {
        isDemo: false,
        modelVersion: 'test-model',
        promptVersion: 'text-meal-v2'
      }
    })
    expect(parseText).toHaveBeenCalledWith('一份番茄炒蛋')
  })

  it('does not send explicit offline demo text to the server', async () => {
    const parseText = vi.fn()
    const result = await parseMealWithMetadata(
      { sourceType: 'TEXT', sourceText: '干煸芸豆 + 溜肉段 + 米饭' },
      { parseText }
    )

    expect(result.metadata).toMatchObject({
      isDemo: true,
      modelVersion: 'offline-demo-v1'
    })
    expect(parseText).not.toHaveBeenCalled()
  })

  it('propagates image upload failures instead of substituting demo data', async () => {
    const error = new Error('upload failed')
    await expect(
      parseMealWithMetadata(
        {
          sourceType: 'IMAGE',
          localPath: 'wxfile://compressed-meal.jpg'
        },
        { parseImage: async () => Promise.reject(error) }
      )
    ).rejects.toBe(error)
  })
})
