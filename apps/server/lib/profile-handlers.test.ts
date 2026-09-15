import { apiErrorResponseSchema, demoProfileSchema } from '@food-sense/shared'
import { describe, expect, it, vi } from 'vitest'

import { DEMO_PROFILE_ID } from './demo-profile.mjs'
import { createProfileHandlers } from './profile-handlers'
import type { ProfileDatabase, ProfileRow } from './profile-service'

const initialProfile: ProfileRow = {
  id: DEMO_PROFILE_ID,
  name: '小苏',
  goalDirection: 'FAT_LOSS',
  dailyCalorieMin: 1400,
  dailyCalorieMax: 1600,
  createdAt: new Date('2026-09-15T08:00:00.000Z'),
  updatedAt: new Date('2026-09-15T08:00:00.000Z')
}

function createDatabase(initial: ProfileRow | null = initialProfile) {
  let current = initial
  const findUnique = vi.fn(async () => current)
  const update = vi.fn(
    async ({ data }: { data: Record<string, unknown> }) => {
      if (!current) {
        throw Object.assign(new Error('Record not found'), { code: 'P2025' })
      }

      current = {
        ...current,
        ...data,
        updatedAt: new Date('2026-09-15T09:00:00.000Z')
      } as ProfileRow

      return current
    }
  )
  const database = {
    demoProfile: { findUnique, update }
  } as unknown as ProfileDatabase

  return {
    database,
    findUnique,
    getCurrent: () => current,
    update
  }
}

function patchRequest(body: unknown): Request {
  return new Request('http://localhost/api/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('profile handlers', () => {
  it('reads only the fixed demo profile and returns the shared contract', async () => {
    const { database, findUnique } = createDatabase()
    const { GET } = createProfileHandlers(database)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(demoProfileSchema.safeParse(body).success).toBe(true)
    expect(body).toEqual({
      ...initialProfile,
      createdAt: initialProfile.createdAt.toISOString(),
      updatedAt: initialProfile.updatedAt.toISOString()
    })
    expect(Object.keys(body)).not.toEqual(
      expect.arrayContaining(['height', 'weight', 'bmi', 'disease'])
    )
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DEMO_PROFILE_ID } })
    )
  })

  it('updates only the approved fields and returns the persisted profile', async () => {
    const { database, update } = createDatabase()
    const { GET, PATCH } = createProfileHandlers(database)
    const request = patchRequest({
      goalDirection: 'MAINTAIN',
      dailyCalorieMin: 1600,
      dailyCalorieMax: 1800
    })

    const patchResponse = await PATCH(request)
    const getResponse = await GET()

    expect(patchResponse.status).toBe(200)
    expect(await patchResponse.json()).toMatchObject({
      id: DEMO_PROFILE_ID,
      name: '小苏',
      goalDirection: 'MAINTAIN',
      dailyCalorieMin: 1600,
      dailyCalorieMax: 1800
    })
    expect(await getResponse.json()).toMatchObject({
      goalDirection: 'MAINTAIN',
      dailyCalorieMin: 1600,
      dailyCalorieMax: 1800
    })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DEMO_PROFILE_ID },
        data: {
          goalDirection: 'MAINTAIN',
          dailyCalorieMin: 1600,
          dailyCalorieMax: 1800
        }
      })
    )
  })

  it.each([
    { dailyCalorieMin: 1600, dailyCalorieMax: 1600 },
    { dailyCalorieMin: 1800, dailyCalorieMax: 1600 },
    { dailyCalorieMin: 0, dailyCalorieMax: 1600 },
    { dailyCalorieMin: 1400.5, dailyCalorieMax: 1600 }
  ])('rejects an invalid daily range without changing the profile: %o', async (range) => {
    const { database, getCurrent, update } = createDatabase()
    const { PATCH } = createProfileHandlers(database)

    const response = await PATCH(
      patchRequest({ goalDirection: 'FAT_LOSS', ...range })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('PROFILE_INVALID_RANGE')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
    expect(update).not.toHaveBeenCalled()
    expect(getCurrent()).toEqual(initialProfile)
  })

  it.each([
    {
      goalDirection: 'UNKNOWN',
      dailyCalorieMin: 1400,
      dailyCalorieMax: 1600
    },
    {
      goalDirection: 'FAT_LOSS',
      dailyCalorieMin: 1400,
      dailyCalorieMax: 1600,
      name: '不允许修改'
    }
  ])('rejects fields outside the shared update contract: %o', async (payload) => {
    const { database, update } = createDatabase()
    const { PATCH } = createProfileHandlers(database)

    const response = await PATCH(patchRequest(payload))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON without attempting an update', async () => {
    const { database, update } = createDatabase()
    const { PATCH } = createProfileHandlers(database)
    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{'
    })

    const response = await PATCH(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(update).not.toHaveBeenCalled()
  })

  it('returns an explicit error when the fixed profile is missing', async () => {
    const { database } = createDatabase(null)
    const { GET } = createProfileHandlers(database)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toEqual({
      code: 'DB_UNAVAILABLE',
      message: '演示资料尚未初始化，请先运行 pnpm db:seed。',
      retryable: true
    })
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
  })

  it('returns the same explicit error when an update finds no fixed profile', async () => {
    const { database } = createDatabase(null)
    const { PATCH } = createProfileHandlers(database)

    const response = await PATCH(
      patchRequest({
        goalDirection: 'MAINTAIN',
        dailyCalorieMin: 1600,
        dailyCalorieMax: 1800
      })
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toEqual({
      code: 'DB_UNAVAILABLE',
      message: '演示资料尚未初始化，请先运行 pnpm db:seed。',
      retryable: true
    })
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
  })

  it('hides database failure details behind the unified error response', async () => {
    const { database, findUnique } = createDatabase()
    findUnique.mockRejectedValueOnce(
      new Error('secret database connection string and stack')
    )
    const { GET } = createProfileHandlers(database)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toEqual({
      code: 'DB_UNAVAILABLE',
      message: '数据暂时无法读取或保存，请稍后重试。',
      retryable: true
    })
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
  })

  it('hides update failure details behind the unified error response', async () => {
    const { database, update } = createDatabase()
    update.mockRejectedValueOnce(
      new Error('secret database connection string and stack')
    )
    const { PATCH } = createProfileHandlers(database)

    const response = await PATCH(
      patchRequest({
        goalDirection: 'MAINTAIN',
        dailyCalorieMin: 1600,
        dailyCalorieMax: 1800
      })
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toEqual({
      code: 'DB_UNAVAILABLE',
      message: '数据暂时无法读取或保存，请稍后重试。',
      retryable: true
    })
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true)
  })
})
