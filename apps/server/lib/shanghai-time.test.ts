import { describe, expect, it } from 'vitest'

import {
  getRecentShanghaiWindowStart,
  getShanghaiDateKey,
  getShanghaiDayRange
} from './shanghai-time'

describe('Shanghai calendar boundaries', () => {
  it('changes date at midnight in Asia/Shanghai', () => {
    expect(getShanghaiDateKey(new Date('2026-09-14T15:59:59.999Z'))).toBe(
      '2026-09-14'
    )
    expect(getShanghaiDateKey(new Date('2026-09-14T16:00:00.000Z'))).toBe(
      '2026-09-15'
    )
  })

  it('returns an inclusive start and exclusive end for the Shanghai day', () => {
    expect(getShanghaiDayRange(new Date('2026-09-15T04:00:00.000Z'))).toEqual({
      start: new Date('2026-09-14T16:00:00.000Z'),
      end: new Date('2026-09-15T16:00:00.000Z')
    })
  })

  it('starts a 30-day inclusive window 29 calendar days earlier', () => {
    expect(
      getRecentShanghaiWindowStart(new Date('2026-09-15T04:00:00.000Z'), 30)
    ).toEqual(new Date('2026-08-16T16:00:00.000Z'))
  })
})
