import {
  confirmedMealSchema,
  createMealRecordRequestSchema,
  mealAssessmentSchema,
  parsedMealSchema,
  type CalorieRange,
  type ConfirmedMeal,
  type CreateMealRecordRequest,
  type MealAssessment,
  type ParsedMeal
} from '@food-sense/shared'

export const OFFLINE_DEMO_MODEL_VERSION = 'offline-demo-v1'

export type DemoMealSampleId = 'northeast-combo' | 'light-chicken-set'

export interface DemoMealSample {
  id: DemoMealSampleId
  title: string
  input: {
    sourceType: 'TEXT'
    sourceText: string
  }
  parsedMeal: ParsedMeal
  confirmedMeal: ConfirmedMeal
  assessmentContext: {
    dailyCalorieRange: CalorieRange
    todayMealRanges: CalorieRange[]
    now: Date
  }
  expectedAssessment: MealAssessment
}

const dailyCalorieRange = { min: 1400, max: 1600 } as const
const lunchTime = new Date('2026-09-15T12:00:00+08:00')

function defineSample(sample: DemoMealSample): DemoMealSample {
  return {
    ...sample,
    parsedMeal: parsedMealSchema.parse(sample.parsedMeal),
    confirmedMeal: confirmedMealSchema.parse(sample.confirmedMeal),
    expectedAssessment: mealAssessmentSchema.parse(sample.expectedAssessment)
  }
}

export const DEMO_MEAL_SAMPLES: readonly DemoMealSample[] = [
  defineSample({
    id: 'northeast-combo',
    title: '干煸芸豆、溜肉段和米饭',
    input: {
      sourceType: 'TEXT',
      sourceText: '干煸芸豆、溜肉段和米饭'
    },
    parsedMeal: {
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
    confirmedMeal: {
      items: [
        {
          displayName: '干煸芸豆',
          ingredients: ['GREEN_BEAN'],
          otherIngredients: [],
          cookingMethods: ['DRY_STIR_FRIED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: [],
          wasManuallyAdjusted: false
        },
        {
          displayName: '溜肉段',
          ingredients: ['PORK', 'SAUCE'],
          otherIngredients: [],
          cookingMethods: ['DEEP_FRIED', 'SWEET_AND_SOUR'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: ['实际用油量无法确认'],
          wasManuallyAdjusted: false
        },
        {
          displayName: '米饭',
          ingredients: ['RICE'],
          otherIngredients: [],
          cookingMethods: ['STEAMED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: [],
          wasManuallyAdjusted: false
        }
      ]
    },
    assessmentContext: {
      dailyCalorieRange,
      todayMealRanges: [],
      now: lunchTime
    },
    expectedAssessment: {
      items: [
        {
          displayName: '干煸芸豆',
          ingredients: ['GREEN_BEAN'],
          otherIngredients: [],
          cookingMethods: ['DRY_STIR_FRIED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: [],
          wasManuallyAdjusted: false
        },
        {
          displayName: '溜肉段',
          ingredients: ['PORK', 'SAUCE'],
          otherIngredients: [],
          cookingMethods: ['DEEP_FRIED', 'SWEET_AND_SOUR'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: ['实际用油量无法确认'],
          wasManuallyAdjusted: false
        },
        {
          displayName: '米饭',
          ingredients: ['RICE'],
          otherIngredients: [],
          cookingMethods: ['STEAMED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: [],
          wasManuallyAdjusted: false
        }
      ],
      calorieRange: { min: 550, max: 950 },
      mealBudget: 800,
      rating: 'YELLOW',
      ratingLabel: '这餐可以适量吃',
      reason: '本餐估算上限接近或略高于当前参考额度。',
      advice: [
        {
          id: 'SWAP_FOR_VEGETABLE',
          text: '可以把一道高油菜换成清炒或水煮蔬菜。'
        },
        {
          id: 'REDUCE_RICE',
          text: '米饭可以减半或留下一部分。'
        }
      ],
      uncertainties: ['实际用油量无法确认'],
      ruleVersion: 'nutrition-assessment-v1',
      modelVersion: OFFLINE_DEMO_MODEL_VERSION
    }
  }),
  defineSample({
    id: 'light-chicken-set',
    title: '白灼时蔬、水煮鸡胸和小份米饭',
    input: {
      sourceType: 'TEXT',
      sourceText: '白灼时蔬、水煮鸡胸和小份米饭'
    },
    parsedMeal: {
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
    },
    confirmedMeal: {
      items: [
        {
          displayName: '白灼时蔬',
          ingredients: ['LEAFY_VEGETABLE'],
          otherIngredients: [],
          cookingMethods: ['BLANCHED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: [],
          wasManuallyAdjusted: false
        },
        {
          displayName: '水煮鸡胸',
          ingredients: ['CHICKEN_WITHOUT_SKIN'],
          otherIngredients: [],
          cookingMethods: ['BOILED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: ['鸡胸肉实际份量无法从描述中确认'],
          wasManuallyAdjusted: false
        },
        {
          displayName: '小份米饭',
          ingredients: ['RICE'],
          otherIngredients: [],
          cookingMethods: ['STEAMED'],
          otherCookingMethods: [],
          portionLevel: 'small',
          uncertainties: [],
          wasManuallyAdjusted: false
        }
      ]
    },
    assessmentContext: {
      dailyCalorieRange,
      todayMealRanges: [],
      now: lunchTime
    },
    expectedAssessment: {
      items: [
        {
          displayName: '白灼时蔬',
          ingredients: ['LEAFY_VEGETABLE'],
          otherIngredients: [],
          cookingMethods: ['BLANCHED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: [],
          wasManuallyAdjusted: false
        },
        {
          displayName: '水煮鸡胸',
          ingredients: ['CHICKEN_WITHOUT_SKIN'],
          otherIngredients: [],
          cookingMethods: ['BOILED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: ['鸡胸肉实际份量无法从描述中确认'],
          wasManuallyAdjusted: false
        },
        {
          displayName: '小份米饭',
          ingredients: ['RICE'],
          otherIngredients: [],
          cookingMethods: ['STEAMED'],
          otherCookingMethods: [],
          portionLevel: 'small',
          uncertainties: [],
          wasManuallyAdjusted: false
        }
      ],
      calorieRange: { min: 290, max: 500 },
      mealBudget: 800,
      rating: 'GREEN',
      ratingLabel: '这餐比较合适',
      reason: '本餐估算上限在当前参考额度的合理范围内。',
      advice: [
        {
          id: 'KEEP_CURRENT',
          text: '保持当前选择即可，无需额外调整。'
        }
      ],
      uncertainties: ['鸡胸肉实际份量无法从描述中确认'],
      ruleVersion: 'nutrition-assessment-v1',
      modelVersion: OFFLINE_DEMO_MODEL_VERSION
    }
  })
]

export function getDemoMealSample(
  id: DemoMealSampleId
): DemoMealSample {
  const sample = DEMO_MEAL_SAMPLES.find((candidate) => candidate.id === id)

  if (!sample) {
    throw new RangeError(`Unknown demo meal sample: ${id}`)
  }

  return sample
}

export function buildDemoMealRecordRequest(
  sample: DemoMealSample,
  clientRequestId: string
): CreateMealRecordRequest {
  return createMealRecordRequestSchema.parse({
    clientRequestId,
    sourceType: sample.input.sourceType,
    sourceText: sample.input.sourceText,
    items: sample.confirmedMeal.items,
    isDemo: true,
    clientAssessmentSnapshot: sample.expectedAssessment,
    modelVersion: OFFLINE_DEMO_MODEL_VERSION
  })
}
