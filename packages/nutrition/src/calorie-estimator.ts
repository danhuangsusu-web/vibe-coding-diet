import type { CalorieRange, ConfirmedMealItem } from '@food-sense/shared'

import {
  CALORIE_RANGE_RULE_VERSION,
  COOKING_METHOD_ADDITIONS,
  INGREDIENT_BASE_RANGES,
  PORTION_MULTIPLIERS,
  UNKNOWN_COOKING_METHOD_FALLBACK,
  UNKNOWN_INGREDIENT_FALLBACK
} from './calorie-rules'

export type UnknownHandling = 'PROMPT' | 'CONSERVATIVE_FALLBACK'

export interface UnknownMealItem {
  displayName: string
  ingredients: string[]
  cookingMethods: string[]
}

export interface NeedsMoreInfoResult {
  status: 'NEEDS_MORE_INFO'
  unknownItems: UnknownMealItem[]
}

export interface EstimatedMealCalories {
  status: 'ESTIMATED'
  calorieRange: CalorieRange
  uncertainties: string[]
  usedFallback: boolean
  ruleVersion: typeof CALORIE_RANGE_RULE_VERSION
}

export type MealCalorieEstimate =
  | NeedsMoreInfoResult
  | EstimatedMealCalories

export interface EstimateMealCaloriesOptions {
  unknownHandling?: UnknownHandling
}

function collectUnknownItems(
  items: readonly ConfirmedMealItem[]
): UnknownMealItem[] {
  return items.flatMap((item) => {
    const hasUnknownIngredient = item.ingredients.includes('OTHER')
    const hasUnknownCookingMethod = item.cookingMethods.includes('OTHER')

    if (!hasUnknownIngredient && !hasUnknownCookingMethod) return []

    return [
      {
        displayName: item.displayName,
        ingredients: hasUnknownIngredient ? item.otherIngredients : [],
        cookingMethods: hasUnknownCookingMethod
          ? item.otherCookingMethods
          : []
      }
    ]
  })
}

function addRange(target: CalorieRange, addition: CalorieRange): void {
  target.min += addition.min
  target.max += addition.max
}

function estimateItem(item: ConfirmedMealItem): CalorieRange {
  const range: CalorieRange = { min: 0, max: 0 }

  for (const ingredient of new Set(item.ingredients)) {
    addRange(
      range,
      ingredient === 'OTHER'
        ? UNKNOWN_INGREDIENT_FALLBACK
        : INGREDIENT_BASE_RANGES[ingredient]
    )
  }

  for (const cookingMethod of new Set(item.cookingMethods)) {
    addRange(
      range,
      cookingMethod === 'OTHER'
        ? UNKNOWN_COOKING_METHOD_FALLBACK
        : COOKING_METHOD_ADDITIONS[cookingMethod]
    )
  }

  const multiplier = PORTION_MULTIPLIERS[item.portionLevel]

  return {
    min: range.min * multiplier,
    max: range.max * multiplier
  }
}

function fallbackUncertainties(
  unknownItems: readonly UnknownMealItem[]
): string[] {
  return unknownItems.flatMap((item) => {
    const messages: string[] = []

    if (item.ingredients.length > 0) {
      messages.push(
        `菜品“${item.displayName}”含有未覆盖食材，已使用宽范围保守估算。`
      )
    }

    if (item.cookingMethods.length > 0) {
      messages.push(
        `菜品“${item.displayName}”的做法未覆盖，已扩大估算区间。`
      )
    }

    return messages
  })
}

export function estimateMealCalories(
  items: readonly ConfirmedMealItem[],
  options: EstimateMealCaloriesOptions = {}
): MealCalorieEstimate {
  if (items.length === 0) {
    throw new RangeError('Meal must contain at least one item')
  }

  const unknownItems = collectUnknownItems(items)
  const unknownHandling = options.unknownHandling ?? 'PROMPT'

  if (unknownItems.length > 0 && unknownHandling === 'PROMPT') {
    return {
      status: 'NEEDS_MORE_INFO',
      unknownItems
    }
  }

  const rawRange = items.reduce<CalorieRange>(
    (mealRange, item) => {
      addRange(mealRange, estimateItem(item))
      return mealRange
    },
    { min: 0, max: 0 }
  )
  const uncertainties = new Set(items.flatMap((item) => item.uncertainties))

  if (unknownItems.length > 0) {
    for (const uncertainty of fallbackUncertainties(unknownItems)) {
      uncertainties.add(uncertainty)
    }
  }

  return {
    status: 'ESTIMATED',
    calorieRange: {
      min: Math.floor(rawRange.min / 10) * 10,
      max: Math.ceil(rawRange.max / 10) * 10
    },
    uncertainties: [...uncertainties],
    usedFallback: unknownItems.length > 0,
    ruleVersion: CALORIE_RANGE_RULE_VERSION
  }
}
