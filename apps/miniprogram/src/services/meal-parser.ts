import type { ParsedMeal } from '@food-sense/shared'

export type OfflineDemoMealId = 'northeast-combo' | 'light-chicken-set'

export type MealParseInput =
  | {
      sourceType: 'TEXT'
      sourceText: string
    }
  | {
      sourceType: 'IMAGE'
      localPath: string
      demoSampleId?: OfflineDemoMealId
    }

export class OfflineMealSampleNotFoundError extends Error {
  constructor() {
    super('No offline meal sample matches the provided input')
    this.name = 'OfflineMealSampleNotFoundError'
  }
}

export const OFFLINE_DEMO_TEXTS = {
  northeastCombo: '干煸芸豆、溜肉段和米饭',
  lightChickenSet: '白灼时蔬、水煮鸡胸和小份米饭'
} as const

const OFFLINE_PARSED_MEALS: Record<OfflineDemoMealId, ParsedMeal> = {
  'northeast-combo': {
    items: [
      {
        displayName: '干煸芸豆',
        ingredients: ['GREEN_BEAN'],
        otherIngredients: [],
        cookingMethods: ['DRY_STIR_FRIED'],
        otherCookingMethods: [],
        portionLevel: 'regular',
        confidence: 0.93,
        uncertainties: []
      },
      {
        displayName: '溜肉段',
        ingredients: ['PORK', 'SAUCE'],
        otherIngredients: [],
        cookingMethods: ['DEEP_FRIED', 'SWEET_AND_SOUR'],
        otherCookingMethods: [],
        portionLevel: 'regular',
        confidence: 0.68,
        uncertainties: ['实际用油量无法确认']
      },
      {
        displayName: '米饭',
        ingredients: ['RICE'],
        otherIngredients: [],
        cookingMethods: ['STEAMED'],
        otherCookingMethods: [],
        portionLevel: 'regular',
        confidence: 0.97,
        uncertainties: []
      }
    ]
  },
  'light-chicken-set': {
    items: [
      {
        displayName: '白灼时蔬',
        ingredients: ['LEAFY_VEGETABLE'],
        otherIngredients: [],
        cookingMethods: ['BLANCHED'],
        otherCookingMethods: [],
        portionLevel: 'regular',
        confidence: 0.91,
        uncertainties: []
      },
      {
        displayName: '水煮鸡胸',
        ingredients: ['CHICKEN_WITHOUT_SKIN'],
        otherIngredients: [],
        cookingMethods: ['BOILED'],
        otherCookingMethods: [],
        portionLevel: 'regular',
        confidence: 0.82,
        uncertainties: ['鸡胸肉实际份量无法从描述中确认']
      },
      {
        displayName: '小份米饭',
        ingredients: ['RICE'],
        otherIngredients: [],
        cookingMethods: ['STEAMED'],
        otherCookingMethods: [],
        portionLevel: 'small',
        confidence: 0.96,
        uncertainties: []
      }
    ]
  }
}

function normalizeSampleText(value: string): string {
  return value.trim().replace(/[\s，,、+和]/g, '')
}

function cloneParsedMeal(meal: ParsedMeal): ParsedMeal {
  return {
    items: meal.items.map((item) => ({
      ...item,
      ingredients: [...item.ingredients],
      otherIngredients: [...item.otherIngredients],
      cookingMethods: [...item.cookingMethods],
      otherCookingMethods: [...item.otherCookingMethods],
      uncertainties: [...item.uncertainties]
    }))
  }
}

function findTextSample(sourceText: string): ParsedMeal | undefined {
  const normalizedInput = normalizeSampleText(sourceText)

  if (normalizedInput === normalizeSampleText(OFFLINE_DEMO_TEXTS.northeastCombo)) {
    return OFFLINE_PARSED_MEALS['northeast-combo']
  }

  if (normalizedInput === normalizeSampleText(OFFLINE_DEMO_TEXTS.lightChickenSet)) {
    return OFFLINE_PARSED_MEALS['light-chicken-set']
  }

  return undefined
}

export async function parseMeal(input: MealParseInput): Promise<ParsedMeal> {
  const sample =
    input.sourceType === 'TEXT'
      ? findTextSample(input.sourceText)
      : OFFLINE_PARSED_MEALS[input.demoSampleId ?? 'northeast-combo']

  if (!sample) {
    throw new OfflineMealSampleNotFoundError()
  }

  return cloneParsedMeal(sample)
}
