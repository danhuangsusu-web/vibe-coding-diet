import {
  confirmedMealSchema,
  createMealRecordRequestSchema,
  mealAssessmentSchema,
  parsedMealSchema
} from '@food-sense/shared'
import { assessMeal } from '@food-sense/nutrition'
import { describe, expect, it } from 'vitest'

import {
  buildDemoMealRecordRequest,
  DEMO_MEAL_SAMPLES,
  OFFLINE_DEMO_MODEL_VERSION
} from './demo-meals'

const REQUEST_IDS = [
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000011'
]

describe('offline demo meal samples', () => {
  it('defines exactly two samples using the shared contracts', () => {
    expect(DEMO_MEAL_SAMPLES).toHaveLength(2)
    expect(DEMO_MEAL_SAMPLES.map(({ id }) => id)).toEqual([
      'northeast-combo',
      'light-chicken-set'
    ])

    for (const sample of DEMO_MEAL_SAMPLES) {
      expect(parsedMealSchema.safeParse(sample.parsedMeal).success).toBe(true)
      expect(confirmedMealSchema.safeParse(sample.confirmedMeal).success).toBe(
        true
      )
      expect(
        mealAssessmentSchema.safeParse(sample.expectedAssessment).success
      ).toBe(true)
    }
  })

  it('keeps each expected assessment synchronized with the nutrition rules', () => {
    for (const sample of DEMO_MEAL_SAMPLES) {
      const result = assessMeal({
        items: sample.confirmedMeal.items,
        ...sample.assessmentContext,
        modelVersion: OFFLINE_DEMO_MODEL_VERSION
      })

      expect(result.status).toBe('ASSESSED')
      if (result.status !== 'ASSESSED') continue

      expect(result.assessment).toEqual(sample.expectedAssessment)
    }
  })

  it('uses internally consistent ranges and two distinct ratings', () => {
    expect(
      DEMO_MEAL_SAMPLES.map(({ expectedAssessment }) => ({
        calorieRange: expectedAssessment.calorieRange,
        mealBudget: expectedAssessment.mealBudget,
        rating: expectedAssessment.rating
      }))
    ).toEqual([
      {
        calorieRange: { min: 550, max: 950 },
        mealBudget: 800,
        rating: 'YELLOW'
      },
      {
        calorieRange: { min: 290, max: 500 },
        mealBudget: 800,
        rating: 'GREEN'
      }
    ])
  })

  it('maps each cooking description in the light sample to its semantic tag', () => {
    const lightSample = DEMO_MEAL_SAMPLES.find(
      ({ id }) => id === 'light-chicken-set'
    )

    expect(
      lightSample?.parsedMeal.items.map(({ displayName, cookingMethods }) => ({
        displayName,
        cookingMethods
      }))
    ).toEqual([
      { displayName: '白灼时蔬', cookingMethods: ['BLANCHED'] },
      { displayName: '水煮鸡胸', cookingMethods: ['BOILED'] },
      { displayName: '小份米饭', cookingMethods: ['STEAMED'] }
    ])
  })

  it('avoids the prototype-only single value and conflicting range', () => {
    const ranges = DEMO_MEAL_SAMPLES.map(
      ({ expectedAssessment }) => expectedAssessment.calorieRange
    )

    expect(ranges).not.toContainEqual({ min: 1290, max: 1290 })
    expect(ranges).not.toContainEqual({ min: 650, max: 850 })
  })

  it('uses daytime Asia/Shanghai timestamps for every sample', () => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      hourCycle: 'h23'
    })

    for (const sample of DEMO_MEAL_SAMPLES) {
      expect(Number(formatter.format(sample.assessmentContext.now))).toBeGreaterThanOrEqual(
        5
      )
    }
  })

  it('derives the P01 and P05 summary and remaining range from saved samples', () => {
    const summary = DEMO_MEAL_SAMPLES.reduce(
      (total, sample) => ({
        min: total.min + sample.expectedAssessment.calorieRange.min,
        max: total.max + sample.expectedAssessment.calorieRange.max
      }),
      { min: 0, max: 0 }
    )
    const dailyRange =
      DEMO_MEAL_SAMPLES[0]?.assessmentContext.dailyCalorieRange

    expect(dailyRange).toEqual({ min: 1400, max: 1600 })
    expect(summary).toEqual({ min: 840, max: 1450 })
    expect({
      min: Math.max(0, (dailyRange?.min ?? 0) - summary.max),
      max: Math.max(0, (dailyRange?.max ?? 0) - summary.min)
    }).toEqual({ min: 0, max: 760 })
  })

  it.each(DEMO_MEAL_SAMPLES.map((sample, index) => [sample, index] as const))(
    'builds an isDemo save request for %s',
    (sample, index) => {
      const request = buildDemoMealRecordRequest(
        sample,
        REQUEST_IDS[index] ?? REQUEST_IDS[0]
      )

      expect(createMealRecordRequestSchema.safeParse(request).success).toBe(
        true
      )
      expect(request).toMatchObject({
        sourceType: 'TEXT',
        sourceText: sample.input.sourceText,
        isDemo: true,
        modelVersion: OFFLINE_DEMO_MODEL_VERSION
      })
    }
  )
})
