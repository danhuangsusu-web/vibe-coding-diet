import {
  mealAssessmentSchema,
  type AdviceId,
  type ConfirmedMealItem,
  type MealRating
} from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import {
  ADVICE_TEXT,
  assessMeal,
  selectMealAdvice
} from './index'

function item(
  overrides: Partial<ConfirmedMealItem> = {}
): ConfirmedMealItem {
  return {
    displayName: '米饭',
    ingredients: ['RICE'],
    otherIngredients: [],
    cookingMethods: ['STEAMED'],
    otherCookingMethods: [],
    portionLevel: 'regular',
    uncertainties: [],
    wasManuallyAdjusted: false,
    ...overrides
  }
}

const baseInput = {
  items: [item()],
  dailyCalorieRange: { min: 1400, max: 1600 },
  todayMealRanges: [],
  now: new Date('2026-09-15T05:00:00+08:00')
} as const

function adviceIds(
  items: readonly ConfirmedMealItem[],
  rating: MealRating
): AdviceId[] {
  return selectMealAdvice(items, rating).map(({ id }) => id)
}

describe('advice rules', () => {
  it('defines text for every approved advice identifier', () => {
    expect(Object.keys(ADVICE_TEXT).sort()).toEqual(
      [
        'REDUCE_RICE',
        'REDUCE_OILY_DISH',
        'REMOVE_SKIN',
        'SEPARATE_SAUCE',
        'DRAIN_OIL',
        'SWAP_FOR_VEGETABLE',
        'KEEP_CURRENT'
      ].sort()
    )

    for (const text of Object.values(ADVICE_TEXT)) {
      expect(text.trim().length).toBeGreaterThan(0)
    }
  })

  it('returns only KEEP_CURRENT for a suitable meal', () => {
    expect(
      selectMealAdvice(
        [
          item({
            displayName: '水煮豆腐',
            ingredients: ['TOFU'],
            cookingMethods: ['BOILED']
          })
        ],
        'GREEN'
      )
    ).toEqual([
      {
        id: 'KEEP_CURRENT',
        text: '保持当前选择即可，无需额外调整。'
      }
    ])
  })

  it('recommends reducing rice for a large serving or a non-green meal', () => {
    expect(adviceIds([item({ portionLevel: 'large' })], 'GREEN')).toContain(
      'REDUCE_RICE'
    )
    expect(adviceIds([item()], 'YELLOW')).toContain('REDUCE_RICE')
  })

  it('returns the specific skin and sauce suggestions', () => {
    expect(
      adviceIds(
        [
          item({
            displayName: '煮鸡腿',
            ingredients: ['CHICKEN_WITH_SKIN', 'SAUCE'],
            cookingMethods: ['BOILED']
          })
        ],
        'YELLOW'
      )
    ).toEqual(['REMOVE_SKIN', 'SEPARATE_SAUCE'])
  })

  it('prioritizes a vegetable swap and rice reduction for the demo meal', () => {
    const result = selectMealAdvice(
      [
        item({
          displayName: '干煸芸豆',
          ingredients: ['GREEN_BEAN'],
          cookingMethods: ['DRY_STIR_FRIED']
        }),
        item({
          displayName: '溜肉段',
          ingredients: ['PORK'],
          cookingMethods: ['DEEP_FRIED']
        }),
        item()
      ],
      'RED'
    )

    expect(result.map(({ id }) => id)).toEqual([
      'SWAP_FOR_VEGETABLE',
      'REDUCE_RICE'
    ])
  })

  it('returns oily-dish and drain-oil advice for a red oily meal with vegetables', () => {
    const result = adviceIds(
      [
        item({
          displayName: '油炸猪肉',
          ingredients: ['PORK'],
          cookingMethods: ['DEEP_FRIED']
        }),
        item({
          displayName: '白灼时蔬',
          ingredients: ['LEAFY_VEGETABLE'],
          cookingMethods: ['BLANCHED']
        })
      ],
      'RED'
    )

    expect(result).toEqual(['REDUCE_OILY_DISH', 'DRAIN_OIL'])
  })

  it('returns at most two unique suggestions when many rules match', () => {
    const result = selectMealAdvice(
      [
        item({
          displayName: '带皮炸鸡配米饭和酱汁',
          ingredients: ['CHICKEN_WITH_SKIN', 'RICE', 'SAUCE'],
          cookingMethods: ['DEEP_FRIED'],
          portionLevel: 'large'
        })
      ],
      'RED'
    )

    expect(result).toHaveLength(2)
    expect(new Set(result.map(({ id }) => id)).size).toBe(2)
  })
})

describe('assessMeal', () => {
  it('composes a complete schema-valid assessment', () => {
    const result = assessMeal({
      ...baseInput,
      modelVersion: 'offline-demo-v1'
    })

    expect(result.status).toBe('ASSESSED')

    if (result.status !== 'ASSESSED') {
      throw new Error('Expected a complete assessment')
    }

    expect(result.assessment).toMatchObject({
      calorieRange: { min: 170, max: 250 },
      mealBudget: 533,
      rating: 'GREEN',
      ratingLabel: '这餐比较合适',
      advice: [
        {
          id: 'KEEP_CURRENT',
          text: '保持当前选择即可，无需额外调整。'
        }
      ],
      uncertainties: [],
      ruleVersion: 'nutrition-assessment-v1',
      modelVersion: 'offline-demo-v1'
    })
    expect(mealAssessmentSchema.safeParse(result.assessment).success).toBe(
      true
    )
  })

  it('uses the zero-budget reason before other red reasons', () => {
    const result = assessMeal({
      ...baseInput,
      todayMealRanges: [{ min: 1600, max: 1700 }]
    })

    expect(result.status).toBe('ASSESSED')
    if (result.status !== 'ASSESSED') return

    expect(result.assessment).toMatchObject({
      mealBudget: 0,
      rating: 'RED',
      ratingLabel: '这餐建议调整',
      reason: '今天的建议热量范围已用完，本餐按保守规则标为红灯。'
    })
  })

  it('does not call a tiny remaining range exhausted when its budget floors to zero', () => {
    const result = assessMeal({
      ...baseInput,
      todayMealRanges: [{ min: 1598, max: 1599 }]
    })

    expect(result.status).toBe('ASSESSED')
    if (result.status !== 'ASSESSED') return

    expect(result.assessment).toMatchObject({
      mealBudget: 0,
      rating: 'RED',
      reason:
        '今天剩余建议范围不足以形成有效的本餐参考额度，本餐按保守规则标为红灯。'
    })
  })

  it('explains a yellow rating raised by an oily cooking method', () => {
    const result = assessMeal({
      ...baseInput,
      items: [
        item({
          displayName: '小份干煸芸豆',
          ingredients: ['GREEN_BEAN'],
          cookingMethods: ['DRY_STIR_FRIED'],
          portionLevel: 'small'
        })
      ]
    })

    expect(result.status).toBe('ASSESSED')
    if (result.status !== 'ASSESSED') return

    expect(result.assessment).toMatchObject({
      rating: 'YELLOW',
      ratingLabel: '这餐可以适量吃',
      reason: '本餐热量在当前参考范围内，但包含高油或高糖做法。'
    })
  })

  it('uses the ratio reason for ordinary yellow and red ratings', () => {
    const yellow = assessMeal({
      ...baseInput,
      items: [
        item({
          displayName: '大份鸡蛋米饭',
          ingredients: ['RICE', 'EGG'],
          portionLevel: 'large'
        })
      ]
    })
    const red = assessMeal({
      ...baseInput,
      items: [
        item({
          displayName: '大份猪肉和米饭',
          ingredients: ['PORK', 'RICE'],
          portionLevel: 'large'
        })
      ]
    })

    expect(yellow.status).toBe('ASSESSED')
    expect(red.status).toBe('ASSESSED')
    if (yellow.status !== 'ASSESSED' || red.status !== 'ASSESSED') return

    expect(yellow.assessment.reason).toBe(
      '本餐估算上限接近或略高于当前参考额度。'
    )
    expect(red.assessment.reason).toBe(
      '本餐估算上限高于当前参考额度，建议调整份量或搭配。'
    )
  })

  it('returns unknown items before assessment by default', () => {
    const result = assessMeal({
      ...baseInput,
      items: [
        item({
          displayName: '秘制菜',
          ingredients: ['OTHER'],
          otherIngredients: ['秘制主料'],
          cookingMethods: ['OTHER'],
          otherCookingMethods: ['秘制做法']
        })
      ]
    })

    expect(result).toEqual({
      status: 'NEEDS_MORE_INFO',
      unknownItems: [
        {
          displayName: '秘制菜',
          ingredients: ['秘制主料'],
          cookingMethods: ['秘制做法']
        }
      ]
    })
  })

  it('assesses with uncertainty only after conservative fallback is explicit', () => {
    const result = assessMeal({
      ...baseInput,
      items: [
        item({
          displayName: '秘制菜',
          ingredients: ['OTHER'],
          otherIngredients: ['秘制主料'],
          cookingMethods: ['OTHER'],
          otherCookingMethods: ['秘制做法']
        })
      ],
      unknownHandling: 'CONSERVATIVE_FALLBACK'
    })

    expect(result.status).toBe('ASSESSED')
    if (result.status !== 'ASSESSED') return

    expect(result.assessment.uncertainties).toEqual([
      '菜品“秘制菜”含有未覆盖食材，已使用宽范围保守估算。',
      '菜品“秘制菜”的做法未覆盖，已扩大估算区间。'
    ])
    expect(mealAssessmentSchema.safeParse(result.assessment).success).toBe(
      true
    )
  })

  it('assesses the representative demo meal with the formal rules', () => {
    const result = assessMeal({
      ...baseInput,
      items: [
        item({
          displayName: '干煸芸豆',
          ingredients: ['GREEN_BEAN'],
          cookingMethods: ['DRY_STIR_FRIED']
        }),
        item({
          displayName: '溜肉段',
          ingredients: ['PORK', 'SAUCE'],
          cookingMethods: ['DEEP_FRIED', 'SWEET_AND_SOUR'],
          uncertainties: ['实际用油量无法确认']
        }),
        item()
      ]
    })

    expect(result.status).toBe('ASSESSED')
    if (result.status !== 'ASSESSED') return

    expect(result.assessment).toMatchObject({
      calorieRange: { min: 550, max: 950 },
      mealBudget: 533,
      rating: 'RED',
      ratingLabel: '这餐建议调整',
      advice: [
        { id: 'SWAP_FOR_VEGETABLE' },
        { id: 'REDUCE_RICE' }
      ],
      uncertainties: ['实际用油量无法确认']
    })
  })

  it('is deterministic for fixed inputs', () => {
    expect(assessMeal(baseInput)).toEqual(assessMeal(baseInput))
  })

  it('keeps all generated user-facing text within the safety policy', () => {
    const scenarios = [
      baseInput,
      { ...baseInput, items: [item({ portionLevel: 'large' })] },
      {
        ...baseInput,
        items: [
          item({
            ingredients: ['PORK'],
            cookingMethods: ['DEEP_FRIED']
          })
        ]
      },
      {
        ...baseInput,
        items: [
          item({
            displayName: '大份鸡蛋米饭',
            ingredients: ['RICE', 'EGG'],
            portionLevel: 'large'
          })
        ]
      },
      {
        ...baseInput,
        items: [
          item({
            displayName: '大份猪肉和米饭',
            ingredients: ['PORK', 'RICE'],
            portionLevel: 'large'
          })
        ]
      },
      { ...baseInput, todayMealRanges: [{ min: 1600, max: 1700 }] }
    ]
    const generatedText = [
      ...Object.values(ADVICE_TEXT),
      ...scenarios
        .map((scenario) => assessMeal(scenario))
        .filter((result) => result.status === 'ASSESSED')
        .flatMap(({ assessment }) => [
          assessment.ratingLabel,
          assessment.reason,
          ...assessment.advice.map(({ text }) => text)
        ])
    ].join('\n')
    const forbiddenExpressions = [
      '绝食',
      '催吐',
      '药物',
      '跳过下一餐',
      '补偿性运动',
      '保证减重',
      '你不自律',
      '你没有意志'
    ]

    for (const expression of forbiddenExpressions) {
      expect(generatedText).not.toContain(expression)
    }
  })
})
