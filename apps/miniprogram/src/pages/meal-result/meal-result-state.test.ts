import type { MealAssessment } from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import type { MealFlowDraft } from '../../state/meal-flow'
import {
  buildAssessMealRequest,
  buildCreateMealRecordRequest,
  createClientRequestId,
  createMealResultState,
  findMealRecord,
  mealResultReducer,
  ratingPresentation
} from './meal-result-state'

const assessment: MealAssessment = {
  items: [
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
  calorieRange: { min: 170, max: 250 },
  mealBudget: 800,
  rating: 'GREEN',
  ratingLabel: '这餐比较合适',
  reason: '本餐估算上限在当前参考额度的合理范围内。',
  advice: [{ id: 'KEEP_CURRENT', text: '保持当前选择即可，无需额外调整。' }],
  uncertainties: [],
  ruleVersion: 'nutrition-assessment-v1',
  modelVersion: 'offline-demo-v1'
}

function draft(sourceType: 'TEXT' | 'IMAGE' = 'TEXT'): MealFlowDraft {
  return {
    inputSummary:
      sourceType === 'TEXT'
        ? {
            sourceType: 'TEXT',
            sourceText: '米饭',
            displayLabel: '文字输入',
            submittedAt: '2026-09-16T12:00:00+08:00',
            isDemo: true,
            modelVersion: 'offline-demo-v1'
          }
        : {
            sourceType: 'IMAGE',
            displayLabel: '相册图片',
            submittedAt: '2026-09-16T12:00:00+08:00',
            isDemo: true,
            modelVersion: 'offline-demo-v1'
          },
    parsedMeal: {
      items: [
        {
          displayName: '米饭',
          ingredients: ['RICE'],
          otherIngredients: [],
          cookingMethods: ['STEAMED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          confidence: 0.97,
          uncertainties: [],
          wasManuallyAdjusted: false
        }
      ]
    },
    assessment: null
  }
}

describe('meal result request builders', () => {
  it('builds an assessment request from confirmed items without confidence', () => {
    const request = buildAssessMealRequest(draft())

    expect(request).toMatchObject({
      unknownHandling: 'PROMPT',
      modelVersion: 'offline-demo-v1'
    })
    expect(request?.items[0]).not.toHaveProperty('confidence')
    expect(request?.items[0]?.wasManuallyAdjusted).toBe(false)
  })

  it('switches to conservative fallback only when explicitly requested', () => {
    expect(
      buildAssessMealRequest(draft(), 'CONSERVATIVE_FALLBACK')
        ?.unknownHandling
    ).toBe('CONSERVATIVE_FALLBACK')
  })

  it('returns null when the confirmed meal or input summary is missing', () => {
    expect(
      buildAssessMealRequest({ ...draft(), parsedMeal: null })
    ).toBeNull()
    expect(
      buildAssessMealRequest({ ...draft(), inputSummary: null })
    ).toBeNull()
  })

  it('builds a demo text record request with the assessment snapshot', () => {
    const request = buildCreateMealRecordRequest(
      draft('TEXT'),
      assessment,
      '00000000-0000-4000-8000-000000000001'
    )

    expect(request).toMatchObject({
      clientRequestId: '00000000-0000-4000-8000-000000000001',
      sourceType: 'TEXT',
      sourceText: '米饭',
      isDemo: true,
      unknownHandling: 'PROMPT',
      clientAssessmentSnapshot: assessment,
      modelVersion: 'offline-demo-v1'
    })
  })

  it('preserves an explicit conservative fallback when saving', () => {
    const request = buildCreateMealRecordRequest(
      draft('TEXT'),
      assessment,
      '00000000-0000-4000-8000-000000000003',
      'CONSERVATIVE_FALLBACK'
    )

    expect(request?.unknownHandling).toBe('CONSERVATIVE_FALLBACK')
  })

  it('does not add sourceText to image record requests', () => {
    const request = buildCreateMealRecordRequest(
      draft('IMAGE'),
      assessment,
      '00000000-0000-4000-8000-000000000002'
    )

    expect(request?.sourceType).toBe('IMAGE')
    expect(request).not.toHaveProperty('sourceText')
  })

  it('creates RFC 4122 version 4 request identifiers', () => {
    const id = createClientRequestId(() => 0.5)

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })
})

describe('meal result presentation and recovery state', () => {
  it('finds a saved record by id across grouped history days', () => {
    const savedRecord = {
      id: 'saved-record',
      profileId: 'demo-profile',
      clientRequestId: '00000000-0000-4000-8000-000000000004',
      sourceType: 'TEXT' as const,
      sourceText: '米饭',
      assessment,
      isDemo: true,
      createdAt: '2026-09-16T11:00:00.000Z'
    }

    expect(
      findMealRecord(
        {
          days: [
            {
              date: '2026-09-16',
              summary: { calorieMin: 170, calorieMax: 250 },
              records: [savedRecord]
            }
          ]
        },
        'saved-record'
      )
    ).toEqual(savedRecord)
    expect(findMealRecord({ days: [] }, 'missing')).toBeNull()
  })

  it('uses icon, text, and tone for all three ratings', () => {
    expect(ratingPresentation('GREEN')).toEqual({
      icon: '✓',
      label: '绿灯',
      tone: 'success'
    })
    expect(ratingPresentation('YELLOW')).toEqual({
      icon: '!',
      label: '黄灯',
      tone: 'warning'
    })
    expect(ratingPresentation('RED')).toEqual({
      icon: '×',
      label: '红灯',
      tone: 'danger'
    })
  })

  it('starts with an existing assessment or begins assessing', () => {
    expect(createMealResultState(assessment)).toMatchObject({
      phase: 'assessed',
      assessment
    })
    expect(createMealResultState(null).phase).toBe('assessing')
  })

  it('preserves the full assessment after save failure for retry', () => {
    const initial = createMealResultState(assessment)
    const saving = mealResultReducer(initial, { type: 'save-started' })
    const failed = mealResultReducer(saving, {
      type: 'save-failed',
      message: '网络异常，内容还留在本页'
    })

    expect(failed).toEqual({
      phase: 'save-error',
      assessment,
      errorMessage: '网络异常，内容还留在本页'
    })
  })
})
