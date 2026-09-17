import type { ParsedMeal } from '@food-sense/shared'

import {
  MealApiError,
  startImageMealParse,
  startTextMealParse,
  type CancellableTask,
  type MealParseResult
} from './meal-api'

type OfflineDemoMealId = 'northeast-combo' | 'light-chicken-set'

export type MealParseInput =
  | {
      sourceType: 'TEXT'
      sourceText: string
    }
  | {
      sourceType: 'IMAGE'
      localPath: string
    }

export const OFFLINE_DEMO_TEXTS = {
  northeastCombo: '干煸芸豆、溜肉段和米饭',
  lightChickenSet: '白灼时蔬、水煮鸡胸和小份米饭'
} as const

export const OFFLINE_MEAL_PARSER_METADATA = {
  isDemo: true,
  modelVersion: 'offline-demo-v1'
} as const

export interface ParseMealOptions {
  parseText?: (sourceText: string) => Promise<MealParseResult>
  parseImage?: (localPath: string) => Promise<MealParseResult>
  startText?: (sourceText: string) => CancellableTask<MealParseResult>
  startImage?: (localPath: string) => CancellableTask<MealParseResult>
}

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

export async function parseMealWithMetadata(
  input: MealParseInput,
  options: ParseMealOptions = {}
): Promise<MealParseResult> {
  return startMealParseWithMetadata(input, options).promise
}

export function startMealParseWithMetadata(
  input: MealParseInput,
  options: ParseMealOptions = {}
): CancellableTask<MealParseResult> {
  if (input.sourceType === 'TEXT') {
    const sample = findTextSample(input.sourceText)

    if (sample) {
      return {
        promise: Promise.resolve({
          parsedMeal: cloneParsedMeal(sample),
          metadata: OFFLINE_MEAL_PARSER_METADATA
        }),
        cancel: () => undefined
      }
    }

    if (options.startText) return options.startText(input.sourceText)
    if (options.parseText) {
      return {
        promise: options.parseText(input.sourceText),
        cancel: () => undefined
      }
    }
    return startTextMealParse(input.sourceText)
  }

  if (options.startImage) return options.startImage(input.localPath)
  if (options.parseImage) {
    return {
      promise: options.parseImage(input.localPath),
      cancel: () => undefined
    }
  }
  return startImageMealParse(input.localPath)
}

export function startMealParseWithTimeout(
  input: MealParseInput,
  timeoutMs: number,
  options: ParseMealOptions = {}
): CancellableTask<MealParseResult> {
  const task = startMealParseWithMetadata(input, options)
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new MealApiError(
          'AI_TIMEOUT',
          '分析时间较长，已经停止等待。',
          true
        )
      )
      task.cancel()
    }, timeoutMs)
  })

  return {
    promise: Promise.race([task.promise, timeout]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId)
    }),
    cancel: () => {
      if (timeoutId) clearTimeout(timeoutId)
      task.cancel()
    }
  }
}

export async function parseMeal(
  input: MealParseInput,
  options: ParseMealOptions = {}
): Promise<ParsedMeal> {
  return (await parseMealWithMetadata(input, options)).parsedMeal
}
