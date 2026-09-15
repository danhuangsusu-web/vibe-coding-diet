import type {
  CalorieRange,
  ConfirmedMealItem,
  CookingMethod,
  MealRating
} from '@food-sense/shared'

export type { MealRating } from '@food-sense/shared'

export const DYNAMIC_RATING_RULE_VERSION = 'dynamic-rating-v1'

export type RemainingMealCount = 1 | 2 | 3

export interface DynamicMealRatingInput {
  dailyCalorieRange: CalorieRange
  todayMealRanges: readonly CalorieRange[]
  currentMealCalorieRange: CalorieRange
  currentMealItems: readonly ConfirmedMealItem[]
  now: Date
}

export interface DynamicMealRatingResult {
  consumedCalorieRange: CalorieRange
  remainingCalorieRange: CalorieRange
  remainingMealCount: RemainingMealCount
  mealBudget: number
  budgetRatio: number | null
  rating: MealRating
  hasHighOilOrSugar: boolean
  ratingFloorApplied: boolean
  ruleVersion: typeof DYNAMIC_RATING_RULE_VERSION
}

const HIGH_OIL_METHODS = new Set<CookingMethod>([
  'DRY_STIR_FRIED',
  'DEEP_FRIED',
  'PAN_FRIED'
])
const HIGH_SUGAR_METHODS = new Set<CookingMethod>(['SWEET_AND_SOUR'])

const shanghaiTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

function assertCalorieRange(range: CalorieRange, label: string): void {
  if (
    !Number.isInteger(range.min) ||
    !Number.isInteger(range.max) ||
    range.min < 0 ||
    range.max < 0 ||
    range.min > range.max
  ) {
    throw new RangeError(`${label} must be a valid calorie range`)
  }
}

function getShanghaiMinuteOfDay(now: Date): number {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('now must be a valid Date')
  }

  const parts = shanghaiTimeFormatter.formatToParts(now)
  const hour = Number(parts.find(({ type }) => type === 'hour')?.value)
  const minute = Number(parts.find(({ type }) => type === 'minute')?.value)

  return hour * 60 + minute
}

export function getRemainingMealCount(now: Date): RemainingMealCount {
  const minuteOfDay = getShanghaiMinuteOfDay(now)

  if (minuteOfDay < 5 * 60) return 1
  if (minuteOfDay < 10 * 60 + 30) return 3
  if (minuteOfDay < 16 * 60) return 2
  return 1
}

export function rateMeal(
  calorieMax: number,
  mealBudget: number
): MealRating {
  if (
    !Number.isFinite(calorieMax) ||
    calorieMax < 0 ||
    !Number.isFinite(mealBudget) ||
    mealBudget <= 0
  ) {
    return 'RED'
  }

  const ratio = calorieMax / mealBudget

  if (ratio <= 0.8) return 'GREEN'
  if (ratio <= 1.2) return 'YELLOW'
  return 'RED'
}

function hasHighOilOrSugar(items: readonly ConfirmedMealItem[]): boolean {
  return items.some((item) =>
    item.cookingMethods.some(
      (method) =>
        HIGH_OIL_METHODS.has(method) || HIGH_SUGAR_METHODS.has(method)
    )
  )
}

export function calculateDynamicMealRating(
  input: DynamicMealRatingInput
): DynamicMealRatingResult {
  assertCalorieRange(input.dailyCalorieRange, 'dailyCalorieRange')
  assertCalorieRange(
    input.currentMealCalorieRange,
    'currentMealCalorieRange'
  )
  input.todayMealRanges.forEach((range, index) => {
    assertCalorieRange(range, `todayMealRanges[${index}]`)
  })

  const consumedCalorieRange = input.todayMealRanges.reduce<CalorieRange>(
    (total, range) => ({
      min: total.min + range.min,
      max: total.max + range.max
    }),
    { min: 0, max: 0 }
  )
  const remainingCalorieRange: CalorieRange = {
    min: Math.max(
      0,
      input.dailyCalorieRange.min - consumedCalorieRange.max
    ),
    max: Math.max(
      0,
      input.dailyCalorieRange.max - consumedCalorieRange.min
    )
  }
  const remainingMealCount = getRemainingMealCount(input.now)
  const mealBudget = Math.floor(
    remainingCalorieRange.max / remainingMealCount
  )
  const budgetRatio =
    mealBudget > 0 ? input.currentMealCalorieRange.max / mealBudget : null
  const initialRating = rateMeal(
    input.currentMealCalorieRange.max,
    mealBudget
  )
  const highOilOrSugar = hasHighOilOrSugar(input.currentMealItems)
  const ratingFloorApplied = highOilOrSugar && initialRating === 'GREEN'

  return {
    consumedCalorieRange,
    remainingCalorieRange,
    remainingMealCount,
    mealBudget,
    budgetRatio,
    rating: ratingFloorApplied ? 'YELLOW' : initialRating,
    hasHighOilOrSugar: highOilOrSugar,
    ratingFloorApplied,
    ruleVersion: DYNAMIC_RATING_RULE_VERSION
  }
}
