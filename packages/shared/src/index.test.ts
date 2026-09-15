import { describe, expect, it } from 'vitest'

import { parsedMealSchema } from './index'

describe('shared test baseline', () => {
  it('parses an existing ParsedMeal contract', () => {
    const result = parsedMealSchema.parse({
      items: [
        {
          displayName: 'Rice',
          ingredients: ['rice'],
          cookingMethods: ['steamed'],
          portionLevel: 'regular',
          confidence: 0.95,
          uncertainties: []
        }
      ]
    })

    expect(result.items).toHaveLength(1)
  })
})
