import type { MealRecord, MealRecordsResponse } from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import {
  buildTodayRecordSummary,
  formatShanghaiTime,
  recordDisplayName,
  recordRatingPresentation,
  shanghaiDateKey
} from './home-records'

function record(
  overrides: Partial<MealRecord> = {}
): MealRecord {
  return {
    id: 'record-1',
    profileId: 'demo-profile',
    clientRequestId: '00000000-0000-4000-8000-000000000001',
    sourceType: 'TEXT',
    sourceText: '米饭和水煮鸡胸',
    assessment: {
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
        },
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
      calorieRange: { min: 310, max: 480 },
      mealBudget: 800,
      rating: 'GREEN',
      ratingLabel: '这餐比较合适',
      reason: '本餐估算上限在当前参考范围内。',
      advice: [{ id: 'KEEP_CURRENT', text: '保持当前选择即可。' }],
      uncertainties: [],
      ruleVersion: 'nutrition-assessment-v1'
    },
    isDemo: true,
    createdAt: '2026-09-16T11:36:17.237Z',
    ...overrides
  }
}

describe('home saved-record presentation', () => {
  it('builds the Shanghai date key without depending on device timezone', () => {
    expect(shanghaiDateKey(new Date('2026-09-15T16:00:00.000Z'))).toBe(
      '2026-09-16'
    )
  })

  it('selects all of today and sorts the records newest first', () => {
    const earlier = record({
      id: 'earlier',
      createdAt: '2026-09-16T10:00:00.000Z'
    })
    const latest = record({
      id: 'latest',
      createdAt: '2026-09-16T11:00:00.000Z'
    })
    const response: MealRecordsResponse = {
      days: [
        {
          date: '2026-09-16',
          summary: { calorieMin: 620, calorieMax: 960 },
          records: [earlier, latest]
        },
        {
          date: '2026-09-15',
          summary: { calorieMin: 310, calorieMax: 480 },
          records: [record({ id: 'yesterday' })]
        }
      ]
    }

    expect(
      buildTodayRecordSummary(response, new Date('2026-09-16T12:00:00.000Z'))
    ).toEqual({
      count: 2,
      records: [latest, earlier],
      calorieRange: { min: 620, max: 960 }
    })
  })

  it('returns null instead of showing a past record as today', () => {
    const response: MealRecordsResponse = {
      days: [
        {
          date: '2026-09-15',
          summary: { calorieMin: 310, calorieMax: 480 },
          records: [record()]
        }
      ]
    }

    expect(
      buildTodayRecordSummary(response, new Date('2026-09-16T12:00:00.000Z'))
    ).toBeNull()
  })

  it('uses confirmed dish names rather than an input-mode placeholder', () => {
    expect(recordDisplayName(record())).toBe('米饭 + 水煮鸡胸')
  })

  it('formats saved time in Shanghai time', () => {
    expect(formatShanghaiTime('2026-09-16T11:47:27.170Z')).toBe('19:47')
  })

  it('describes every rating with text, icon, and tone', () => {
    expect(recordRatingPresentation('GREEN')).toEqual({
      icon: '✓',
      label: '绿灯',
      tone: 'success'
    })
    expect(recordRatingPresentation('YELLOW')).toEqual({
      icon: '!',
      label: '黄灯',
      tone: 'warning'
    })
    expect(recordRatingPresentation('RED')).toEqual({
      icon: '×',
      label: '红灯',
      tone: 'danger'
    })
  })
})
