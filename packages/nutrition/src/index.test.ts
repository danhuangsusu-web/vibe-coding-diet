import { describe, expect, it } from 'vitest'

import { rateMeal } from './index'

describe('nutrition test baseline', () => {
  it('executes the existing rating rule', () => {
    expect(rateMeal(400, 500)).toBe('GREEN')
  })
})
