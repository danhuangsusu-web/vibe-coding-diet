import type { Prisma, PrismaClient } from '@prisma/client'
import {
  mealRecordSchema,
  mealRecordsResponseSchema,
  type CreateMealRecordRequest,
  type MealRecord,
  type MealRecordsResponse
} from '@food-sense/shared'

import { DEMO_PROFILE_ID } from './demo-profile.mjs'
import { assessConfirmedMeal } from './meal-assessment-service'
import {
  DemoProfileNotFoundError,
  getDemoProfile
} from './profile-service'
import {
  getRecentShanghaiWindowStart,
  getShanghaiDateKey,
  getShanghaiDayRange
} from './shanghai-time'

export const mealRecordSelect = {
  id: true,
  profileId: true,
  clientRequestId: true,
  sourceType: true,
  sourceText: true,
  items: true,
  calorieMin: true,
  calorieMax: true,
  mealBudget: true,
  rating: true,
  ratingLabel: true,
  reason: true,
  adviceIds: true,
  advice: true,
  uncertainties: true,
  isDemo: true,
  modelVersion: true,
  ruleVersion: true,
  createdAt: true
} as const

export type MealRecordRow = Prisma.MealRecordGetPayload<{
  select: typeof mealRecordSelect
}>

export type MealRecordDatabase = Pick<
  PrismaClient,
  'demoProfile' | 'mealRecord'
>

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}

function serializeMealRecord(row: MealRecordRow): MealRecord {
  return mealRecordSchema.parse({
    id: row.id,
    profileId: row.profileId,
    clientRequestId: row.clientRequestId,
    sourceType: row.sourceType,
    sourceText: row.sourceText,
    assessment: {
      items: row.items,
      calorieRange: {
        min: row.calorieMin,
        max: row.calorieMax
      },
      mealBudget: row.mealBudget,
      rating: row.rating,
      ratingLabel: row.ratingLabel,
      reason: row.reason,
      advice: row.advice,
      uncertainties: row.uncertainties,
      ruleVersion: row.ruleVersion,
      ...(row.modelVersion ? { modelVersion: row.modelVersion } : {})
    },
    isDemo: row.isDemo,
    createdAt: row.createdAt.toISOString()
  })
}

async function findByClientRequestId(
  database: MealRecordDatabase,
  clientRequestId: string
): Promise<MealRecord | null> {
  const row = await database.mealRecord.findUnique({
    where: { clientRequestId },
    select: mealRecordSelect
  })

  return row ? serializeMealRecord(row) : null
}

export async function createMealRecord(
  database: MealRecordDatabase,
  request: CreateMealRecordRequest,
  now: Date
): Promise<{ record: MealRecord; created: boolean }> {
  const existing = await findByClientRequestId(
    database,
    request.clientRequestId
  )

  if (existing) {
    return { record: existing, created: false }
  }

  const assessment = await assessConfirmedMeal(
    database,
    {
      items: request.items,
      unknownHandling: request.unknownHandling,
      ...(request.modelVersion
        ? { modelVersion: request.modelVersion }
        : {})
    },
    now
  )

  try {
    const row = await database.mealRecord.create({
      data: {
        profileId: DEMO_PROFILE_ID,
        clientRequestId: request.clientRequestId,
        sourceType: request.sourceType,
        sourceText: request.sourceText ?? null,
        items: assessment.items,
        calorieMin: assessment.calorieRange.min,
        calorieMax: assessment.calorieRange.max,
        mealBudget: assessment.mealBudget,
        rating: assessment.rating,
        ratingLabel: assessment.ratingLabel,
        reason: assessment.reason,
        adviceIds: assessment.advice.map(({ id }) => id),
        advice: assessment.advice,
        uncertainties: assessment.uncertainties,
        isDemo: request.isDemo,
        modelVersion: assessment.modelVersion ?? null,
        ruleVersion: assessment.ruleVersion
      },
      select: mealRecordSelect
    })

    return { record: serializeMealRecord(row), created: true }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentExisting = await findByClientRequestId(
        database,
        request.clientRequestId
      )

      if (concurrentExisting) {
        return { record: concurrentExisting, created: false }
      }
    }

    throw error
  }
}

export async function getRecentMealRecords(
  database: MealRecordDatabase,
  now: Date
): Promise<MealRecordsResponse> {
  const profile = await getDemoProfile(database)

  if (!profile) {
    throw new DemoProfileNotFoundError()
  }

  const currentDay = getShanghaiDayRange(now)
  const rows = await database.mealRecord.findMany({
    where: {
      profileId: DEMO_PROFILE_ID,
      createdAt: {
        gte: getRecentShanghaiWindowStart(now, 30),
        lt: currentDay.end
      }
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    select: mealRecordSelect
  })
  const days = new Map<
    string,
    {
      date: string
      summary: { calorieMin: number; calorieMax: number }
      records: MealRecord[]
    }
  >()

  for (const row of rows) {
    const date = getShanghaiDateKey(row.createdAt)
    const record = serializeMealRecord(row)
    const day = days.get(date) ?? {
      date,
      summary: { calorieMin: 0, calorieMax: 0 },
      records: []
    }

    day.summary.calorieMin += record.assessment.calorieRange.min
    day.summary.calorieMax += record.assessment.calorieRange.max
    day.records.push(record)
    days.set(date, day)
  }

  return mealRecordsResponseSchema.parse({ days: [...days.values()] })
}

export async function deleteMealRecord(
  database: MealRecordDatabase,
  id: string
): Promise<boolean> {
  const result = await database.mealRecord.deleteMany({
    where: { id, profileId: DEMO_PROFILE_ID }
  })

  return result.count === 1
}
