import {
  apiErrorResponseSchema,
  mealAssessmentSchema,
  type ConfirmedMealItem
} from '@food-sense/shared'
import { describe, expect, it, vi } from 'vitest'

import { DEMO_PROFILE_ID } from './demo-profile.mjs'
import { createMealAssessmentHandlers } from './meal-assessment-handlers'
import type { MealAssessmentDatabase } from './meal-assessment-service'

const RICE_ITEM: ConfirmedMealItem = {
  displayName: '米饭',
  ingredients: ['RICE'],
  otherIngredients: [],
  cookingMethods: ['STEAMED'],
  otherCookingMethods: [],
  portionLevel: 'regular',
  uncertainties: [],
  wasManuallyAdjusted: false
}

const PROFILE = {
  id: DEMO_PROFILE_ID,
  name: '小苏',
  goalDirection: 'FAT_LOSS' as const,
  dailyCalorieMin: 1400,
  dailyCalorieMax: 1600,
  createdAt: new Date('2026-09-15T00:00:00.000Z'),
  updatedAt: new Date('2026-09-15T00:00:00.000Z')
}

function createDatabase(options: {
  profile?: typeof PROFILE | null
  todayRanges?: Array<{ calorieMin: number; calorieMax: number }>
} = {}) {
  const findProfile = vi.fn(async () =>
    options.profile === undefined ? PROFILE : options.profile
  )
  const findMany = vi.fn(async () => options.todayRanges ?? [])
  const database = {
    demoProfile: { findUnique: findProfile },
    mealRecord: { findMany }
  } as unknown as MealAssessmentDatabase

  return { database, findMany, findProfile }
}

function request(body: unknown): Request {
  return new Request('http://localhost/api/assess-meal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [RICE_ITEM],
    modelVersion: 'offline-demo-v1',
    ...overrides
  }
}

describe('meal assessment POST handler', () => {
  it('returns a stable complete assessment for fixed input and time', async () => {
    const now = new Date('2026-09-15T12:00:00+08:00')
    const { database } = createDatabase()
    const { POST } = createMealAssessmentHandlers(database, () => now)

    const first = await POST(request(validBody()))
    const second = await POST(request(validBody()))
    const firstBody = await first.json()
    const secondBody = await second.json()

    expect(first.status).toBe(200)
    expect(firstBody).toEqual(secondBody)
    expect(mealAssessmentSchema.safeParse(firstBody).success).toBe(true)
    expect(firstBody).toMatchObject({
      calorieRange: { min: 170, max: 250 },
      mealBudget: 800,
      rating: 'GREEN',
      ruleVersion: 'nutrition-assessment-v1',
      modelVersion: 'offline-demo-v1'
    })
  })

  it('uses the injected time at the 10:30 Shanghai slot boundary', async () => {
    const { database } = createDatabase()
    const before = createMealAssessmentHandlers(
      database,
      () => new Date('2026-09-15T10:29:59+08:00')
    )
    const after = createMealAssessmentHandlers(
      database,
      () => new Date('2026-09-15T10:30:00+08:00')
    )

    const beforeBody = await (await before.POST(request(validBody()))).json()
    const afterBody = await (await after.POST(request(validBody()))).json()

    expect(beforeBody.mealBudget).toBe(533)
    expect(afterBody.mealBudget).toBe(800)
  })

  it('uses only records inside the current Shanghai day', async () => {
    const now = new Date('2026-09-15T12:00:00+08:00')
    const { database, findMany } = createDatabase({
      todayRanges: [{ calorieMin: 300, calorieMax: 400 }]
    })
    const { POST } = createMealAssessmentHandlers(database, () => now)

    const body = await (await POST(request(validBody()))).json()

    expect(body.mealBudget).toBe(650)
    expect(findMany).toHaveBeenCalledWith({
      where: {
        profileId: DEMO_PROFILE_ID,
        createdAt: {
          gte: new Date('2026-09-14T16:00:00.000Z'),
          lt: new Date('2026-09-15T16:00:00.000Z')
        }
      },
      select: { calorieMin: true, calorieMax: true }
    })
  })

  it('reflects profile range and today records in the meal budget', async () => {
    const now = new Date('2026-09-15T12:00:00+08:00')
    const wide = createDatabase({
      profile: { ...PROFILE, dailyCalorieMin: 1800, dailyCalorieMax: 2000 }
    })
    const consumed = createDatabase({
      todayRanges: [{ calorieMin: 500, calorieMax: 600 }]
    })

    const wideBody = await (
      await createMealAssessmentHandlers(wide.database, () => now).POST(
        request(validBody())
      )
    ).json()
    const consumedBody = await (
      await createMealAssessmentHandlers(consumed.database, () => now).POST(
        request(validBody())
      )
    ).json()

    expect(wideBody.mealBudget).toBe(1000)
    expect(consumedBody.mealBudget).toBe(550)
  })

  it('rejects malformed and unconfirmed meal items', async () => {
    const { database, findProfile } = createDatabase()
    const { POST } = createMealAssessmentHandlers(database)
    const unconfirmedItem = { ...RICE_ITEM, confidence: 0.9 }

    for (const body of [{ items: [] }, { items: [unconfirmedItem] }]) {
      const response = await POST(request(body))
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody.error.code).toBe('VALIDATION_FAILED')
      expect(apiErrorResponseSchema.safeParse(responseBody).success).toBe(true)
    }

    expect(findProfile).not.toHaveBeenCalled()
  })

  it('prompts for unknown dishes before conservative fallback is explicit', async () => {
    const { database } = createDatabase()
    const { POST } = createMealAssessmentHandlers(database)
    const unknownItem: ConfirmedMealItem = {
      ...RICE_ITEM,
      displayName: '秘制菜',
      ingredients: ['OTHER'],
      otherIngredients: ['未知食材']
    }

    const response = await POST(request({ items: [unknownItem] }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('UNKNOWN_DISH')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
  })

  it('uses a wide range after the client explicitly chooses fallback', async () => {
    const { database } = createDatabase()
    const { POST } = createMealAssessmentHandlers(database)
    const unknownItem: ConfirmedMealItem = {
      ...RICE_ITEM,
      displayName: '秘制菜',
      ingredients: ['OTHER'],
      otherIngredients: ['未知食材']
    }

    const response = await POST(
      request({
        items: [unknownItem],
        unknownHandling: 'CONSERVATIVE_FALLBACK'
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.calorieRange).toEqual({ min: 100, max: 460 })
    expect(body.uncertainties).toContain(
      '菜品“秘制菜”含有未覆盖食材，已使用宽范围保守估算。'
    )
  })

  it('returns unified database errors without leaking details', async () => {
    const missing = createDatabase({ profile: null })
    const missingHandler = createMealAssessmentHandlers(missing.database)
    const missingResponse = await missingHandler.POST(request(validBody()))

    expect(missingResponse.status).toBe(503)
    expect((await missingResponse.json()).error.code).toBe('DB_UNAVAILABLE')

    const failed = createDatabase()
    failed.findMany.mockRejectedValueOnce(new Error('secret database url'))
    const failedHandler = createMealAssessmentHandlers(failed.database)
    const failedResponse = await failedHandler.POST(request(validBody()))
    const failedBody = await failedResponse.json()

    expect(failedResponse.status).toBe(503)
    expect(failedBody.error.code).toBe('DB_UNAVAILABLE')
    expect(JSON.stringify(failedBody)).not.toContain('secret')
  })
})
