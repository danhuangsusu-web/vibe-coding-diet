import type { Prisma, PrismaClient } from '@prisma/client'
import {
  demoProfileSchema,
  type DemoProfile,
  type UpdateDemoProfileRequest
} from '@food-sense/shared'

import { DEMO_PROFILE_ID } from './demo-profile.mjs'

export const demoProfileSelect = {
  id: true,
  name: true,
  goalDirection: true,
  dailyCalorieMin: true,
  dailyCalorieMax: true,
  createdAt: true,
  updatedAt: true
} as const

export type ProfileRow = Prisma.DemoProfileGetPayload<{
  select: typeof demoProfileSelect
}>

export type ProfileDatabase = Pick<PrismaClient, 'demoProfile'>

export class DemoProfileNotFoundError extends Error {
  constructor() {
    super('The fixed demo profile does not exist')
    this.name = 'DemoProfileNotFoundError'
  }
}

function serializeProfile(profile: ProfileRow): DemoProfile {
  return demoProfileSchema.parse({
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  })
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  )
}

export async function getDemoProfile(
  database: ProfileDatabase
): Promise<DemoProfile | null> {
  const profile = await database.demoProfile.findUnique({
    where: { id: DEMO_PROFILE_ID },
    select: demoProfileSelect
  })

  return profile ? serializeProfile(profile) : null
}

export async function updateDemoProfile(
  database: ProfileDatabase,
  update: UpdateDemoProfileRequest
): Promise<DemoProfile> {
  try {
    const profile = await database.demoProfile.update({
      where: { id: DEMO_PROFILE_ID },
      data: update,
      select: demoProfileSelect
    })

    return serializeProfile(profile)
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw new DemoProfileNotFoundError()
    }

    throw error
  }
}
