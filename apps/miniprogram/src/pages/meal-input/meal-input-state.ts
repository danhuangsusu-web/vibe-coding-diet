import type { MealParseInput } from '../../services/meal-parser'
import type {
  MealImageSource,
  SelectedMealImage
} from '../../services/meal-image'

export type MealInputMode = 'IMAGE' | 'TEXT'
export type MealInputPhase =
  | 'idle'
  | 'analyzing'
  | 'permission-denied'
  | 'failure'
  | 'no-meal'

export interface MealInputState {
  activeMode: MealInputMode
  text: string
  image: SelectedMealImage | null
  phase: MealInputPhase
  errorMessage: string | null
}

export type MealInputAction =
  | { type: 'text-changed'; text: string }
  | { type: 'text-activated' }
  | { type: 'image-selected'; image: SelectedMealImage }
  | { type: 'analysis-started' }
  | { type: 'analysis-cancelled' }
  | { type: 'permission-denied' }
  | { type: 'analysis-failed'; message: string }
  | { type: 'no-meal-detected' }
  | { type: 'return-to-text' }
  | { type: 'return-to-input'; mode?: MealInputMode }

export function createInitialMealInputState(
  initialMode: MealInputMode = 'TEXT'
): MealInputState {
  return {
    activeMode: initialMode,
    text: '',
    image: null,
    phase: 'idle',
    errorMessage: null
  }
}

export function mealInputReducer(
  state: MealInputState,
  action: MealInputAction
): MealInputState {
  switch (action.type) {
    case 'text-changed':
      return {
        ...state,
        activeMode: 'TEXT',
        text: action.text,
        phase: 'idle',
        errorMessage: null
      }
    case 'text-activated':
      return {
        ...state,
        activeMode: 'TEXT',
        phase: 'idle',
        errorMessage: null
      }
    case 'image-selected':
      return {
        ...state,
        activeMode: 'IMAGE',
        image: action.image,
        phase: 'idle',
        errorMessage: null
      }
    case 'analysis-started':
      return { ...state, phase: 'analyzing', errorMessage: null }
    case 'analysis-cancelled':
      return { ...state, phase: 'idle', errorMessage: null }
    case 'permission-denied':
      return { ...state, phase: 'permission-denied', errorMessage: null }
    case 'analysis-failed':
      return {
        ...state,
        phase: 'failure',
        errorMessage: action.message
      }
    case 'no-meal-detected':
      return { ...state, phase: 'no-meal', errorMessage: null }
    case 'return-to-text':
      return {
        ...state,
        activeMode: 'TEXT',
        phase: 'idle',
        errorMessage: null
      }
    case 'return-to-input':
      return {
        ...state,
        activeMode: action.mode ?? state.activeMode,
        phase: 'idle',
        errorMessage: null
      }
  }
}

export function canSubmitMealInput(state: MealInputState): boolean {
  if (state.phase !== 'idle') return false

  return buildMealParseInput(state) !== null
}

export function buildMealParseInput(state: MealInputState): MealParseInput | null {
  if (state.activeMode === 'TEXT') {
    const sourceText = state.text.trim()
    if (!sourceText) return null

    return {
      sourceType: 'TEXT',
      sourceText
    }
  }

  if (!state.image) return null

  return {
    sourceType: 'IMAGE',
    localPath: state.image.localPath,
    demoSampleId: 'northeast-combo'
  }
}

export function imageSourceLabel(source: MealImageSource): string {
  return source === 'camera' ? '拍摄照片' : '相册照片'
}
