import type {
  InputType,
  MealAssessment,
  ParsedMeal
} from '@food-sense/shared'
import { atom, createStore } from 'jotai'

export type MealInputSummary =
  | {
      sourceType: Extract<InputType, 'TEXT'>
      sourceText: string
      displayLabel: string
    }
  | {
      sourceType: Extract<InputType, 'IMAGE'>
      displayLabel: string
    }

export interface MealFlowDraft {
  inputSummary: MealInputSummary | null
  parsedMeal: ParsedMeal | null
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
