import { describe, expect, it } from 'vitest'

import {
  apiErrorCodeSchema,
  apiErrorResponseSchema,
  apiErrorSchema,
  assessMealRequestSchema,
  calorieRangeSchema,
  confirmedMealSchema,
  createMealRecordRequestSchema,
  demoProfileSchema,
  mealAssessmentSchema,
  mealItemSchema,
  mealRecordSchema,
  mealRecordsResponseSchema,
  parsedMealSchema,
  updateDemoProfileRequestSchema
} from './index'

const parsedItem = {
  displayName: 'Steamed rice',
  ingredients: ['RICE'],
  otherIngredients: [],
  cookingMethods: ['STEAMED'],
  otherCookingMethods: [],
  portionLevel: 'regular',
  uncertainties: [],
  confidence: 0.95
}

const confirmedItem = {
  displayName: parsedItem.displayName,
  ingredients: parsedItem.ingredients,
  otherIngredients: parsedItem.otherIngredients,
  cookingMethods: parsedItem.cookingMethods,
  otherCookingMethods: parsedItem.otherCookingMethods,
  portionLevel: parsedItem.portionLevel,
  uncertainties: parsedItem.uncertainties,
  wasManuallyAdjusted: false
}

const assessment = {
  items: [confirmedItem],
  calorieRange: { min: 230, max: 280 },
  mealBudget: 500,
  rating: 'GREEN',
  ratingLabel: 'Fits the current meal budget',
  reason: 'The estimated upper bound is within the reference budget.',
  advice: [{ id: 'KEEP_CURRENT', text: 'Keep the current choice.' }],
  uncertainties: [],
  ruleVersion: 'nutrition-v1'
}

const mealRecord = {
  id: 'meal_1',
  profileId: 'demo_profile',
  clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
  sourceType: 'TEXT',
  sourceText: 'A regular serving of steamed rice',
  assessment,
  isDemo: true,
  createdAt: '2026-09-15T12:00:00+08:00'
}

describe('meal contracts', () => {
  it('parses controlled meal tags and fills optional arrays', () => {
    const result = mealItemSchema.parse({
      displayName: 'Steamed rice',
      ingredients: ['RICE'],
      cookingMethods: ['STEAMED'],
      portionLevel: 'regular',
      confidence: 0.95
    })

    expect(result.otherIngredients).toEqual([])
    expect(result.otherCookingMethods).toEqual([])
    expect(result.uncertainties).toEqual([])
    expect(parsedMealSchema.parse({ items: [parsedItem] }).items).toHaveLength(1)
  })

  it('rejects empty meals, invalid portions, and invalid confidence', () => {
    expect(parsedMealSchema.safeParse({ items: [] }).success).toBe(false)
    expect(
      mealItemSchema.safeParse({
        ...parsedItem,
        portionLevel: 'extra-large'
      }).success
    ).toBe(false)
    expect(
      mealItemSchema.safeParse({
        ...parsedItem,
        confidence: 1.1
      }).success
    ).toBe(false)
  })

  it('requires controlled tags and descriptions for OTHER values', () => {
    expect(
      mealItemSchema.safeParse({
        ...parsedItem,
        ingredients: ['potato']
      }).success
    ).toBe(false)
    expect(
      mealItemSchema.safeParse({
        ...parsedItem,
        ingredients: ['OTHER']
      }).success
    ).toBe(false)
    expect(
      mealItemSchema.safeParse({
        ...parsedItem,
        ingredients: ['OTHER'],
        otherIngredients: ['lotus root']
      }).success
    ).toBe(true)
    expect(
      mealItemSchema.safeParse({
        ...parsedItem,
        cookingMethods: ['OTHER']
      }).success
    ).toBe(false)
    expect(
      mealItemSchema.safeParse({
        ...parsedItem,
        cookingMethods: ['OTHER'],
        otherCookingMethods: ['air fried']
      }).success
    ).toBe(true)
  })

  it('parses a confirmed meal without carrying AI confidence', () => {
    const result = confirmedMealSchema.parse({ items: [confirmedItem] })

    expect(result.items[0]?.wasManuallyAdjusted).toBe(false)
    expect(result.items[0]).not.toHaveProperty('confidence')
  })

  it('rejects empty confirmed meals and names longer than 30 characters', () => {
    expect(confirmedMealSchema.safeParse({ items: [] }).success).toBe(false)
    expect(
      confirmedMealSchema.safeParse({
        items: [{ ...confirmedItem, displayName: 'x'.repeat(31) }]
      }).success
    ).toBe(false)
  })
})

describe('profile and calorie contracts', () => {
  it('parses a valid demo profile and profile update', () => {
    const profile = demoProfileSchema.parse({
      id: 'demo_profile',
      name: 'Demo User',
      goalDirection: 'FAT_LOSS',
      dailyCalorieMin: 1400,
      dailyCalorieMax: 1600,
      createdAt: '2026-09-15T08:00:00+08:00',
      updatedAt: '2026-09-15T08:00:00+08:00'
    })

    expect(profile.goalDirection).toBe('FAT_LOSS')
    expect(
      updateDemoProfileRequestSchema.safeParse({
        goalDirection: 'MAINTAIN',
        dailyCalorieMin: 1600,
        dailyCalorieMax: 1800
      }).success
    ).toBe(true)
  })

  it('rejects reversed ranges, equal daily limits, and non-positive limits', () => {
    expect(calorieRangeSchema.safeParse({ min: 500, max: 400 }).success).toBe(
      false
    )
    expect(
      updateDemoProfileRequestSchema.safeParse({
        goalDirection: 'MAINTAIN',
        dailyCalorieMin: 1600,
        dailyCalorieMax: 1600
      }).success
    ).toBe(false)
    expect(
      updateDemoProfileRequestSchema.safeParse({
        goalDirection: 'MAINTAIN',
        dailyCalorieMin: 0,
        dailyCalorieMax: 1600
      }).success
    ).toBe(false)
  })
})

describe('assessment and record contracts', () => {
  it('accepts confirmed items and defaults unknown handling to prompt', () => {
    const result = assessMealRequestSchema.parse({ items: [confirmedItem] })

    expect(result.unknownHandling).toBe('PROMPT')
    expect(result.items[0]).not.toHaveProperty('confidence')
  })

  it('rejects unconfirmed items and unsupported unknown handling', () => {
    expect(
      assessMealRequestSchema.safeParse({ items: [parsedItem] }).success
    ).toBe(false)
    expect(
      assessMealRequestSchema.safeParse({
        items: [confirmedItem],
        unknownHandling: 'GUESS'
      }).success
    ).toBe(false)
  })

  it('parses an assessment with stable advice and a required rule version', () => {
    const result = mealAssessmentSchema.parse(assessment)

    expect(result.advice[0]?.id).toBe('KEEP_CURRENT')
    expect(result.ruleVersion).toBe('nutrition-v1')
  })

  it('rejects invalid assessment ranges and missing rule versions', () => {
    expect(
      mealAssessmentSchema.safeParse({
        ...assessment,
        calorieRange: { min: 300, max: 200 }
      }).success
    ).toBe(false)
    expect(
      mealAssessmentSchema.safeParse({
        ...assessment,
        advice: [assessment.advice[0], assessment.advice[0]]
      }).success
    ).toBe(false)
    expect(
      mealAssessmentSchema.safeParse({
        ...assessment,
        ruleVersion: undefined
      }).success
    ).toBe(false)
  })

  it('accepts isDemo and requires a UUID clientRequestId', () => {
    expect(mealRecordSchema.parse(mealRecord).isDemo).toBe(true)
    expect(
      createMealRecordRequestSchema.safeParse({
        clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
        sourceType: 'TEXT',
        sourceText: 'A regular serving of steamed rice',
        items: [confirmedItem],
        isDemo: true,
        clientAssessmentSnapshot: assessment
      }).success
    ).toBe(true)
    expect(
      createMealRecordRequestSchema.safeParse({
        clientRequestId: 'not-a-uuid',
        sourceType: 'TEXT',
        sourceText: 'A regular serving of steamed rice',
        items: [confirmedItem]
      }).success
    ).toBe(false)
  })

  it('defaults record unknown handling and accepts explicit fallback', () => {
    const baseRequest = {
      clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
      sourceType: 'TEXT' as const,
      sourceText: 'A regular serving of steamed rice',
      items: [confirmedItem]
    }

    expect(
      createMealRecordRequestSchema.parse(baseRequest).unknownHandling
    ).toBe('PROMPT')
    expect(
      createMealRecordRequestSchema.parse({
        ...baseRequest,
        unknownHandling: 'CONSERVATIVE_FALLBACK'
      }).unknownHandling
    ).toBe('CONSERVATIVE_FALLBACK')
  })

  it('keeps sourceType and sourceText consistent', () => {
    expect(
      createMealRecordRequestSchema.safeParse({
        clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
        sourceType: 'TEXT',
        items: [confirmedItem]
      }).success
    ).toBe(false)
    expect(
      createMealRecordRequestSchema.safeParse({
        clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
        sourceType: 'IMAGE',
        sourceText: 'This should not be present',
        items: [confirmedItem]
      }).success
    ).toBe(false)
    expect(
      mealRecordSchema.safeParse({
        ...mealRecord,
        sourceType: 'IMAGE',
        sourceText: null
      }).success
    ).toBe(true)
    expect(
      mealRecordSchema.safeParse({ ...mealRecord, sourceText: null }).success
    ).toBe(false)
  })

  it('excludes mealType from strict P0 record contracts', () => {
    expect(
      mealRecordSchema.safeParse({ ...mealRecord, mealType: 'LUNCH' }).success
    ).toBe(false)
  })

  it('parses grouped history and rejects reversed daily summaries', () => {
    expect(
      mealRecordsResponseSchema.safeParse({
        todayDate: '2026-09-15',
        serverTime: '2026-09-15T12:00:00.000Z',
        days: [
          {
            date: '2026-09-15',
            summary: { calorieMin: 230, calorieMax: 280 },
            records: [mealRecord]
          }
        ]
      }).success
    ).toBe(true)
    expect(
      mealRecordsResponseSchema.safeParse({
        todayDate: '2026-09-15',
        serverTime: '2026-09-15T12:00:00.000Z',
        days: [
          {
            date: '2026-09-15',
            summary: { calorieMin: 300, calorieMax: 200 },
            records: [mealRecord]
          }
        ]
      }).success
    ).toBe(false)

    expect(
      mealRecordsResponseSchema.safeParse({
        todayDate: '2026-09-15',
        days: []
      }).success
    ).toBe(false)
    expect(
      mealRecordsResponseSchema.safeParse({
        todayDate: '2026-09-15',
        serverTime: 'not-a-date',
        days: []
      }).success
    ).toBe(false)
  })

  it('limits history responses to 30 days and 50 records', () => {
    const day = {
      date: '2026-09-15',
      summary: { calorieMin: 230, calorieMax: 280 },
      records: [mealRecord]
    }

    expect(
      mealRecordsResponseSchema.safeParse({
        todayDate: '2026-09-15',
        serverTime: '2026-09-15T12:00:00.000Z',
        days: Array.from({ length: 31 }, () => day)
      }).success
    ).toBe(false)
    expect(
      mealRecordsResponseSchema.safeParse({
        todayDate: '2026-09-15',
        serverTime: '2026-09-15T12:00:00.000Z',
        days: [{ ...day, records: Array.from({ length: 51 }, () => mealRecord) }]
      }).success
    ).toBe(false)
  })
})

describe('API error contracts', () => {
  const retryability = {
    AI_NOT_CONFIGURED: false,
    AI_TIMEOUT: true,
    AI_INVALID_OUTPUT: false,
    NO_MEAL_DETECTED: false,
    IMAGE_TOO_LARGE: false,
    IMAGE_UNSUPPORTED: false,
    IMAGE_COMPRESS_FAILED: true,
    PROFILE_INVALID_RANGE: false,
    DB_UNAVAILABLE: true,
    MEAL_NOT_FOUND: false,
    VALIDATION_FAILED: false,
    UNKNOWN_DISH: false
  } as const

  it('covers every documented error code with fixed retryability', () => {
    expect(apiErrorCodeSchema.options).toHaveLength(12)

    for (const [code, retryable] of Object.entries(retryability)) {
      expect(
        apiErrorSchema.safeParse({ code, message: 'Readable error', retryable })
          .success
      ).toBe(true)
      expect(
        apiErrorSchema.safeParse({
          code,
          message: 'Readable error',
          retryable: !retryable
        }).success
      ).toBe(false)
    }
  })

  it('rejects undocumented errors and empty messages', () => {
    expect(
      apiErrorSchema.safeParse({
        code: 'UNKNOWN_ERROR',
        message: 'Readable error',
        retryable: false
      }).success
    ).toBe(false)
    expect(
      apiErrorSchema.safeParse({
        code: 'AI_TIMEOUT',
        message: ' ',
        retryable: true
      }).success
    ).toBe(false)
  })

  it('wraps errors in the shared API response shape', () => {
    expect(
      apiErrorResponseSchema.safeParse({
        error: {
          code: 'DB_UNAVAILABLE',
          message: 'Data is temporarily unavailable.',
          retryable: true
        }
      }).success
    ).toBe(true)
    expect(
      apiErrorResponseSchema.safeParse({
        code: 'DB_UNAVAILABLE',
        message: 'Data is temporarily unavailable.',
        retryable: true
      }).success
    ).toBe(false)
  })
})
