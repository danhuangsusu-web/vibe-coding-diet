import type { ConfirmedMealItem } from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import {
  estimateMealCalories,
  rateMeal,
  resolveIngredientAlias
} from './index'

function item(
  overrides: Partial<ConfirmedMealItem> = {}
): ConfirmedMealItem {
  return {
    displayName: '米饭',
    ingredients: ['RICE'],
    otherIngredients: [],
    cookingMethods: ['STEAMED'],
    otherCookingMethods: [],
    portionLevel: 'regular',
    uncertainties: [],
    wasManuallyAdjusted: false,
    ...overrides
  }
}

describe('rateMeal', () => {
  it('keeps the existing rating rule available', () => {
    expect(rateMeal(400, 500)).toBe('GREEN')
  })
})

describe('resolveIngredientAlias', () => {
  it.each([
    ['米饭', 'RICE'],
    [' 白米饭 ', 'RICE'],
    ['芸豆', 'GREEN_BEAN'],
    ['四季豆', 'GREEN_BEAN'],
    ['肉段', 'PORK'],
    ['猪肉', 'PORK']
  ] as const)('maps the controlled alias %s', (alias, expected) => {
    expect(resolveIngredientAlias(alias)).toBe(expected)
  })

  it('does not guess an unknown free-text ingredient', () => {
    expect(resolveIngredientAlias('祖传秘制肉')).toBeNull()
  })
})

describe('estimateMealCalories', () => {
  it('returns the same range for the same confirmed meal', () => {
    const meal = [
      item(),
      item({
        displayName: '清炒时蔬',
        ingredients: ['LEAFY_VEGETABLE'],
        cookingMethods: ['STIR_FRIED']
      })
    ]

    expect(estimateMealCalories(meal)).toEqual(estimateMealCalories(meal))
  })

  it('increases the interval from small to regular to large portions', () => {
    const small = estimateMealCalories([item({ portionLevel: 'small' })])
    const regular = estimateMealCalories([item()])
    const large = estimateMealCalories([item({ portionLevel: 'large' })])

    expect(small.status).toBe('ESTIMATED')
    expect(regular.status).toBe('ESTIMATED')
    expect(large.status).toBe('ESTIMATED')

    if (
      small.status !== 'ESTIMATED' ||
      regular.status !== 'ESTIMATED' ||
      large.status !== 'ESTIMATED'
    ) {
      throw new Error('Expected all known meals to be estimated')
    }

    expect(small.calorieRange.min).toBeLessThan(regular.calorieRange.min)
    expect(small.calorieRange.max).toBeLessThan(regular.calorieRange.max)
    expect(regular.calorieRange.min).toBeLessThan(large.calorieRange.min)
    expect(regular.calorieRange.max).toBeLessThan(large.calorieRange.max)
  })

  it.each(['DRY_STIR_FRIED', 'DEEP_FRIED', 'SWEET_AND_SOUR'] as const)(
    'raises or widens the interval for %s',
    (cookingMethod) => {
      const plain = estimateMealCalories([
        item({
          displayName: '猪肉',
          ingredients: ['PORK'],
          cookingMethods: ['BOILED']
        })
      ])
      const cooked = estimateMealCalories([
        item({
          displayName: '猪肉',
          ingredients: ['PORK'],
          cookingMethods: [cookingMethod]
        })
      ])

      expect(plain.status).toBe('ESTIMATED')
      expect(cooked.status).toBe('ESTIMATED')

      if (plain.status !== 'ESTIMATED' || cooked.status !== 'ESTIMATED') {
        throw new Error('Expected known meals to be estimated')
      }

      expect(cooked.calorieRange.min).toBeGreaterThanOrEqual(
        plain.calorieRange.min
      )
      expect(cooked.calorieRange.max).toBeGreaterThan(
        plain.calorieRange.max
      )
    }
  )

  it('estimates the representative dry-fried beans, pork and rice meal', () => {
    const result = estimateMealCalories([
      item({
        displayName: '干煸芸豆',
        ingredients: ['GREEN_BEAN'],
        cookingMethods: ['DRY_STIR_FRIED']
      }),
      item({
        displayName: '溜肉段',
        ingredients: ['PORK', 'SAUCE'],
        cookingMethods: ['DEEP_FRIED', 'SWEET_AND_SOUR'],
        uncertainties: ['实际用油量无法确认']
      }),
      item()
    ])

    expect(result).toMatchObject({
      status: 'ESTIMATED',
      ruleVersion: 'calorie-range-v1',
      usedFallback: false,
      uncertainties: ['实际用油量无法确认']
    })

    if (result.status !== 'ESTIMATED') {
      throw new Error('Expected the representative meal to be estimated')
    }

    expect(result.calorieRange).toEqual({ min: 550, max: 950 })
    expect(result.calorieRange.min % 10).toBe(0)
    expect(result.calorieRange.max % 10).toBe(0)
  })

  it('estimates a second lighter representative meal', () => {
    const result = estimateMealCalories([
      item({
        displayName: '白灼时蔬',
        ingredients: ['LEAFY_VEGETABLE'],
        cookingMethods: ['BLANCHED']
      }),
      item({
        displayName: '水煮鸡胸肉',
        ingredients: ['CHICKEN_WITHOUT_SKIN'],
        cookingMethods: ['BOILED']
      }),
      item({ portionLevel: 'small' })
    ])

    expect(result).toMatchObject({
      status: 'ESTIMATED',
      calorieRange: { min: 290, max: 500 },
      usedFallback: false
    })
  })

  it('does not count duplicate controlled tags twice', () => {
    const unique = estimateMealCalories([item()])
    const duplicated = estimateMealCalories([
      item({
        ingredients: ['RICE', 'RICE'],
        cookingMethods: ['STEAMED', 'STEAMED']
      })
    ])

    expect(duplicated).toEqual(unique)
  })

  it('asks for more information before estimating an unknown item', () => {
    const result = estimateMealCalories([
      item({
        displayName: '秘制菜',
        ingredients: ['OTHER'],
        otherIngredients: ['秘制主料'],
        cookingMethods: ['OTHER'],
        otherCookingMethods: ['秘制做法']
      })
    ])

    expect(result).toEqual({
      status: 'NEEDS_MORE_INFO',
      unknownItems: [
        {
          displayName: '秘制菜',
          ingredients: ['秘制主料'],
          cookingMethods: ['秘制做法']
        }
      ]
    })
  })

  it('uses a broad conservative interval only after the user skips', () => {
    const result = estimateMealCalories(
      [
        item({
          displayName: '秘制菜',
          ingredients: ['OTHER'],
          otherIngredients: ['秘制主料'],
          cookingMethods: ['OTHER'],
          otherCookingMethods: ['秘制做法']
        })
      ],
      { unknownHandling: 'CONSERVATIVE_FALLBACK' }
    )

    expect(result.status).toBe('ESTIMATED')

    if (result.status !== 'ESTIMATED') {
      throw new Error('Expected the skipped unknown meal to be estimated')
    }

    expect(result.usedFallback).toBe(true)
    expect(
      result.calorieRange.max - result.calorieRange.min
    ).toBeGreaterThanOrEqual(400)
    expect(result.uncertainties).toContain(
      '菜品“秘制菜”含有未覆盖食材，已使用宽范围保守估算。'
    )
    expect(result.uncertainties).toContain(
      '菜品“秘制菜”的做法未覆盖，已扩大估算区间。'
    )
  })
})
