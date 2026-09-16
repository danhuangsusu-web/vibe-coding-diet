import type {
  InputType,
  MealAssessment,
  MealItem
} from '@food-sense/shared'
import { atom, createStore } from 'jotai'

export type MealInputSummary =
  | {
      sourceType: Extract<InputType, 'TEXT'>
      sourceText: string
      displayLabel: string
      submittedAt: string
      isDemo: boolean
      modelVersion?: string
    }
  | {
      sourceType: Extract<InputType, 'IMAGE'>
      displayLabel: string
      submittedAt: string
      isDemo: boolean
      modelVersion?: string
    }

export type MealFlowParsedItem = MealItem & {
  wasManuallyAdjusted?: boolean
}

export interface MealFlowParsedMeal {
  items: MealFlowParsedItem[]
}

export interface MealFlowDraft {
  inputSummary: MealInputSummary | null
  parsedMeal: MealFlowParsedMeal | null
  assessment: MealAssessment | null
}

export function createEmptyMealFlowDraft(): MealFlowDraft {
  return {
    inputSummary: null,
    parsedMeal: null,
    assessment: null
  }
}

export const mealFlowDraftAtom = atom<MealFlowDraft>(createEmptyMealFlowDraft())

export const resetMealFlowDraftAtom = atom(null, (_get, set) => {
  set(mealFlowDraftAtom, createEmptyMealFlowDraft())
})

export const mealFlowStore = createStore()
