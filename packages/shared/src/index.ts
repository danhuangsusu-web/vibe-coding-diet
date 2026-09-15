import { z } from 'zod'

export const mealItemSchema = z.object({
  displayName: z.string().min(1),
  ingredients: z.array(z.string().min(1)),
  cookingMethods: z.array(z.string().min(1)),
  portionLevel: z.enum(['small', 'regular', 'large']),
  confidence: z.number().min(0).max(1),
  uncertainties: z.array(z.string())
})

export const parsedMealSchema = z.object({
  items: z.array(mealItemSchema).min(1)
})

export type MealItem = z.infer<typeof mealItemSchema>
export type ParsedMeal = z.infer<typeof parsedMealSchema>
