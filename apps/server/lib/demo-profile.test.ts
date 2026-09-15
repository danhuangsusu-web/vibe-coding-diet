import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DEMO_PROFILE,
  DEMO_PROFILE_ID
} from './demo-profile.mjs'

describe('default demo profile', () => {
  it('uses the approved fictional profile values and stable identifier', () => {
    expect(DEMO_PROFILE_ID).toBe('demo-profile')
    expect(DEFAULT_DEMO_PROFILE).toEqual({
      id: DEMO_PROFILE_ID,
      name: '小苏',
      goalDirection: 'FAT_LOSS',
      dailyCalorieMin: 1400,
      dailyCalorieMax: 1600
    })
  })

  it('defines a valid daily calorie range without sensitive fields', () => {
    expect(DEFAULT_DEMO_PROFILE.dailyCalorieMin).toBeLessThan(
      DEFAULT_DEMO_PROFILE.dailyCalorieMax
    )
    expect(Object.keys(DEFAULT_DEMO_PROFILE)).not.toEqual(
      expect.arrayContaining(['height', 'weight', 'bmi', 'disease'])
    )
  })
})
