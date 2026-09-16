import type { PrismaClient } from '@prisma/client'
import type {
  AssessMealRequest,
  MealAssessment
} from '@food-sense/shared'
import { assessMeal } from '@food-sense/nutrition'

import { DEMO_PROFILE_ID } from './demo-profile.mjs'
import {
  DemoProfileNotFoundError,
  getDemoProfile
} from './profile-service'
import { getShanghaiDayRange } from './shanghai-time'

export type MealAssessmentDatabase = Pick<
  PrismaClient,
  'demoProfile' | 'mealRecord'
>

export class UnknownDishError extends Error {
  constructor() {
    super('Confirmed meal still contains unknown ingredients or methods')
    this.name = 'UnknownDishError'
  }
}

export async function assessConfirmedMeal(
  database: MealAssessmentDatabase,
  request: AssessMealRequest,
  now: Date
): Promise<MealAssessment> {
  const profile = await getDemoProfile(database)

  if (!profile) {
    throw new DemoProfileNotFoundError()
  }

  const today = getShanghaiDayRange(now)
  const todayRows = await database.mealRecord.findMany({
    where: {
      profileId: DEMO_PROFILE_ID,
      createdAt: { gte: today.start, lt: today.end }
    },
    select: { calorieMin: true, calorieMax: true }
  })
  const result = assessMeal({
    items: request.items,
    dailyCalorieRange: {
      min: profile.dailyCalorieMin,
      max: profile.dailyCalorieMax
    },
    todayMealRanges: todayRows.map(({ calorieMin, calorieMax }) => ({
      min: calorieMin,
      max: calorieMax
    })),
    now,
    unknownHandling: request.unknownHandling,
    ...(request.modelVersion ? { modelVersion: request.modelVersion } : {})
  })

  if (result.status === 'NEEDS_MORE_INFO') {
    throw new UnknownDishError()
  }

  return result.assessment
}
