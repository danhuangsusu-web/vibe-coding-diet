import type {
  ApiErrorCode,
  AssessMealRequest,
  ConfirmedMealItem,
  CreateMealRecordRequest,
  MealAssessment,
  MealRecord,
  MealRecordsResponse,
  MealRating,
  UnknownHandling
} from '@food-sense/shared'

import type {
  MealFlowDraft,
  MealFlowParsedItem
} from '../../state/meal-flow'

export type RatingTone = 'success' | 'warning' | 'danger'

export interface RatingPresentation {
  icon: string
  label: string
  tone: RatingTone
}

const RATING_PRESENTATIONS = {
  GREEN: { icon: '✓', label: '绿灯', tone: 'success' },
  YELLOW: { icon: '!', label: '黄灯', tone: 'warning' },
  RED: { icon: '×', label: '红灯', tone: 'danger' }
} as const satisfies Record<MealRating, RatingPresentation>

export function ratingPresentation(
  rating: MealRating
): RatingPresentation {
  return RATING_PRESENTATIONS[rating]
}

export function ratingSummary(rating: MealRating): string {
  switch (rating) {
    case 'GREEN':
      return '本餐估算上限在当前参考范围内'
    case 'YELLOW':
      return '可以吃，建议留意份量和做法'
    case 'RED':
      return '建议先调整份量或搭配'
  }
}

export function findMealRecord(
  response: MealRecordsResponse,
  recordId: string
): MealRecord | null {
  for (const day of response.days) {
    const record = day.records.find(({ id }) => id === recordId)
    if (record) return record
  }

  return null
}

function toConfirmedItem(item: MealFlowParsedItem): ConfirmedMealItem {
  return {
    displayName: item.displayName,
    ingredients: [...item.ingredients],
    otherIngredients: [...item.otherIngredients],
    cookingMethods: [...item.cookingMethods],
    otherCookingMethods: [...item.otherCookingMethods],
    portionLevel: item.portionLevel,
    uncertainties: [...item.uncertainties],
    wasManuallyAdjusted: item.wasManuallyAdjusted ?? false
  }
}

function confirmedItems(draft: MealFlowDraft): ConfirmedMealItem[] | null {
  if (!draft.inputSummary || !draft.parsedMeal?.items.length) return null
  return draft.parsedMeal.items.map(toConfirmedItem)
}

export function buildAssessMealRequest(
  draft: MealFlowDraft,
  unknownHandling: UnknownHandling = 'PROMPT'
): AssessMealRequest | null {
  const items = confirmedItems(draft)
  const summary = draft.inputSummary

  if (!items || !summary) return null

  return {
    items,
    unknownHandling,
    ...(summary.modelVersion ? { modelVersion: summary.modelVersion } : {})
  }
}

export function buildCreateMealRecordRequest(
  draft: MealFlowDraft,
  assessment: MealAssessment,
  clientRequestId: string,
  unknownHandling: UnknownHandling = 'PROMPT'
): CreateMealRecordRequest | null {
  const items = confirmedItems(draft)
  const summary = draft.inputSummary

  if (!items || !summary) return null

  return {
    clientRequestId,
    sourceType: summary.sourceType,
    ...(summary.sourceType === 'TEXT'
      ? { sourceText: summary.sourceText }
      : {}),
    items,
    isDemo: summary.isDemo,
    unknownHandling,
    clientAssessmentSnapshot: assessment,
    ...(summary.modelVersion ? { modelVersion: summary.modelVersion } : {})
  }
}

export function createClientRequestId(
  random: () => number = Math.random
): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const value = Math.floor(random() * 16)
    const nibble = token === 'x' ? value : (value & 0x3) | 0x8
    return nibble.toString(16)
  })
}

export type MealResultState =
  | { phase: 'assessing'; assessment: null }
  | { phase: 'assessed'; assessment: MealAssessment }
  | {
      phase: 'assessment-error'
      assessment: null
      errorCode: ApiErrorCode | 'NETWORK_ERROR' | 'API_NOT_CONFIGURED'
      errorMessage: string
      retryable: boolean
    }
  | { phase: 'saving'; assessment: MealAssessment }
  | {
      phase: 'save-error'
      assessment: MealAssessment
      errorMessage: string
      retryable: boolean
    }
  | { phase: 'saved'; assessment: MealAssessment }

export type MealResultAction =
  | { type: 'assessment-started' }
  | { type: 'assessment-succeeded'; assessment: MealAssessment }
  | {
      type: 'assessment-failed'
      code: ApiErrorCode | 'NETWORK_ERROR' | 'API_NOT_CONFIGURED'
      message: string
      retryable: boolean
    }
  | { type: 'save-started' }
  | { type: 'save-failed'; message: string; retryable: boolean }
  | { type: 'save-succeeded' }

export function createMealResultState(
  assessment: MealAssessment | null
): MealResultState {
  return assessment
    ? { phase: 'assessed', assessment }
    : { phase: 'assessing', assessment: null }
}

export function mealResultReducer(
  state: MealResultState,
  action: MealResultAction
): MealResultState {
  switch (action.type) {
    case 'assessment-started':
      return { phase: 'assessing', assessment: null }
    case 'assessment-succeeded':
      return { phase: 'assessed', assessment: action.assessment }
    case 'assessment-failed':
      return {
        phase: 'assessment-error',
        assessment: null,
        errorCode: action.code,
        errorMessage: action.message,
        retryable: action.retryable
      }
    case 'save-started':
      return state.assessment
        ? { phase: 'saving', assessment: state.assessment }
        : state
    case 'save-failed':
      return state.assessment
        ? {
            phase: 'save-error',
            assessment: state.assessment,
            errorMessage: action.message,
            retryable: action.retryable
          }
        : state
    case 'save-succeeded':
      return state.assessment
        ? { phase: 'saved', assessment: state.assessment }
        : state
  }
}
