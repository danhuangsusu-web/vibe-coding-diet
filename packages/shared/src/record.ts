import { z } from 'zod'

import { mealAssessmentSchema, unknownHandlingSchema } from './assessment'
import {
  inputTypeSchema,
  isoDateTimeSchema,
  nonEmptyTextSchema
} from './common'
import { confirmedMealItemSchema } from './meal'

export const createMealRecordRequestSchema = z
  .object({
    clientRequestId: z.string().uuid(),
    sourceType: inputTypeSchema,
    sourceText: z.string().trim().min(1).max(100).optional(),
    items: z.array(confirmedMealItemSchema).min(1),
    isDemo: z.boolean().default(false),
    unknownHandling: unknownHandlingSchema.default('PROMPT'),
    clientAssessmentSnapshot: mealAssessmentSchema.optional(),
    modelVersion: nonEmptyTextSchema.optional()
  })
  .strict()
  .superRefine(({ sourceType, sourceText }, context) => {
    if (sourceType === 'TEXT' && sourceText === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Text input requires sourceText',
        path: ['sourceText']
      })
    }

    if (sourceType === 'IMAGE' && sourceText !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Image input must not include sourceText',
        path: ['sourceText']
      })
    }
  })

export const mealRecordSchema = z
  .object({
    id: nonEmptyTextSchema,
    profileId: nonEmptyTextSchema,
    clientRequestId: z.string().uuid(),
    sourceType: inputTypeSchema,
    sourceText: z.string().trim().min(1).max(100).nullable(),
    assessment: mealAssessmentSchema,
    isDemo: z.boolean(),
    createdAt: isoDateTimeSchema
  })
  .strict()
  .superRefine(({ sourceType, sourceText }, context) => {
    if (sourceType === 'TEXT' && sourceText === null) {
      context.addIssue({
        code: 'custom',
        message: 'Text record requires sourceText',
        path: ['sourceText']
      })
    }

    if (sourceType === 'IMAGE' && sourceText !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Image record must not include sourceText',
        path: ['sourceText']
      })
    }
  })

export const dailyMealRecordsSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: z
      .object({
        calorieMin: z.number().int().nonnegative(),
        calorieMax: z.number().int().nonnegative()
      })
      .strict()
      .refine(({ calorieMin, calorieMax }) => calorieMin <= calorieMax, {
        message: 'Daily calorie minimum must not exceed maximum',
        path: ['calorieMax']
      }),
    records: z.array(mealRecordSchema)
  })
  .strict()

export const mealRecordsResponseSchema = z
  .object({
    days: z.array(dailyMealRecordsSchema).max(30)
  })
  .strict()
  .refine(
    ({ days }) =>
      days.reduce((total, day) => total + day.records.length, 0) <= 50,
    {
      message: 'Meal record response must contain at most 50 records',
      path: ['days']
    }
  )

export type CreateMealRecordRequest = z.infer<
  typeof createMealRecordRequestSchema
>
export type MealRecord = z.infer<typeof mealRecordSchema>
export type DailyMealRecords = z.infer<typeof dailyMealRecordsSchema>
export type MealRecordsResponse = z.infer<typeof mealRecordsResponseSchema>
