import { z } from 'zod'

import {
  goalDirectionSchema,
  isoDateTimeSchema,
  nonEmptyTextSchema
} from './common'

const dailyCalorieFields = {
  dailyCalorieMin: z.number().int().positive(),
  dailyCalorieMax: z.number().int().positive()
}

function validateDailyCalorieRange(
  profile: { dailyCalorieMin: number; dailyCalorieMax: number },
  context: z.RefinementCtx
) {
  if (profile.dailyCalorieMin >= profile.dailyCalorieMax) {
    context.addIssue({
      code: 'custom',
      message: 'Daily calorie minimum must be lower than maximum',
      path: ['dailyCalorieMax']
    })
  }
}

export const demoProfileSchema = z
  .object({
    id: nonEmptyTextSchema,
    name: nonEmptyTextSchema,
    goalDirection: goalDirectionSchema,
    ...dailyCalorieFields,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
  })
  .strict()
  .superRefine(validateDailyCalorieRange)

export const updateDemoProfileRequestSchema = z
  .object({
    goalDirection: goalDirectionSchema,
    ...dailyCalorieFields
  })
  .strict()
  .superRefine(validateDailyCalorieRange)

export type DemoProfile = z.infer<typeof demoProfileSchema>
export type UpdateDemoProfileRequest = z.infer<
  typeof updateDemoProfileRequestSchema
>
