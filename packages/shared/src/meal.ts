import { z } from 'zod'

import { nonEmptyTextSchema } from './common'

export const ingredientTagSchema = z.enum([
  'RICE',
  'LEAFY_VEGETABLE',
  'GREEN_BEAN',
  'PORK',
  'CHICKEN_WITH_SKIN',
  'CHICKEN_WITHOUT_SKIN',
  'TOFU',
  'EGG',
  'SAUCE',
  'OTHER'
])

export const cookingMethodSchema = z.enum([
  'STEAMED',
  'BOILED',
  'BLANCHED',
  'STIR_FRIED',
  'DRY_STIR_FRIED',
  'DEEP_FRIED',
  'PAN_FRIED',
  'BRAISED',
  'SWEET_AND_SOUR',
  'COLD_MIXED',
  'OTHER'
])

export const portionLevelSchema = z.enum(['small', 'regular', 'large'])

export const textMealParseRequestSchema = z
  .object({
    sourceType: z.literal('TEXT'),
    sourceText: z.string().trim().min(1).max(100)
  })
  .strict()

const mealItemFields = {
  displayName: z.string().trim().min(1).max(30),
  ingredients: z.array(ingredientTagSchema).min(1),
  otherIngredients: z.array(nonEmptyTextSchema).default([]),
  cookingMethods: z.array(cookingMethodSchema).min(1),
  otherCookingMethods: z.array(nonEmptyTextSchema).default([]),
  portionLevel: portionLevelSchema,
  uncertainties: z.array(nonEmptyTextSchema).default([])
}

function validateOtherValues(
  item: {
    ingredients: string[]
    otherIngredients: string[]
    cookingMethods: string[]
    otherCookingMethods: string[]
  },
  context: z.RefinementCtx
) {
  if (item.ingredients.includes('OTHER') && item.otherIngredients.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'OTHER ingredient requires a text description',
      path: ['otherIngredients']
    })
  }

  if (!item.ingredients.includes('OTHER') && item.otherIngredients.length > 0) {
    context.addIssue({
      code: 'custom',
      message: 'Other ingredient descriptions require the OTHER tag',
      path: ['otherIngredients']
    })
  }

  if (
    item.cookingMethods.includes('OTHER') &&
    item.otherCookingMethods.length === 0
  ) {
    context.addIssue({
      code: 'custom',
      message: 'OTHER cooking method requires a text description',
      path: ['otherCookingMethods']
    })
  }

  if (
    !item.cookingMethods.includes('OTHER') &&
    item.otherCookingMethods.length > 0
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Other cooking descriptions require the OTHER method',
      path: ['otherCookingMethods']
    })
  }
}

export const mealItemSchema = z
  .object({
    ...mealItemFields,
    confidence: z.number().min(0).max(1)
  })
  .strict()
  .superRefine(validateOtherValues)

export const parsedMealSchema = z
  .object({
    items: z.array(mealItemSchema).min(1)
  })
  .strict()

export const confirmedMealItemSchema = z
  .object({
    ...mealItemFields,
    wasManuallyAdjusted: z.boolean().default(false)
  })
  .strict()
  .superRefine(validateOtherValues)

export const confirmedMealSchema = z
  .object({
    items: z.array(confirmedMealItemSchema).min(1)
  })
  .strict()

export type IngredientTag = z.infer<typeof ingredientTagSchema>
export type CookingMethod = z.infer<typeof cookingMethodSchema>
export type PortionLevel = z.infer<typeof portionLevelSchema>
export type TextMealParseRequest = z.infer<typeof textMealParseRequestSchema>
export type MealItem = z.infer<typeof mealItemSchema>
export type ParsedMeal = z.infer<typeof parsedMealSchema>
export type ConfirmedMealItem = z.infer<typeof confirmedMealItemSchema>
export type ConfirmedMeal = z.infer<typeof confirmedMealSchema>
