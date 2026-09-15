import type {
  CalorieRange,
  ConfirmedMealItem,
  MealAssessment,
  MealRating
} from '@food-sense/shared'

import {
  estimateMealCalories,
  type NeedsMoreInfoResult,
  type UnknownHandling
} from './calorie-estimator'
import {
  calculateDynamicMealRating,
  type DynamicMealRatingResult
} from './dynamic-rating'
import { selectMealAdvice } from './advice-rules'

export const NUTRITION_ASSESSMENT_RULE_VERSION = 'nutrition-assessment-v1'

export interface AssessMealInput {
  items: readonly ConfirmedMealItem[]
  dailyCalorieRange: CalorieRange
  todayMealRanges: readonly CalorieRange[]
  now: Date
  unknownHandling?: UnknownHandling
  modelVersion?: string
}

export interface AssessedMealResult {
  status: 'ASSESSED'
  assessment: MealAssessment
}

export type AssessMealResult = NeedsMoreInfoResult | AssessedMealResult

const RATING_LABELS = {
  GREEN: '这餐比较合适',
  YELLOW: '这餐可以适量吃',
  RED: '这餐建议调整'
} as const satisfies Record<MealRating, string>

function ratingReason(result: DynamicMealRatingResult): string {
  if (result.remainingCalorieRange.max === 0) {
    return '今天的建议热量范围已用完，本餐按保守规则标为红灯。'
  }

  if (result.mealBudget <= 0) {
    return '今天剩余建议范围不足以形成有效的本餐参考额度，本餐按保守规则标为红灯。'
  }

  if (result.rating === 'RED') {
    return '本餐估算上限高于当前参考额度，建议调整份量或搭配。'
  }

  if (result.ratingFloorApplied) {
    return '本餐热量在当前参考范围内，但包含高油或高糖做法。'
  }

  if (result.rating === 'YELLOW') {
    return '本餐估算上限接近或略高于当前参考额度。'
  }

  return '本餐估算上限在当前参考额度的合理范围内。'
}

export function assessMeal(input: AssessMealInput): AssessMealResult {
  const calorieEstimate = estimateMealCalories(input.items, {
    unknownHandling: input.unknownHandling
  })

  if (calorieEstimate.status === 'NEEDS_MORE_INFO') {
    return calorieEstimate
  }

  const dynamicRating = calculateDynamicMealRating({
    dailyCalorieRange: input.dailyCalorieRange,
    todayMealRanges: input.todayMealRanges,
    currentMealCalorieRange: calorieEstimate.calorieRange,
    currentMealItems: input.items,
    now: input.now
  })
  const assessment: MealAssessment = {
    items: [...input.items],
    calorieRange: calorieEstimate.calorieRange,
    mealBudget: dynamicRating.mealBudget,
    rating: dynamicRating.rating,
    ratingLabel: RATING_LABELS[dynamicRating.rating],
    reason: ratingReason(dynamicRating),
    advice: selectMealAdvice(input.items, dynamicRating.rating),
    uncertainties: calorieEstimate.uncertainties,
    ruleVersion: NUTRITION_ASSESSMENT_RULE_VERSION,
    ...(input.modelVersion === undefined
      ? {}
      : { modelVersion: input.modelVersion })
  }

  return {
    status: 'ASSESSED',
    assessment
  }
}
