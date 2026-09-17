import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())
const uploadFile = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    request,
    uploadFile
  }
}))

import {
  MealApiError,
  parseImageMeal,
  startImageMealParse,
  startTextMealParse
} from './meal-api'

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
    request.mockReset()
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

  it('aborts the underlying upload when an image parse is cancelled', async () => {
    const abort = vi.fn()
    const uploadTask = new Promise(() => undefined) as Promise<never> & {
      abort: () => void
    }
    uploadTask.abort = abort
    uploadFile.mockReturnValue(uploadTask)

    const task = startImageMealParse('wxfile://compressed-meal.jpg')
    task.cancel()

    expect(abort).toHaveBeenCalledOnce()
  })

  it('aborts the underlying request when a text parse is cancelled', async () => {
    const abort = vi.fn()
    const requestTask = new Promise(() => undefined) as Promise<never> & {
      abort: () => void
    }
    requestTask.abort = abort
    request.mockReturnValue(requestTask)

    const task = startTextMealParse('番茄炒蛋')
    task.cancel()

    expect(abort).toHaveBeenCalledOnce()
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

  it('rejects unrecognized or inconsistent server errors as a safe network failure', async () => {
    for (const error of [
      { code: 'PRIVATE_PROVIDER_ERROR', message: 'secret body', retryable: true },
      { code: 'AI_TIMEOUT', message: 'secret body', retryable: false },
      {
        code: 'AI_TIMEOUT',
        message: 'secret body',
        retryable: true,
        providerResponse: 'private'
      }
    ]) {
      uploadFile.mockResolvedValueOnce({
        statusCode: 502,
        data: JSON.stringify({ error }),
        header: {},
        errMsg: 'uploadFile:ok'
      })

      await expect(parseImageMeal('wxfile://meal.jpg')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        retryable: true
      })
    }
  })
})
