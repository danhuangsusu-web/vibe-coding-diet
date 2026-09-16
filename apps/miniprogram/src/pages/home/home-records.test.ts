import type { MealRecord, MealRecordsResponse } from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import {
  buildHomeDashboard,
  buildTodayRecordSummary,
  formatShanghaiDate,
  formatShanghaiTime,
  greetingForServerTime,
  goalDirectionLabel,
  recordDisplayName,
  recordRatingPresentation,
  shanghaiDateKey
} from './home-records'

const PROFILE = {
  id: 'demo-profile',
  name: '小苏',
  goalDirection: 'FAT_LOSS' as const,
  dailyCalorieMin: 1400,
  dailyCalorieMax: 1600,
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z'
}

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
      todayDate: '2026-09-16',
      serverTime: '2026-09-16T12:00:00.000Z',
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

    expect(buildTodayRecordSummary(response)).toEqual({
      count: 2,
      records: [latest, earlier],
      calorieRange: { min: 620, max: 960 }
    })
  })

  it('returns null instead of showing a past record as today', () => {
    const response: MealRecordsResponse = {
      todayDate: '2026-09-16',
      serverTime: '2026-09-16T12:00:00.000Z',
      days: [
        {
          date: '2026-09-15',
          summary: { calorieMin: 310, calorieMax: 480 },
          records: [record()]
        }
      ]
    }

    expect(buildTodayRecordSummary(response)).toBeNull()
  })

  it('uses the server-provided today date instead of the device clock', () => {
    const response = {
      todayDate: '2026-09-15',
      serverTime: '2026-09-15T12:00:00.000Z',
      days: [
        {
          date: '2026-09-15',
          summary: { calorieMin: 310, calorieMax: 480 },
          records: [record()]
        }
      ]
    } as MealRecordsResponse

    expect(buildTodayRecordSummary(response)?.count).toBe(1)
  })

  it('uses confirmed dish names rather than an input-mode placeholder', () => {
    expect(recordDisplayName(record())).toBe('米饭 + 水煮鸡胸')
  })

  it('formats saved time in Shanghai time', () => {
    expect(formatShanghaiTime('2026-09-16T11:47:27.170Z')).toBe('19:47')
  })

  it.each([
    ['2026-09-15T21:00:00.000Z', '早上好'],
    ['2026-09-16T02:59:59.000Z', '早上好'],
    ['2026-09-16T03:00:00.000Z', '中午好'],
    ['2026-09-16T05:59:59.000Z', '中午好'],
    ['2026-09-16T06:00:00.000Z', '下午好'],
    ['2026-09-16T09:59:59.000Z', '下午好'],
    ['2026-09-16T10:00:00.000Z', '晚上好'],
    ['2026-09-16T20:59:59.000Z', '晚上好']
  ])('returns the Shanghai greeting for server time %s', (serverTime, greeting) => {
    expect(greetingForServerTime(serverTime)).toBe(greeting)
  })

  it('falls back to a neutral greeting for an invalid server time', () => {
    expect(greetingForServerTime('not-a-date')).toBe('你好')
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

  it('builds an empty dashboard without replacing ranges with a precise zero', () => {
    expect(
      buildHomeDashboard(
        PROFILE,
        {
          todayDate: '2026-09-16',
          serverTime: '2026-09-16T12:00:00.000Z',
          days: []
        }
      )
    ).toMatchObject({
      consumedRange: { min: 0, max: 0 },
      remainingRange: { min: 1400, max: 1600 },
      progressPercent: 0,
      isOverRange: false,
      recordCount: 0,
      recentRecords: []
    })
  })

  it('calculates conservative remaining ranges and midpoint progress', () => {
    const records = [
      record({ id: 'one', createdAt: '2026-09-16T03:00:00.000Z' }),
      record({ id: 'two', createdAt: '2026-09-16T04:00:00.000Z' }),
      record({ id: 'three', createdAt: '2026-09-16T05:00:00.000Z' }),
      record({ id: 'four', createdAt: '2026-09-16T06:00:00.000Z' })
    ]

    const dashboard = buildHomeDashboard(
      PROFILE,
      {
        todayDate: '2026-09-16',
        serverTime: '2026-09-16T12:00:00.000Z',
        days: [
          {
            date: '2026-09-16',
            summary: { calorieMin: 1150, calorieMax: 1450 },
            records
          }
        ]
      }
    )

    expect(dashboard).toMatchObject({
      consumedRange: { min: 1150, max: 1450 },
      remainingRange: { min: 0, max: 450 },
      progressPercent: 81,
      isOverRange: false,
      recordCount: 4
    })
    expect(dashboard.recentRecords.map(({ id }) => id)).toEqual([
      'four',
      'three',
      'two'
    ])
  })

  it('caps progress and marks a zero remaining range as exceeded', () => {
    const dashboard = buildHomeDashboard(
      PROFILE,
      {
        todayDate: '2026-09-16',
        serverTime: '2026-09-16T12:00:00.000Z',
        days: [
          {
            date: '2026-09-16',
            summary: { calorieMin: 1700, calorieMax: 1900 },
            records: [record()]
          }
        ]
      }
    )

    expect(dashboard.remainingRange).toEqual({ min: 0, max: 0 })
    expect(dashboard.progressPercent).toBe(100)
    expect(dashboard.isOverRange).toBe(true)
  })

  it('formats profile and date labels for the home header', () => {
    expect(goalDirectionLabel('FAT_LOSS')).toBe('减脂目标')
    expect(goalDirectionLabel('MAINTAIN')).toBe('维持目标')
    expect(goalDirectionLabel('MUSCLE_GAIN')).toBe('增肌目标')
    expect(
      formatShanghaiDate('2026-09-16')
    ).toBe('9月16日 · 周三')
  })
})
