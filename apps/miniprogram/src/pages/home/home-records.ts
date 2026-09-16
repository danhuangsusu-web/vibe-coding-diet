import type {
  MealRating,
  MealRecord,
  MealRecordsResponse
} from '@food-sense/shared'

export type RecordRatingTone = 'success' | 'warning' | 'danger'

export interface RecordRatingPresentation {
  icon: string
  label: string
  tone: RecordRatingTone
}

export interface TodayRecordSummary {
  count: number
  records: MealRecord[]
  calorieRange: {
    min: number
    max: number
  }
}

const RATING_PRESENTATIONS = {
  GREEN: { icon: '✓', label: '绿灯', tone: 'success' },
  YELLOW: { icon: '!', label: '黄灯', tone: 'warning' },
  RED: { icon: '×', label: '红灯', tone: 'danger' }
} as const satisfies Record<MealRating, RecordRatingPresentation>

export function shanghaiDateKey(date: Date): string {
  const shanghaiTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const year = shanghaiTime.getUTCFullYear()
  const month = String(shanghaiTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shanghaiTime.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function buildTodayRecordSummary(
  response: MealRecordsResponse,
  now: Date = new Date()
): TodayRecordSummary | null {
  const today = response.days.find(({ date }) => date === shanghaiDateKey(now))
  if (!today?.records.length) return null

  const records = [...today.records].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  )

  return {
    count: today.records.length,
    records,
    calorieRange: {
      min: today.summary.calorieMin,
      max: today.summary.calorieMax
    }
  }
}

export function formatShanghaiTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  const shanghaiTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return `${String(shanghaiTime.getUTCHours()).padStart(2, '0')}:${String(
    shanghaiTime.getUTCMinutes()
  ).padStart(2, '0')}`
}

export function recordDisplayName(record: MealRecord): string {
  const dishNames = record.assessment.items
    .map(({ displayName }) => displayName.trim())
    .filter(Boolean)

  if (dishNames.length > 0) return dishNames.join(' + ')
  return record.sourceText?.trim() || '已保存餐食'
}

export function recordRatingPresentation(
  rating: MealRating
): RecordRatingPresentation {
  return RATING_PRESENTATIONS[rating]
}
