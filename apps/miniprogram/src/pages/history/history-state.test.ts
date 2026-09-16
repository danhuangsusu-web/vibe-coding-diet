import type {
  DemoProfile,
  MealRecord,
  MealRecordsResponse
} from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import {
  adjustCalorieValue,
  buildProfileUpdateRequest,
  createSettingsDraft,
  formatHistoryDate,
  isSettingsDirty,
  removeHistoryRecord,
  validateSettingsDraft
} from './history-state'

const PROFILE: DemoProfile = {
  id: 'demo-profile',
  name: '小苏',
  goalDirection: 'FAT_LOSS',
  dailyCalorieMin: 1400,
  dailyCalorieMax: 1600,
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z'
}

function record(id: string, min: number, max: number): MealRecord {
  return {
    id,
    profileId: 'demo-profile',
    clientRequestId: `00000000-0000-4000-8000-${id.padStart(12, '0')}`,
    sourceType: 'TEXT',
    sourceText: '测试餐食',
    assessment: {
      items: [
        {
          displayName: '测试餐食',
          ingredients: ['RICE'],
          otherIngredients: [],
          cookingMethods: ['STEAMED'],
          otherCookingMethods: [],
          portionLevel: 'regular',
          uncertainties: [],
          wasManuallyAdjusted: false
        }
      ],
      calorieRange: { min, max },
      mealBudget: 800,
      rating: 'GREEN',
      ratingLabel: '这餐比较合适',
      reason: '本餐估算上限在当前参考范围内。',
      advice: [{ id: 'KEEP_CURRENT', text: '保持当前选择即可。' }],
      uncertainties: [],
      ruleVersion: 'nutrition-assessment-v1'
    },
    isDemo: true,
    createdAt: '2026-09-16T04:00:00.000Z'
  }
}

const RESPONSE: MealRecordsResponse = {
  todayDate: '2026-09-16',
  serverTime: '2026-09-16T12:00:00.000Z',
  days: [
    {
      date: '2026-09-16',
      summary: { calorieMin: 500, calorieMax: 800 },
      records: [record('1', 200, 300), record('2', 300, 500)]
    },
    {
      date: '2026-09-15',
      summary: { calorieMin: 100, calorieMax: 200 },
      records: [record('3', 100, 200)]
    }
  ]
}

describe('history and settings state', () => {
  it('builds a valid settings request from the loaded profile', () => {
    const draft = createSettingsDraft(PROFILE)

    expect(validateSettingsDraft(draft)).toBeNull()
    expect(buildProfileUpdateRequest(draft)).toEqual({
      goalDirection: 'FAT_LOSS',
      dailyCalorieMin: 1400,
      dailyCalorieMax: 1600
    })
    expect(isSettingsDirty(PROFILE, draft)).toBe(false)
  })

  it('rejects non-positive, non-integer, and reversed ranges', () => {
    expect(
      validateSettingsDraft({
        goalDirection: 'FAT_LOSS',
        dailyCalorieMin: 0,
        dailyCalorieMax: 1600
      })
    ).toBe('每日建议必须是正整数。')
    expect(
      validateSettingsDraft({
        goalDirection: 'FAT_LOSS',
        dailyCalorieMin: 1400.5,
        dailyCalorieMax: 1600
      })
    ).toBe('每日建议必须是正整数。')
    expect(
      validateSettingsDraft({
        goalDirection: 'FAT_LOSS',
        dailyCalorieMin: 1600,
        dailyCalorieMax: 1600
      })
    ).toBe('每日建议下限必须小于上限。')
  })

  it('adjusts calories in 50 kcal steps without going below 50', () => {
    expect(adjustCalorieValue(1400, 1)).toBe(1450)
    expect(adjustCalorieValue(1400, -1)).toBe(1350)
    expect(adjustCalorieValue(50, -1)).toBe(50)
  })

  it('detects changed settings', () => {
    expect(
      isSettingsDirty(PROFILE, {
        ...createSettingsDraft(PROFILE),
        goalDirection: 'MAINTAIN'
      })
    ).toBe(true)
  })

  it('labels dates relative to the server-provided today date', () => {
    expect(formatHistoryDate('2026-09-16', '2026-09-16')).toBe(
      '今天 · 9月16日'
    )
    expect(formatHistoryDate('2026-09-15', '2026-09-16')).toBe(
      '昨天 · 9月15日'
    )
    expect(formatHistoryDate('2026-09-14', '2026-09-16')).toBe('9月14日')
  })

  it('removes a record and recalculates its daily summary', () => {
    const response = removeHistoryRecord(RESPONSE, '1')

    expect(response.days[0]).toMatchObject({
      date: '2026-09-16',
      summary: { calorieMin: 300, calorieMax: 500 }
    })
    expect(response.days[0].records.map(({ id }) => id)).toEqual(['2'])
  })

  it('drops an empty day and leaves unmatched responses unchanged', () => {
    expect(removeHistoryRecord(RESPONSE, '3').days.map(({ date }) => date)).toEqual([
      '2026-09-16'
    ])
    expect(removeHistoryRecord(RESPONSE, 'missing')).toBe(RESPONSE)
  })
})
