import { z } from 'zod'

export const goalDirectionSchema = z.enum([
  'FAT_LOSS',
  'MAINTAIN',
  'MUSCLE_GAIN'
])

export const mealRatingSchema = z.enum(['GREEN', 'YELLOW', 'RED'])

export const inputTypeSchema = z.enum(['IMAGE', 'TEXT'])

export const adviceIdSchema = z.enum([
  'REDUCE_RICE',
  'REDUCE_OILY_DISH',
  'REMOVE_SKIN',
  'SEPARATE_SAUCE',
  'DRAIN_OIL',
  'SWAP_FOR_VEGETABLE',
  'KEEP_CURRENT'
])

export const calorieRangeSchema = z
  .object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative()
  })
  .strict()
  .refine(({ min, max }) => min <= max, {
    message: 'Calorie range minimum must not exceed maximum',
    path: ['max']
  })

export const nonEmptyTextSchema = z.string().trim().min(1)
export const isoDateTimeSchema = z.string().datetime({ offset: true })

export type GoalDirection = z.infer<typeof goalDirectionSchema>
export type MealRating = z.infer<typeof mealRatingSchema>
export type InputType = z.infer<typeof inputTypeSchema>
export type AdviceId = z.infer<typeof adviceIdSchema>
export type CalorieRange = z.infer<typeof calorieRangeSchema>
