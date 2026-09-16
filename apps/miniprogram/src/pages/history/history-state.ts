import type {
  DemoProfile,
  GoalDirection,
  MealRecordsResponse,
  UpdateDemoProfileRequest
} from '@food-sense/shared'

export interface HistorySettingsDraft {
  goalDirection: GoalDirection
  dailyCalorieMin: number
  dailyCalorieMax: number
}

const CALORIE_STEP = 50

export function createSettingsDraft(
  profile: DemoProfile
): HistorySettingsDraft {
  return {
    goalDirection: profile.goalDirection,
    dailyCalorieMin: profile.dailyCalorieMin,
    dailyCalorieMax: profile.dailyCalorieMax
  }
}

export function validateSettingsDraft(
  draft: HistorySettingsDraft
): string | null {
  if (
    !Number.isInteger(draft.dailyCalorieMin) ||
    !Number.isInteger(draft.dailyCalorieMax) ||
    draft.dailyCalorieMin <= 0 ||
    draft.dailyCalorieMax <= 0
  ) {
    return '每日建议必须是正整数。'
  }

  if (draft.dailyCalorieMin >= draft.dailyCalorieMax) {
    return '每日建议下限必须小于上限。'
  }

  return null
}

export function buildProfileUpdateRequest(
  draft: HistorySettingsDraft
): UpdateDemoProfileRequest | null {
  if (validateSettingsDraft(draft)) return null

  return { ...draft }
}

export function isSettingsDirty(
  profile: DemoProfile,
  draft: HistorySettingsDraft
): boolean {
  return (
    profile.goalDirection !== draft.goalDirection ||
    profile.dailyCalorieMin !== draft.dailyCalorieMin ||
    profile.dailyCalorieMax !== draft.dailyCalorieMax
  )
}

export function adjustCalorieValue(
  value: number,
  direction: -1 | 1
): number {
  return Math.max(CALORIE_STEP, value + direction * CALORIE_STEP)
}

function parseDateKey(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null

  const [, year, month, day] = match
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(timestamp) ? null : timestamp
}

function monthDay(dateKey: string): string {
  const [, month = '', day = ''] = dateKey.split('-')
  const monthNumber = Number(month)
  const dayNumber = Number(day)

  if (!monthNumber || !dayNumber) return dateKey
  return `${monthNumber}月${dayNumber}日`
}

export function formatHistoryDate(
  dateKey: string,
  todayDate: string
): string {
  const label = monthDay(dateKey)
  if (dateKey === todayDate) return `今天 · ${label}`

  const date = parseDateKey(dateKey)
  const today = parseDateKey(todayDate)
  if (date !== null && today !== null && today - date === 24 * 60 * 60 * 1000) {
    return `昨天 · ${label}`
  }

  return label
}

export function removeHistoryRecord(
  response: MealRecordsResponse,
  recordId: string
): MealRecordsResponse {
  let removed = false

  const days = response.days.flatMap((day) => {
    const records = day.records.filter((record) => {
      if (record.id !== recordId) return true
      removed = true
      return false
    })

    if (records.length === 0) return []
    if (records.length === day.records.length) return [day]

    return [
      {
        ...day,
        summary: records.reduce(
          (summary, record) => ({
            calorieMin: summary.calorieMin + record.assessment.calorieRange.min,
            calorieMax: summary.calorieMax + record.assessment.calorieRange.max
          }),
          { calorieMin: 0, calorieMax: 0 }
        ),
        records
      }
    ]
  })

  return removed ? { ...response, days } : response
}
