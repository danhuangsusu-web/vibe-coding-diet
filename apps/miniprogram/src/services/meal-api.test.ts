import { beforeEach, describe, expect, it, vi } from 'vitest'

const uploadFile = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    request: vi.fn(),
    uploadFile
  }
}))

import { MealApiError, parseImageMeal } from './meal-api'

const PARSED_MEAL = {
  items: [
    {
      displayName: '番茄炒蛋',
      ingredients: ['EGG', 'OTHER'],
      otherIngredients: ['番茄'],
      cookingMethods: ['STIR_FRIED'],
      otherCookingMethods: [],
      portionLevel: 'regular',
      confidence: 0.86,
      uncertainties: ['份量无法从图片确认']
    }
  ]
}

describe('miniprogram image meal API', () => {
  beforeEach(() => {
    uploadFile.mockReset()
  })

  it('uploads one temporary image with the fixed field name and timeout', async () => {
    uploadFile.mockResolvedValue({
      statusCode: 200,
      data: JSON.stringify(PARSED_MEAL),
      header: {
        'X-Food-Sense-Is-Demo': 'false',
        'X-Food-Sense-Model-Version': 'vision-model',
        'X-Food-Sense-Prompt-Version': 'image-meal-v1'
      },
      errMsg: 'uploadFile:ok'
    })

    await expect(
      parseImageMeal('wxfile://compressed-meal.jpg')
    ).resolves.toEqual({
      parsedMeal: PARSED_MEAL,
      metadata: {
        isDemo: false,
        modelVersion: 'vision-model',
        promptVersion: 'image-meal-v1'
      }
    })
    expect(uploadFile).toHaveBeenCalledWith({
      url: 'http://api.test/api/parse-meal',
      filePath: 'wxfile://compressed-meal.jpg',
      name: 'image',
      timeout: 20_000
    })
  })

  it('preserves stable server image errors for the page recovery state', async () => {
    uploadFile.mockResolvedValue({
      statusCode: 415,
      data: JSON.stringify({
        error: {
          code: 'IMAGE_UNSUPPORTED',
          message: '暂不支持这种图片格式，请使用 JPG、PNG 或重新拍摄。',
          retryable: false
        }
      }),
      header: {},
      errMsg: 'uploadFile:ok'
    })

    try {
      await parseImageMeal('wxfile://meal.heic')
      expect.fail('expected image error')
    } catch (error) {
      expect(error).toBeInstanceOf(MealApiError)
      expect(error).toMatchObject({
        code: 'IMAGE_UNSUPPORTED',
        retryable: false
      })
    }
  })
})
