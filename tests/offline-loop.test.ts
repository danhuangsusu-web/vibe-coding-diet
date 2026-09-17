import {
  demoProfileSchema,
  mealAssessmentSchema,
  mealRecordSchema,
  mealRecordsResponseSchema,
  type DemoProfile,
  type MealAssessment
} from '../packages/shared/src'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../apps/miniprogram/src/services/meal-api', () => ({
  parseTextMeal: vi.fn()
}))

import {
  formatHistoryDate,
  removeHistoryRecord,
  validateSettingsDraft
} from '../apps/miniprogram/src/pages/history/history-state'
import {
  buildHomeDashboard,
  recordDisplayName
} from '../apps/miniprogram/src/pages/home/home-records'
import {
  buildConfirmedParsedMeal,
  canConfirmMeal,
  createMealConfirmState
} from '../apps/miniprogram/src/pages/meal-confirm/meal-confirm-state'
import {
  buildMealParseInput,
  canSubmitMealInput,
  createInitialMealInputState,
  mealInputReducer
} from '../apps/miniprogram/src/pages/meal-input/meal-input-state'
import {
  buildAssessMealRequest,
  buildCreateMealRecordRequest,
  findMealRecord
} from '../apps/miniprogram/src/pages/meal-result/meal-result-state'
import {
  OFFLINE_DEMO_TEXTS,
  OFFLINE_MEAL_PARSER_METADATA,
  parseMeal
} from '../apps/miniprogram/src/services/meal-parser'
import type { MealFlowDraft } from '../apps/miniprogram/src/state/meal-flow'
import { createMealAssessmentHandlers } from '../apps/server/lib/meal-assessment-handlers'
import { createMealRecordDeleteHandler } from '../apps/server/lib/meal-record-delete-handler'
import { createMealRecordHandlers } from '../apps/server/lib/meal-record-handlers'
import type {
  MealRecordDatabase,
  MealRecordRow
} from '../apps/server/lib/meal-record-service'
import { createProfileHandlers } from '../apps/server/lib/profile-handlers'
import type {
  ProfileDatabase,
  ProfileRow
} from '../apps/server/lib/profile-service'
import { DEMO_PROFILE_ID } from '../apps/server/lib/demo-profile.mjs'

const NOW = new Date('2026-09-15T12:00:00+08:00')
const REQUEST_IDS = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102'
] as const

const INITIAL_PROFILE: ProfileRow = {
  id: DEMO_PROFILE_ID,
  name: '小苏',
  goalDirection: 'FAT_LOSS',
  dailyCalorieMin: 1400,
  dailyCalorieMax: 1600,
  createdAt: new Date('2026-09-15T00:00:00.000Z'),
  updatedAt: new Date('2026-09-15T00:00:00.000Z')
}

interface FindManyArgs {
  where?: {
    profileId?: string
    createdAt?: { gte?: Date; lt?: Date }
  }
  take?: number
}

function createLoopDatabase() {
  let profile = { ...INITIAL_PROFILE }
  const rows: MealRecordRow[] = []

  const findProfile = vi.fn(async () => profile)
  const updateProfile = vi.fn(
    async ({ data }: { data: Partial<ProfileRow> }) => {
      profile = {
        ...profile,
        ...data,
        updatedAt: new Date('2026-09-15T04:05:00.000Z')
      }
      return profile
    }
  )
  const findRecord = vi.fn(
    async ({ where }: { where: { clientRequestId: string } }) =>
      rows.find(
        ({ clientRequestId }) => clientRequestId === where.clientRequestId
      ) ?? null
  )
  const findRecords = vi.fn(async ({ where, take }: FindManyArgs) => {
    const range = where?.createdAt

    return rows
      .filter((row) => !where?.profileId || row.profileId === where.profileId)
      .filter(
        (row) =>
          (!range?.gte || row.createdAt >= range.gte) &&
          (!range?.lt || row.createdAt < range.lt)
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, take ?? rows.length)
  })
  const createRecord = vi.fn(
    async ({ data }: { data: Omit<MealRecordRow, 'id' | 'createdAt'> }) => {
      const row = {
        ...data,
        id: `offline-loop-record-${rows.length + 1}`,
        createdAt: new Date(NOW.getTime() + rows.length * 1000)
      } as MealRecordRow
      rows.push(row)
      return row
    }
  )
  const deleteRecords = vi.fn(
    async ({ where }: { where: { id: string; profileId: string } }) => {
      const index = rows.findIndex(
        (row) => row.id === where.id && row.profileId === where.profileId
      )
      if (index < 0) return { count: 0 }

      rows.splice(index, 1)
      return { count: 1 }
    }
  )

  const database = {
    demoProfile: {
      findUnique: findProfile,
      update: updateProfile
    },
    mealRecord: {
      findUnique: findRecord,
      findMany: findRecords,
      create: createRecord,
      deleteMany: deleteRecords
    }
  } as unknown as MealRecordDatabase & ProfileDatabase

  return {
    database,
    getProfile: () => profile,
    rows
  }
}

function jsonRequest(url: string, method: 'PATCH' | 'POST', body: unknown) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function createDraft(sourceText: string, parsedMeal: MealFlowDraft['parsedMeal']): MealFlowDraft {
  return {
    inputSummary: {
      sourceType: 'TEXT',
      sourceText,
      displayLabel: '文字输入',
      submittedAt: NOW.toISOString(),
      ...OFFLINE_MEAL_PARSER_METADATA
    },
    parsedMeal,
    assessment: null
  }
}

async function readProfile(GET: () => Promise<Response>): Promise<DemoProfile> {
  return demoProfileSchema.parse(await (await GET()).json())
}

async function assessDraft(
  POST: (request: Request) => Promise<Response>,
  draft: MealFlowDraft
): Promise<MealAssessment> {
  const request = buildAssessMealRequest(draft)
  expect(request).not.toBeNull()

  const response = await POST(
    jsonRequest('http://localhost/api/assess-meal', 'POST', request)
  )
  expect(response.status).toBe(200)
  return mealAssessmentSchema.parse(await response.json())
}

describe('complete offline five-page loop', () => {
  it('runs both offline samples through input, confirmation, assessment, idempotent save, refresh, history, and delete', async () => {
    const { database, rows } = createLoopDatabase()
    const assessmentHandlers = createMealAssessmentHandlers(database, () => NOW)
    const recordHandlers = createMealRecordHandlers(database, () => NOW)
    const deleteRecord = createMealRecordDeleteHandler(database)
    const profileHandlers = createProfileHandlers(database)
    const savedRecordIds: string[] = []

    for (const [index, sourceText] of Object.values(OFFLINE_DEMO_TEXTS).entries()) {
      let inputState = createInitialMealInputState('TEXT')
      inputState = mealInputReducer(inputState, {
        type: 'text-changed',
        text: sourceText
      })
      expect(canSubmitMealInput(inputState)).toBe(true)

      const parseInput = buildMealParseInput(inputState)
      expect(parseInput).not.toBeNull()
      const parsedMeal = await parseMeal(parseInput!)
      const confirmState = createMealConfirmState(parsedMeal)
      expect(canConfirmMeal(confirmState)).toBe(true)

      const confirmedMeal = buildConfirmedParsedMeal(confirmState)
      expect(confirmedMeal).not.toBeNull()
      const draft = createDraft(sourceText, confirmedMeal)
      const assessment = await assessDraft(assessmentHandlers.POST, draft)
      draft.assessment = assessment

      const createRequest = buildCreateMealRecordRequest(
        draft,
        assessment,
        REQUEST_IDS[index]!
      )
      expect(createRequest).not.toBeNull()

      const firstSave = await recordHandlers.POST(
        jsonRequest('http://localhost/api/meal-records', 'POST', createRequest)
      )
      expect(firstSave.status).toBe(201)
      const savedRecord = mealRecordSchema.parse(await firstSave.json())
      expect(savedRecord.isDemo).toBe(true)
      savedRecordIds.push(savedRecord.id)

      const repeatedSave = await recordHandlers.POST(
        jsonRequest('http://localhost/api/meal-records', 'POST', createRequest)
      )
      expect(repeatedSave.status).toBe(200)
      expect((await repeatedSave.json()).id).toBe(savedRecord.id)
    }

    expect(rows).toHaveLength(2)

    const recordsResponse = await recordHandlers.GET()
    const records = mealRecordsResponseSchema.parse(
      await recordsResponse.json()
    )
    const profile = await readProfile(profileHandlers.GET)
    const dashboard = buildHomeDashboard(profile, records)

    expect(dashboard.recordCount).toBe(2)
    expect(dashboard.consumedRange).toEqual({ min: 840, max: 1450 })
    expect(records.days[0]?.records).toHaveLength(2)
    expect(formatHistoryDate(records.todayDate, records.todayDate)).toContain(
      '今天'
    )

    for (const recordId of savedRecordIds) {
      const record = findMealRecord(records, recordId)
      expect(record).not.toBeNull()
      expect(recordDisplayName(record!)).not.toBe('已保存餐食')
      expect(record?.isDemo).toBe(true)
    }

    const firstRecordId = savedRecordIds[0]!
    const optimisticHistory = removeHistoryRecord(records, firstRecordId)
    const deleteResponse = await deleteRecord(new Request('http://localhost'), {
      params: Promise.resolve({ id: firstRecordId })
    })
    expect(deleteResponse.status).toBe(204)

    const afterFirstDelete = mealRecordsResponseSchema.parse(
      await (await recordHandlers.GET()).json()
    )
    expect(afterFirstDelete.days).toEqual(optimisticHistory.days)

    const secondDelete = await deleteRecord(new Request('http://localhost'), {
      params: Promise.resolve({ id: savedRecordIds[1]! })
    })
    expect(secondDelete.status).toBe(204)

    const emptyHistory = mealRecordsResponseSchema.parse(
      await (await recordHandlers.GET()).json()
    )
    expect(emptyHistory.days).toEqual([])
    expect(buildHomeDashboard(profile, emptyHistory).recordCount).toBe(0)
    expect(rows).toHaveLength(0)
  })

  it('persists valid settings for later assessments and rejects invalid ranges without changing the profile', async () => {
    const { database, getProfile } = createLoopDatabase()
    const profileHandlers = createProfileHandlers(database)
    const assessmentHandlers = createMealAssessmentHandlers(database, () => NOW)
    const parsedMeal = await parseMeal({
      sourceType: 'TEXT',
      sourceText: OFFLINE_DEMO_TEXTS.lightChickenSet
    })
    const draft = createDraft(
      OFFLINE_DEMO_TEXTS.lightChickenSet,
      buildConfirmedParsedMeal(createMealConfirmState(parsedMeal))
    )
    const before = await assessDraft(assessmentHandlers.POST, draft)

    const validSettings = {
      goalDirection: 'MAINTAIN' as const,
      dailyCalorieMin: 2000,
      dailyCalorieMax: 2200
    }
    expect(validateSettingsDraft(validSettings)).toBeNull()
    const updateResponse = await profileHandlers.PATCH(
      jsonRequest('http://localhost/api/profile', 'PATCH', validSettings)
    )
    expect(updateResponse.status).toBe(200)
    expect(await readProfile(profileHandlers.GET)).toMatchObject(validSettings)

    const after = await assessDraft(assessmentHandlers.POST, draft)
    expect(before.mealBudget).toBe(800)
    expect(after.mealBudget).toBe(1100)

    const invalidSettings = {
      goalDirection: 'MAINTAIN' as const,
      dailyCalorieMin: 2200,
      dailyCalorieMax: 2200
    }
    expect(validateSettingsDraft(invalidSettings)).not.toBeNull()
    const rejectedResponse = await profileHandlers.PATCH(
      jsonRequest('http://localhost/api/profile', 'PATCH', invalidSettings)
    )
    expect(rejectedResponse.status).toBe(400)
    expect(getProfile()).toMatchObject(validSettings)
  })
})
