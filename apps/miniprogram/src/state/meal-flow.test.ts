import type { MealAssessment, ParsedMeal } from '@food-sense/shared'
import { createStore } from 'jotai/vanilla'
import { describe, expect, it } from 'vitest'

import {
  createEmptyMealFlowDraft,
  mealFlowDraftAtom,
  resetMealFlowDraftAtom
} from './meal-flow'

const parsedMeal: ParsedMeal = {
  items: [
    {
      displayName: '水煮鸡胸',
      ingredients: ['CHICKEN_WITHOUT_SKIN'],
      otherIngredients: [],
      cookingMethods: ['BOILED'],
      otherCookingMethods: [],
      portionLevel: 'regular',
      confidence: 0.92,
      uncertainties: []
    }
  ]
}

const assessment: MealAssessment = {
  items: [
    {
      displayName: '水煮鸡胸',
      ingredients: ['CHICKEN_WITHOUT_SKIN'],
      otherIngredients: [],
      cookingMethods: ['BOILED'],
      otherCookingMethods: [],
      portionLevel: 'regular',
      uncertainties: [],
      wasManuallyAdjusted: false
    }
  ],
  calorieRange: { min: 140, max: 230 },
  mealBudget: 800,
  rating: 'GREEN',
  ratingLabel: '这餐比较合适',
  reason: '本餐处于当前参考范围内',
  advice: [{ id: 'KEEP_CURRENT', text: '保持当前选择，无需额外调整' }],
  uncertainties: [],
  ruleVersion: 'nutrition-assessment-v1'
}

describe('meal flow draft', () => {
  it('contains only the three approved cross-page fields', () => {
    expect(createEmptyMealFlowDraft()).toEqual({
      inputSummary: null,
      parsedMeal: null,
      assessment: null
    })
  })

  it('keeps draft data in one store and clears it as a single operation', () => {
    const store = createStore()

    store.set(mealFlowDraftAtom, {
      inputSummary: {
        sourceType: 'TEXT',
        sourceText: '水煮鸡胸',
        displayLabel: '文字输入'
      },
      parsedMeal,
      assessment
    })

    expect(store.get(mealFlowDraftAtom).parsedMeal).toEqual(parsedMeal)
    store.set(resetMealFlowDraftAtom)
    expect(store.get(mealFlowDraftAtom)).toEqual(createEmptyMealFlowDraft())
  })

  it('starts a fresh store without restoring another store draft', () => {
    const firstStore = createStore()
    const freshStore = createStore()

    firstStore.set(mealFlowDraftAtom, {
      ...createEmptyMealFlowDraft(),
      inputSummary: {
        sourceType: 'IMAGE',
        displayLabel: '图片输入'
      }
    })

    expect(freshStore.get(mealFlowDraftAtom)).toEqual(createEmptyMealFlowDraft())
  })
})
