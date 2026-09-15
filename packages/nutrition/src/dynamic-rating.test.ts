import type { ConfirmedMealItem, CookingMethod } from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import {
  calculateDynamicMealRating,
  getRemainingMealCount,
  rateMeal
} from './index'

function item(cookingMethod: CookingMethod = 'STEAMED'): ConfirmedMealItem {
  return {
    displayName: '米饭',
    ingredients: ['RICE'],
    otherIngredients: [],
    cookingMethods: [cookingMethod],
    otherCookingMethods: [],
    portionLevel: 'regular',
    uncertainties: [],
    wasManuallyAdjusted: false
  }
}

function atShanghai(time: string): Date {
  return new Date(`2026-09-15T${time}+08:00`)
}

const baseInput = {
  dailyCalorieRange: { min: 1400, max: 1600 },
  todayMealRanges: [],
  currentMealCalorieRange: { min: 300, max: 400 },
  currentMealItems: [item()],
  now: atShanghai('05:00:00')
} as const

describe('getRemainingMealCount', () => {
  it.each([
    ['00:00:00', 1],
    ['04:59:59', 1],
    ['05:00:00', 3],
    ['10:29:59', 3],
    ['10:30:00', 2],
    ['15:59:59', 2],
    ['16:00:00', 1],
    ['23:59:59', 1]
  ] as const)('at %s returns %i remaining meals', (time, expected) => {
    expect(getRemainingMealCount(atShanghai(time))).toBe(expected)
  })

  it('converts the instant to Asia/Shanghai before choosing a slot', () => {
    expect(getRemainingMealCount(new Date('2026-09-14T21:00:00Z'))).toBe(3)
    expect(getRemainingMealCount(new Date('2026-09-14T20:59:59Z'))).toBe(1)
  })

  it('rejects an invalid explicit time', () => {
    expect(() => getRemainingMealCount(new Date('invalid'))).toThrow(
      RangeError
    )
  })
})

describe('rateMeal boundaries', () => {
  it.each([
    [400, 500, 'GREEN'],
    [401, 500, 'YELLOW'],
    [600, 500, 'YELLOW'],
    [601, 500, 'RED']
  ] as const)(
    'rates calorie maximum %i against budget %i as %s',
    (calorieMax, mealBudget, expected) => {
      expect(rateMeal(calorieMax, mealBudget)).toBe(expected)
    }
  )

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns red without dividing by an invalid budget: %s',
    (mealBudget) => {
      expect(rateMeal(400, mealBudget)).toBe('RED')
    }
  )
})

describe('calculateDynamicMealRating', () => {
  it('calculates an empty-day summary and budget', () => {
    expect(calculateDynamicMealRating(baseInput)).toEqual({
      consumedCalorieRange: { min: 0, max: 0 },
      remainingCalorieRange: { min: 1400, max: 1600 },
      remainingMealCount: 3,
      mealBudget: 533,
      budgetRatio: 400 / 533,
      rating: 'GREEN',
      hasHighOilOrSugar: false,
      ratingFloorApplied: false,
      ruleVersion: 'dynamic-rating-v1'
    })
  })

  it('uses saved ranges to calculate consumed and remaining intervals', () => {
    const result = calculateDynamicMealRating({
      ...baseInput,
      todayMealRanges: [
        { min: 380, max: 440 },
        { min: 120, max: 160 }
      ],
      now: atShanghai('10:30:00')
    })

    expect(result).toMatchObject({
      consumedCalorieRange: { min: 500, max: 600 },
      remainingCalorieRange: { min: 800, max: 1100 },
      remainingMealCount: 2,
      mealBudget: 550,
      rating: 'GREEN'
    })
  })

  it('returns red with a null ratio after the daily range is exhausted', () => {
    const result = calculateDynamicMealRating({
      ...baseInput,
      todayMealRanges: [{ min: 1600, max: 1700 }],
      now: atShanghai('16:00:00')
    })

    expect(result).toMatchObject({
      consumedCalorieRange: { min: 1600, max: 1700 },
      remainingCalorieRange: { min: 0, max: 0 },
      remainingMealCount: 1,
      mealBudget: 0,
      budgetRatio: null,
      rating: 'RED'
    })
  })

  it('returns red when flooring a small remaining upper bound to zero', () => {
    const result = calculateDynamicMealRating({
      ...baseInput,
      todayMealRanges: [{ min: 1598, max: 1599 }]
    })

    expect(result).toMatchObject({
      remainingCalorieRange: { min: 0, max: 2 },
      remainingMealCount: 3,
      mealBudget: 0,
      budgetRatio: null,
      rating: 'RED'
    })
  })

  it.each([
    'DRY_STIR_FRIED',
    'DEEP_FRIED',
    'PAN_FRIED',
    'SWEET_AND_SOUR'
  ] as const)('raises a green %s meal to yellow', (cookingMethod) => {
    const result = calculateDynamicMealRating({
      ...baseInput,
      currentMealCalorieRange: { min: 200, max: 300 },
      currentMealItems: [item(cookingMethod)]
    })

    expect(result).toMatchObject({
      rating: 'YELLOW',
      hasHighOilOrSugar: true,
      ratingFloorApplied: true
    })
  })

  it('does not treat an unflagged cooking method as high oil or sugar', () => {
    const result = calculateDynamicMealRating({
      ...baseInput,
      currentMealCalorieRange: { min: 200, max: 300 },
      currentMealItems: [item('BRAISED')]
    })

    expect(result).toMatchObject({
      rating: 'GREEN',
      hasHighOilOrSugar: false,
      ratingFloorApplied: false
    })
  })

  it('does not lower a red high-oil meal to yellow', () => {
    const result = calculateDynamicMealRating({
      ...baseInput,
      currentMealCalorieRange: { min: 600, max: 700 },
      currentMealItems: [item('DEEP_FRIED')]
    })

    expect(result).toMatchObject({
      rating: 'RED',
      hasHighOilOrSugar: true,
      ratingFloorApplied: false
    })
  })

  it('does not directly penalize the same meal at night', () => {
    const afterMidnight = calculateDynamicMealRating({
      ...baseInput,
      now: atShanghai('00:00:00')
    })
    const evening = calculateDynamicMealRating({
      ...baseInput,
      now: atShanghai('16:00:00')
    })

    expect(afterMidnight).toEqual(evening)
  })

  it('is deterministic for fixed inputs and now', () => {
    expect(calculateDynamicMealRating(baseInput)).toEqual(
      calculateDynamicMealRating(baseInput)
    )
  })

  it('rejects invalid calorie ranges before calculating', () => {
    expect(() =>
      calculateDynamicMealRating({
        ...baseInput,
        currentMealCalorieRange: { min: 500, max: 400 }
      })
    ).toThrow(RangeError)
  })
})
