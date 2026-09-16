import { describe, expect, it } from 'vitest'

import { getDemoMealSample } from '../../../server/lib/demo-meals'
import {
  OfflineMealSampleNotFoundError,
  parseMeal
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

  it('uses the selected offline sample for a local image', async () => {
    await expect(
      parseMeal({
        sourceType: 'IMAGE',
        localPath: 'wxfile://compressed-meal.jpg',
        demoSampleId: 'light-chicken-set'
      })
    ).resolves.toEqual(getDemoMealSample('light-chicken-set').parsedMeal)
  })

  it('rejects text outside the two explicit offline samples', async () => {
    await expect(
      parseMeal({ sourceType: 'TEXT', sourceText: '一份未知餐食' })
    ).rejects.toBeInstanceOf(OfflineMealSampleNotFoundError)
  })
})
