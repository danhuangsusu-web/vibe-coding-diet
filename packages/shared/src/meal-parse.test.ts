import { describe, expect, it } from 'vitest'

import { textMealParseRequestSchema } from './meal'

describe('text meal parse request', () => {
  it('accepts trimmed text up to the P02 limit', () => {
    expect(
      textMealParseRequestSchema.parse({
        sourceType: 'TEXT',
        sourceText: '  番茄炒蛋和米饭  '
      })
    ).toEqual({ sourceType: 'TEXT', sourceText: '番茄炒蛋和米饭' })
  })

  it.each([
    { sourceType: 'TEXT', sourceText: '' },
    { sourceType: 'TEXT', sourceText: ' '.repeat(3) },
    { sourceType: 'TEXT', sourceText: '饭'.repeat(101) },
    { sourceType: 'IMAGE', sourceText: '米饭' },
    { sourceType: 'TEXT', sourceText: '米饭', unexpected: true }
  ])('rejects invalid or out-of-scope input %#', (input) => {
    expect(textMealParseRequestSchema.safeParse(input).success).toBe(false)
  })
})
