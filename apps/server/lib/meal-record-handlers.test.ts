import {
  apiErrorResponseSchema,
  mealRecordSchema,
  mealRecordsResponseSchema,
  type ConfirmedMealItem
} from '@food-sense/shared'
import { describe, expect, it, vi } from 'vitest'

import {
  buildDemoMealRecordRequest,
  DEMO_MEAL_SAMPLES
} from './demo-meals'
import { DEMO_PROFILE_ID } from './demo-profile.mjs'
import { createMealRecordDeleteHandler } from './meal-record-delete-handler'
import { createMealRecordHandlers } from './meal-record-handlers'
import type {
  MealRecordDatabase,
  MealRecordRow
} from './meal-record-service'

const NOW = new Date('2026-09-15T05:00:00+08:00')
const REQUEST_ID = '00000000-0000-4000-8000-000000000001'

const riceItem: ConfirmedMealItem = {
  displayName: '米饭',
  ingredients: ['RICE'],
  otherIngredients: [],
  cookingMethods: ['STEAMED'],
  otherCookingMethods: [],
  portionLevel: 'regular',
  uncertainties: [],
  wasManuallyAdjusted: false
}

const profile = {
  id: DEMO_PROFILE_ID,
  name: '小苏',
  goalDirection: 'FAT_LOSS' as const,
  dailyCalorieMin: 1400,
  dailyCalorieMax: 1600,
  createdAt: new Date('2026-09-15T08:00:00.000Z'),
  updatedAt: new Date('2026-09-15T08:00:00.000Z')
}

function recordRow(
  overrides: Partial<MealRecordRow> = {}
): MealRecordRow {
  return {
    id: 'record-1',
    profileId: DEMO_PROFILE_ID,
    clientRequestId: REQUEST_ID,
    sourceType: 'TEXT',
    sourceText: '米饭',
    items: [riceItem],
    calorieMin: 170,
    calorieMax: 250,
    mealBudget: 533,
    rating: 'GREEN',
    ratingLabel: '这餐比较合适',
    reason: '本餐估算上限在当前参考额度内。',
    adviceIds: ['KEEP_CURRENT'],
    advice: [
      { id: 'KEEP_CURRENT', text: '保持当前选择即可，无需额外调整。' }
    ],
    uncertainties: [],
    isDemo: true,
    modelVersion: 'offline-demo-v1',
    ruleVersion: 'nutrition-assessment-v1',
    createdAt: new Date('2026-09-14T21:00:00.000Z'),
    ...overrides
  } as MealRecordRow
}

function createDatabase(options: {
  initialRecords?: MealRecordRow[]
  profileExists?: boolean
} = {}) {
  const rows = [...(options.initialRecords ?? [])]
  const findProfile = vi.fn(async () =>
    options.profileExists === false ? null : profile
  )
  const findUnique = vi.fn(async ({ where }) =>
    rows.find((row) => row.clientRequestId === where.clientRequestId) ?? null
  )
  const findMany = vi.fn(async ({ where, orderBy, take, select }) => {
    const createdAt = where?.createdAt
    const filtered = rows
      .filter((row) => row.profileId === where?.profileId)
      .filter(
        (row) =>
          (!createdAt?.gte || row.createdAt >= createdAt.gte) &&
          (!createdAt?.lt || row.createdAt < createdAt.lt)
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, take ?? rows.length)

    if (select && Object.keys(select).length === 2) {
      return filtered.map(({ calorieMin, calorieMax }) => ({
        calorieMin,
        calorieMax
      }))
    }

    void orderBy
    return filtered
  })
  const create = vi.fn(async ({ data }) => {
    const row = recordRow({
      ...data,
      id: `record-${rows.length + 1}`,
      createdAt: NOW
    })
    rows.push(row)
    return row
  })
  const deleteMany = vi.fn(async ({ where }) => {
    const index = rows.findIndex(
      (row) => row.id === where.id && row.profileId === where.profileId
    )

    if (index === -1) {
      return { count: 0 }
    }

    rows.splice(index, 1)
    return { count: 1 }
  })
  const database = {
    demoProfile: { findUnique: findProfile },
    mealRecord: { findUnique, findMany, create, deleteMany }
  } as unknown as MealRecordDatabase

  return {
    create,
    database,
    deleteMany,
    findMany,
    findProfile,
    findUnique,
    rows
  }
}

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/meal-records', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    clientRequestId: REQUEST_ID,
    sourceType: 'TEXT',
    sourceText: '米饭',
    items: [riceItem],
    isDemo: true,
    modelVersion: 'offline-demo-v1',
    ...overrides
  }
}

describe('meal record POST handler', () => {
  it('persists an offline sample as demo data', async () => {
    const sample = DEMO_MEAL_SAMPLES[0]

    if (!sample) throw new Error('Expected the first demo sample')

    const { create, database } = createDatabase()
    const { POST } = createMealRecordHandlers(database, () => NOW)
    const response = await POST(
      postRequest(buildDemoMealRecordRequest(sample, REQUEST_ID))
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.isDemo).toBe(true)
    expect(create.mock.calls[0]?.[0].data.isDemo).toBe(true)
  })

  it('recalculates on the server and ignores a tampered client snapshot', async () => {
    const { create, database } = createDatabase()
    const { POST } = createMealRecordHandlers(database, () => NOW)
    const response = await POST(
      postRequest(
        validRequest({
          clientAssessmentSnapshot: {
            items: [riceItem],
            calorieRange: { min: 9990, max: 9999 },
            mealBudget: 1,
            rating: 'RED',
            ratingLabel: '篡改结果',
            reason: '篡改原因',
            advice: [{ id: 'REDUCE_RICE', text: '篡改建议' }],
            uncertainties: ['篡改不确定性'],
            ruleVersion: 'client-rule'
          }
        })
      )
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mealRecordSchema.safeParse(body).success).toBe(true)
    expect(body.assessment).toMatchObject({
      calorieRange: { min: 170, max: 250 },
      mealBudget: 533,
      rating: 'GREEN',
      ratingLabel: '这餐比较合适',
      reason: '本餐估算上限在当前参考额度的合理范围内。',
      advice: [
        { id: 'KEEP_CURRENT', text: '保持当前选择即可，无需额外调整。' }
      ],
      uncertainties: [],
      ruleVersion: 'nutrition-assessment-v1',
      modelVersion: 'offline-demo-v1'
    })
    const persisted = create.mock.calls[0]?.[0].data
    expect(persisted).not.toHaveProperty('clientAssessmentSnapshot')
    expect(persisted).not.toHaveProperty('image')
    expect(persisted).not.toHaveProperty('imagePath')
    expect(persisted).toMatchObject({
      adviceIds: ['KEEP_CURRENT'],
      ruleVersion: 'nutrition-assessment-v1'
    })
  })

  it('returns an existing record for a repeated client request id', async () => {
    const existing = recordRow()
    const { create, database } = createDatabase({ initialRecords: [existing] })
    const { POST } = createMealRecordHandlers(database, () => NOW)

    const response = await POST(postRequest(validRequest()))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: existing.id })
    expect(create).not.toHaveBeenCalled()
  })

  it('recovers from a concurrent unique conflict by returning the winner', async () => {
    const winner = recordRow()
    const { create, database, findUnique } = createDatabase()
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(winner)
    create.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    )
    const { POST } = createMealRecordHandlers(database, () => NOW)

    const response = await POST(postRequest(validRequest()))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: winner.id })
    expect(create).toHaveBeenCalledTimes(1)
    expect(findUnique).toHaveBeenCalledTimes(2)
  })

  it('uses only records from the current Shanghai day for assessment', async () => {
    const previousDay = recordRow({
      id: 'previous-day',
      clientRequestId: '00000000-0000-4000-8000-000000000002',
      calorieMin: 900,
      calorieMax: 1000,
      createdAt: new Date('2026-09-14T15:59:59.999Z')
    })
    const today = recordRow({
      id: 'today',
      clientRequestId: '00000000-0000-4000-8000-000000000003',
      calorieMin: 300,
      calorieMax: 400,
      createdAt: new Date('2026-09-14T16:00:00.000Z')
    })
    const { database } = createDatabase({ initialRecords: [previousDay, today] })
    const { POST } = createMealRecordHandlers(database, () => NOW)

    const response = await POST(postRequest(validRequest()))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.assessment.mealBudget).toBe(433)
  })

  it('rejects a client snapshot without ruleVersion', async () => {
    const { create, database } = createDatabase()
    const { POST } = createMealRecordHandlers(database, () => NOW)
    const snapshotWithoutRuleVersion = {
      items: [riceItem],
      calorieRange: { min: 170, max: 250 },
      mealBudget: 533,
      rating: 'GREEN',
      ratingLabel: '这餐比较合适',
      reason: '本餐估算上限在当前参考额度内。',
      advice: [
        { id: 'KEEP_CURRENT', text: '保持当前选择即可，无需额外调整。' }
      ],
      uncertainties: []
    }

    const response = await POST(
      postRequest(
        validRequest({ clientAssessmentSnapshot: snapshotWithoutRuleVersion })
      )
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects unknown dishes before writing a record', async () => {
    const { create, database } = createDatabase()
    const { POST } = createMealRecordHandlers(database, () => NOW)
    const unknownItem: ConfirmedMealItem = {
      ...riceItem,
      displayName: '秘制菜',
      ingredients: ['OTHER'],
      otherIngredients: ['未知食材']
    }

    const response = await POST(
      postRequest(validRequest({ items: [unknownItem] }))
    )
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('UNKNOWN_DISH')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it('returns unified errors for a missing profile and database failure', async () => {
    const missing = createDatabase({ profileExists: false })
    const missingHandlers = createMealRecordHandlers(missing.database, () => NOW)
    const missingResponse = await missingHandlers.POST(
      postRequest(validRequest())
    )

    expect(missingResponse.status).toBe(503)
    expect((await missingResponse.json()).error.code).toBe('DB_UNAVAILABLE')

    const failed = createDatabase()
    failed.findUnique.mockRejectedValueOnce(new Error('secret database url'))
    const failedHandlers = createMealRecordHandlers(failed.database, () => NOW)
    const failedResponse = await failedHandlers.POST(postRequest(validRequest()))
    const failedBody = await failedResponse.json()

    expect(failedResponse.status).toBe(503)
    expect(failedBody.error.code).toBe('DB_UNAVAILABLE')
    expect(JSON.stringify(failedBody)).not.toContain('secret')
  })
})

describe('meal record GET handler', () => {
  it('groups records by Shanghai date and sums both calorie bounds', async () => {
    const records = [
      recordRow({
        id: 'today-1',
        clientRequestId: '00000000-0000-4000-8000-000000000011',
        calorieMin: 100,
        calorieMax: 200,
        createdAt: new Date('2026-09-14T16:00:00.000Z')
      }),
      recordRow({
        id: 'today-2',
        clientRequestId: '00000000-0000-4000-8000-000000000012',
        calorieMin: 300,
        calorieMax: 500,
        createdAt: new Date('2026-09-15T15:59:59.999Z')
      }),
      recordRow({
        id: 'yesterday',
        clientRequestId: '00000000-0000-4000-8000-000000000013',
        calorieMin: 600,
        calorieMax: 800,
        createdAt: new Date('2026-09-14T15:59:59.999Z')
      })
    ]
    const { database } = createDatabase({ initialRecords: records })
    const { GET } = createMealRecordHandlers(database, () => NOW)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mealRecordsResponseSchema.safeParse(body).success).toBe(true)
    expect(body.days).toMatchObject([
      {
        date: '2026-09-15',
        summary: { calorieMin: 400, calorieMax: 700 }
      },
      {
        date: '2026-09-14',
        summary: { calorieMin: 600, calorieMax: 800 }
      }
    ])
  })

  it('returns at most 50 records from the latest 30 Shanghai dates', async () => {
    const recent = Array.from({ length: 55 }, (_, index) =>
      recordRow({
        id: `recent-${index}`,
        clientRequestId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        createdAt: new Date(NOW.getTime() - index * 60_000)
      })
    )
    const tooOld = recordRow({
      id: 'too-old',
      clientRequestId: '00000000-0000-4000-8000-999999999999',
      createdAt: new Date('2026-08-16T15:59:59.999Z')
    })
    const future = recordRow({
      id: 'future',
      clientRequestId: '00000000-0000-4000-8000-999999999998',
      createdAt: new Date('2026-09-15T16:00:00.000Z')
    })
    const { database, findMany } = createDatabase({
      initialRecords: [...recent, tooOld, future]
    })
    const { GET } = createMealRecordHandlers(database, () => NOW)

    const response = await GET()
    const body = await response.json()
    const returnedCount = body.days.reduce(
      (total: number, day: { records: unknown[] }) => total + day.records.length,
      0
    )

    expect(response.status).toBe(200)
    expect(returnedCount).toBe(50)
    expect(JSON.stringify(body)).not.toContain('too-old')
    expect(JSON.stringify(body)).not.toContain('future')
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    )
  })

  it('returns a unified response when record queries fail', async () => {
    const failed = createDatabase()
    failed.findMany.mockRejectedValueOnce(new Error('secret database url'))
    const { GET } = createMealRecordHandlers(failed.database, () => NOW)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('DB_UNAVAILABLE')
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
  })

  it('does not return a false empty history when the fixed profile is missing', async () => {
    const missing = createDatabase({ profileExists: false })
    const { GET } = createMealRecordHandlers(missing.database, () => NOW)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toEqual({
      code: 'DB_UNAVAILABLE',
      message: '演示资料尚未初始化，请先运行 pnpm db:seed。',
      retryable: true
    })
    expect(missing.findMany).not.toHaveBeenCalled()
  })
})

describe('meal record DELETE handler', () => {
  it('physically deletes an owned record and refreshes the next summary', async () => {
    const first = recordRow({
      id: 'first',
      clientRequestId: '00000000-0000-4000-8000-000000000021',
      calorieMin: 100,
      calorieMax: 200
    })
    const second = recordRow({
      id: 'second',
      clientRequestId: '00000000-0000-4000-8000-000000000022',
      calorieMin: 300,
      calorieMax: 500
    })
    const { database, deleteMany, rows } = createDatabase({
      initialRecords: [first, second]
    })
    const DELETE = createMealRecordDeleteHandler(database)
    const { GET } = createMealRecordHandlers(database, () => NOW)

    const deleteResponse = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: first.id })
    })
    const getResponse = await GET()
    const body = await getResponse.json()

    expect(deleteResponse.status).toBe(204)
    expect(await deleteResponse.text()).toBe('')
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: first.id, profileId: DEMO_PROFILE_ID }
    })
    expect(rows.map(({ id }) => id)).toEqual([second.id])
    expect(body.days[0].summary).toEqual({ calorieMin: 300, calorieMax: 500 })
    expect(JSON.stringify(body)).not.toContain(first.id)
  })

  it('returns MEAL_NOT_FOUND for a missing or foreign record', async () => {
    const foreign = recordRow({
      id: 'foreign',
      profileId: 'other-profile',
      clientRequestId: '00000000-0000-4000-8000-000000000023'
    })
    const { database, rows } = createDatabase({ initialRecords: [foreign] })
    const DELETE = createMealRecordDeleteHandler(database)

    for (const id of ['missing', foreign.id]) {
      const response = await DELETE(new Request('http://localhost'), {
        params: Promise.resolve({ id })
      })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error).toEqual({
        code: 'MEAL_NOT_FOUND',
        message: '记录不存在或已删除，请刷新记录列表。',
        retryable: false
      })
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
    }

    expect(rows).toEqual([foreign])
  })

  it('makes a repeated delete harmless to other records', async () => {
    const target = recordRow({ id: 'target' })
    const other = recordRow({
      id: 'other',
      clientRequestId: '00000000-0000-4000-8000-000000000024'
    })
    const { database, rows } = createDatabase({
      initialRecords: [target, other]
    })
    const DELETE = createMealRecordDeleteHandler(database)
    const context = { params: Promise.resolve({ id: target.id }) }

    const firstResponse = await DELETE(new Request('http://localhost'), context)
    const secondResponse = await DELETE(
      new Request('http://localhost'),
      context
    )

    expect(firstResponse.status).toBe(204)
    expect(secondResponse.status).toBe(404)
    expect(rows.map(({ id }) => id)).toEqual([other.id])
  })

  it('maps database failures without exposing their details', async () => {
    const { database, deleteMany } = createDatabase()
    deleteMany.mockRejectedValueOnce(new Error('secret database url'))
    const DELETE = createMealRecordDeleteHandler(database)

    const response = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'record-1' })
    })
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('DB_UNAVAILABLE')
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
  })
})
