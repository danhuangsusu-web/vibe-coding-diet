import { z } from 'zod'

import {
  adviceIdSchema,
  calorieRangeSchema,
  mealRatingSchema,
  nonEmptyTextSchema
} from './common'
import { confirmedMealItemSchema } from './meal'

export const mealAdviceSchema = z
  .object({
    id: adviceIdSchema,
    text: nonEmptyTextSchema
  })
  .strict()

export const mealAssessmentSchema = z
  .object({
    items: z.array(confirmedMealItemSchema).min(1),
    calorieRange: calorieRangeSchema,
    mealBudget: z.number().int().nonnegative(),
    rating: mealRatingSchema,
    ratingLabel: nonEmptyTextSchema,
    reason: nonEmptyTextSchema,
    advice: z.array(mealAdviceSchema).min(1).max(2),
    uncertainties: z.array(nonEmptyTextSchema).default([]),
    ruleVersion: nonEmptyTextSchema,
    modelVersion: nonEmptyTextSchema.optional()
  })
  .strict()
  .superRefine(({ advice }, context) => {
    if (new Set(advice.map(({ id }) => id)).size !== advice.length) {
      context.addIssue({
        code: 'custom',
        message: 'Advice identifiers must be unique',
        path: ['advice']
      })
    }
  })

export type MealAdvice = z.infer<typeof mealAdviceSchema>
export type MealAssessment = z.infer<typeof mealAssessmentSchema>
