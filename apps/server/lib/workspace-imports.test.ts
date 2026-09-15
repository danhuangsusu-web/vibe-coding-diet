import { describe, expect, it } from 'vitest'

import { rateMeal } from '@food-sense/nutrition'
import { parsedMealSchema } from '@food-sense/shared'

describe('server test baseline', () => {
  it('resolves workspace TypeScript source packages', () => {
    const parsed = parsedMealSchema.parse({
      items: [
        {
          displayName: 'Tofu',
          ingredients: ['TOFU'],
          cookingMethods: ['BOILED'],
          portionLevel: 'small',
          confidence: 0.9,
          uncertainties: []
        }
      ]
    })

    expect(parsed.items[0]?.displayName).toBe('Tofu')
    expect(rateMeal(500, 500)).toBe('YELLOW')
  })
})
