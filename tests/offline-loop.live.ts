import {
  demoProfileSchema,
  mealAssessmentSchema,
  mealRecordSchema,
  mealRecordsResponseSchema,
  type DemoProfile,
  type MealRecord,
  type MealRecordsResponse
} from '../packages/shared/src'
import {
  buildDemoMealRecordRequest,
  DEMO_MEAL_SAMPLES,
  OFFLINE_DEMO_MODEL_VERSION
} from '../apps/server/lib/demo-meals'
import { expect, test } from 'vitest'

const BASE_URL = process.env.OFFLINE_LOOP_BASE_URL ?? 'http://127.0.0.1:3000'

interface JsonResponse {
  response: Response
  body: unknown
}

async function requestJson(
  path: string,
  init?: RequestInit
): Promise<JsonResponse> {
  const response = await fetch(`${BASE_URL}${path}`, init)
  const text = await response.text()

  return {
    response,
    body: text ? JSON.parse(text) : null
  }
}

function jsonInit(method: 'PATCH' | 'POST', body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }
}

async function getProfile(): Promise<DemoProfile> {
  const { response, body } = await requestJson('/api/profile')
  expect(response.status).toBe(200)
  return demoProfileSchema.parse(body)
}

async function getRecords(): Promise<MealRecordsResponse> {
  const { response, body } = await requestJson('/api/meal-records')
  expect(response.status).toBe(200)
  return mealRecordsResponseSchema.parse(body)
}

function recordIds(records: MealRecordsResponse): string[] {
  return records.days.flatMap((day) => day.records.map(({ id }) => id))
}

async function deleteRecord(id: string): Promise<number> {
  const response = await fetch(
    `${BASE_URL}/api/meal-records/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )
  return response.status
}

async function restoreProfile(profile: DemoProfile): Promise<void> {
  const { response } = await requestJson(
    '/api/profile',
    jsonInit('PATCH', {
      goalDirection: profile.goalDirection,
      dailyCalorieMin: profile.dailyCalorieMin,
      dailyCalorieMax: profile.dailyCalorieMax
    })
  )
  expect(response.status).toBe(200)
}

test('verifies the complete offline loop against the running server and restores its data', async () => {
  const originalProfile = await getProfile()
  const originalRecords = await getRecords()
  const originalRecordIds = recordIds(originalRecords)
  const createdRecordIds: string[] = []
  const createdClientRequestIds = new Set<string>()

  try {
    const lightSample = DEMO_MEAL_SAMPLES.find(
      ({ id }) => id === 'light-chicken-set'
    )
    if (!lightSample) throw new Error('Missing light chicken demo sample')

    const assessmentRequest = {
      items: lightSample.confirmedMeal.items,
      unknownHandling: 'PROMPT',
      modelVersion: OFFLINE_DEMO_MODEL_VERSION
    }
    const beforeSettings = await requestJson(
      '/api/assess-meal',
      jsonInit('POST', assessmentRequest)
    )
    expect(beforeSettings.response.status).toBe(200)
    const baselineAssessment = mealAssessmentSchema.parse(beforeSettings.body)

    const changedSettings = {
      goalDirection: 'MAINTAIN' as const,
      dailyCalorieMin: originalProfile.dailyCalorieMin + 10_000,
      dailyCalorieMax: originalProfile.dailyCalorieMax + 10_000
    }
    const settingUpdate = await requestJson(
      '/api/profile',
      jsonInit('PATCH', changedSettings)
    )
    expect(settingUpdate.response.status).toBe(200)
    expect(demoProfileSchema.parse(settingUpdate.body)).toMatchObject(
      changedSettings
    )

    const afterSettings = await requestJson(
      '/api/assess-meal',
      jsonInit('POST', assessmentRequest)
    )
    expect(afterSettings.response.status).toBe(200)
    const changedAssessment = mealAssessmentSchema.parse(afterSettings.body)
    expect(changedAssessment.mealBudget).toBeGreaterThan(
      baselineAssessment.mealBudget
    )

    await restoreProfile(originalProfile)

    const savedRecords: MealRecord[] = []
    for (const sample of DEMO_MEAL_SAMPLES) {
      const clientRequestId = crypto.randomUUID()
      createdClientRequestIds.add(clientRequestId)
      const request = buildDemoMealRecordRequest(sample, clientRequestId)
      const firstSave = await requestJson(
        '/api/meal-records',
        jsonInit('POST', request)
      )
      expect(firstSave.response.status).toBe(201)
      const saved = mealRecordSchema.parse(firstSave.body)
      createdRecordIds.push(saved.id)
      savedRecords.push(saved)
      expect(saved.isDemo).toBe(true)

      const repeatedSave = await requestJson(
        '/api/meal-records',
        jsonInit('POST', request)
      )
      expect(repeatedSave.response.status).toBe(200)
      expect(mealRecordSchema.parse(repeatedSave.body).id).toBe(saved.id)
    }

    const ordinaryClientRequestId = crypto.randomUUID()
    createdClientRequestIds.add(ordinaryClientRequestId)
    const ordinaryRequest = {
      ...buildDemoMealRecordRequest(
        DEMO_MEAL_SAMPLES[0]!,
        ordinaryClientRequestId
      ),
      isDemo: false
    }
    const ordinarySave = await requestJson(
      '/api/meal-records',
      jsonInit('POST', ordinaryRequest)
    )
    expect(ordinarySave.response.status).toBe(201)
    const ordinaryRecord = mealRecordSchema.parse(ordinarySave.body)
    createdRecordIds.push(ordinaryRecord.id)
    expect(ordinaryRecord.isDemo).toBe(false)

    const withTemporaryRecords = await getRecords()
    for (const saved of [...savedRecords, ordinaryRecord]) {
      expect(recordIds(withTemporaryRecords)).toContain(saved.id)
    }

    for (const day of withTemporaryRecords.days) {
      expect(day.summary).toEqual(
        day.records.reduce(
          (summary, record) => ({
            calorieMin:
              summary.calorieMin + record.assessment.calorieRange.min,
            calorieMax:
              summary.calorieMax + record.assessment.calorieRange.max
          }),
          { calorieMin: 0, calorieMax: 0 }
        )
      )
    }

    for (const id of [...createdRecordIds]) {
      expect(await deleteRecord(id)).toBe(204)
      createdRecordIds.splice(createdRecordIds.indexOf(id), 1)
    }

    expect(recordIds(await getRecords())).toEqual(originalRecordIds)
  } finally {
    let cleanupRecordIds = [...createdRecordIds]
    try {
      const currentRecords = await getRecords()
      cleanupRecordIds = [
        ...new Set([
          ...cleanupRecordIds,
          ...currentRecords.days.flatMap((day) =>
            day.records
              .filter(({ clientRequestId }) =>
                createdClientRequestIds.has(clientRequestId)
              )
              .map(({ id }) => id)
          )
        ])
      ]
    } catch {
      // Fall back to the record IDs already captured before the failure.
    }

    for (const id of cleanupRecordIds) {
      const status = await deleteRecord(id)
      if (status !== 204 && status !== 404) {
        throw new Error(`Failed to clean temporary record ${id}: ${status}`)
      }
    }
    await restoreProfile(originalProfile)
  }
})
