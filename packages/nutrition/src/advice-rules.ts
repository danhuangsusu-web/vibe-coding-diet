import type {
  AdviceId,
  ConfirmedMealItem,
  MealAdvice,
  MealRating
} from '@food-sense/shared'

import { mealHasHighOil } from './dynamic-rating'

export const ADVICE_TEXT = {
  REDUCE_RICE: '米饭可以减半或留下一部分。',
  REDUCE_OILY_DISH: '高油菜可以少吃一部分。',
  REMOVE_SKIN: '带皮鸡肉可以去皮后再吃。',
  SEPARATE_SAUCE: '酱汁可以分开放，少蘸一些。',
  DRAIN_OIL: '可以沥去或过水去除明显油汁。',
  SWAP_FOR_VEGETABLE: '可以把一道高油菜换成清炒或水煮蔬菜。',
  KEEP_CURRENT: '保持当前选择即可，无需额外调整。'
} as const satisfies Record<AdviceId, string>

const LIGHT_VEGETABLE_METHODS = new Set([
  'STEAMED',
  'BOILED',
  'BLANCHED',
  'STIR_FRIED',
  'COLD_MIXED'
])

function hasIngredient(
  items: readonly ConfirmedMealItem[],
  ingredient: ConfirmedMealItem['ingredients'][number]
): boolean {
  return items.some((item) => item.ingredients.includes(ingredient))
}

function hasLightVegetable(items: readonly ConfirmedMealItem[]): boolean {
  return items.some(
    (item) =>
      item.ingredients.includes('LEAFY_VEGETABLE') &&
      item.cookingMethods.some((method) =>
        LIGHT_VEGETABLE_METHODS.has(method)
      )
  )
}

function hasRiceToReduce(
  items: readonly ConfirmedMealItem[],
  rating: MealRating
): boolean {
  return items.some(
    (item) =>
      item.ingredients.includes('RICE') &&
      (item.portionLevel === 'large' || rating !== 'GREEN')
  )
}

function advice(id: AdviceId): MealAdvice {
  return { id, text: ADVICE_TEXT[id] }
}

export function selectMealAdvice(
  items: readonly ConfirmedMealItem[],
  rating: MealRating
): MealAdvice[] {
  const candidates: AdviceId[] = []
  const highOil = mealHasHighOil(items)

  if (hasIngredient(items, 'CHICKEN_WITH_SKIN')) {
    candidates.push('REMOVE_SKIN')
  }

  if (highOil && !hasLightVegetable(items)) {
    candidates.push('SWAP_FOR_VEGETABLE')
  }

  if (hasRiceToReduce(items, rating)) {
    candidates.push('REDUCE_RICE')
  }

  if (hasIngredient(items, 'SAUCE')) {
    candidates.push('SEPARATE_SAUCE')
  }

  if (highOil && rating === 'RED') {
    candidates.push('REDUCE_OILY_DISH')
  }

  if (highOil) {
    candidates.push('DRAIN_OIL')
  }

  const selected = [...new Set(candidates)].slice(0, 2)

  return selected.length > 0
    ? selected.map(advice)
    : [advice('KEEP_CURRENT')]
}
