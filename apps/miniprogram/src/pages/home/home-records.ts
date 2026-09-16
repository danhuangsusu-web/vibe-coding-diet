import type {
  DemoProfile,
  GoalDirection,
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

export interface HomeDashboard {
  consumedRange: {
    min: number
    max: number
  }
  remainingRange: {
    min: number
    max: number
  }
  progressPercent: number
  isOverRange: boolean
  recordCount: number
  recentRecords: MealRecord[]
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
  response: MealRecordsResponse
): TodayRecordSummary | null {
  const today = response.days.find(({ date }) => date === response.todayDate)
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

export function buildHomeDashboard(
  profile: DemoProfile,
  response: MealRecordsResponse
): HomeDashboard {
  const today = buildTodayRecordSummary(response)
  const consumedRange = today?.calorieRange ?? { min: 0, max: 0 }
  const remainingRange = {
    min: Math.max(0, profile.dailyCalorieMin - consumedRange.max),
    max: Math.max(0, profile.dailyCalorieMax - consumedRange.min)
  }
  const consumedMidpoint = (consumedRange.min + consumedRange.max) / 2
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((consumedMidpoint / profile.dailyCalorieMax) * 100))
  )

  return {
    consumedRange,
    remainingRange,
    progressPercent,
    isOverRange:
      today !== null && remainingRange.min === 0 && remainingRange.max === 0,
    recordCount: today?.count ?? 0,
    recentRecords: today?.records.slice(0, 3) ?? []
  }
}

export function goalDirectionLabel(direction: GoalDirection): string {
  switch (direction) {
    case 'FAT_LOSS':
      return '减脂目标'
    case 'MAINTAIN':
      return '维持目标'
    case 'MUSCLE_GAIN':
      return '增肌目标'
  }
}

export function formatShanghaiDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shanghaiTime = new Date(Date.UTC(year, month - 1, day))
  const weekdays = [
    '周日',
    '周一',
    '周二',
    '周三',
    '周四',
    '周五',
    '周六'
  ] as const

  return `${month}月${day}日 · ${weekdays[shanghaiTime.getUTCDay()]}`
}

export function formatShanghaiTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  const shanghaiTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return `${String(shanghaiTime.getUTCHours()).padStart(2, '0')}:${String(
    shanghaiTime.getUTCMinutes()
  ).padStart(2, '0')}`
}

export function greetingForServerTime(serverTime: string): string {
  const date = new Date(serverTime)
  if (Number.isNaN(date.getTime())) return '你好'

  const shanghaiTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const hour = shanghaiTime.getUTCHours()

  if (hour >= 5 && hour < 11) return '早上好'
  if (hour >= 11 && hour < 14) return '中午好'
  if (hour >= 14 && hour < 18) return '下午好'
  return '晚上好'
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
