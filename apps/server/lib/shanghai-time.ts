const SHANGHAI_TIME_ZONE = 'Asia/Shanghai'

const shanghaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHANGHAI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function dateParts(date: Date): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(
    shanghaiDateFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)])
  )

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day
  }
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))

  return formatDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  )
}

function startOfShanghaiDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+08:00`)
}

export function getShanghaiDateKey(date: Date): string {
  const { year, month, day } = dateParts(date)
  return formatDateKey(year, month, day)
}

export function getShanghaiDayRange(date: Date): {
  start: Date
  end: Date
} {
  const dateKey = getShanghaiDateKey(date)

  return {
    start: startOfShanghaiDate(dateKey),
    end: startOfShanghaiDate(shiftDateKey(dateKey, 1))
  }
}

export function getRecentShanghaiWindowStart(
  date: Date,
  inclusiveDayCount: number
): Date {
  if (!Number.isInteger(inclusiveDayCount) || inclusiveDayCount <= 0) {
    throw new RangeError('inclusiveDayCount must be a positive integer')
  }

  return startOfShanghaiDate(
    shiftDateKey(getShanghaiDateKey(date), -(inclusiveDayCount - 1))
  )
}
