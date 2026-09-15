export type MealRating = 'GREEN' | 'YELLOW' | 'RED'

export * from './calorie-estimator'
export {
  CALORIE_RANGE_RULE_VERSION,
  resolveIngredientAlias
} from './calorie-rules'

export function rateMeal(calorieMax: number, mealBudget: number): MealRating {
  const ratio = calorieMax / mealBudget

  if (ratio <= 0.8) return 'GREEN'
  if (ratio <= 1.2) return 'YELLOW'
  return 'RED'
}
