import type { MealAssessment, ParsedMeal } from '@food-sense/shared'

import type { AiMealCallMetrics } from '../../apps/server/lib/ai-meal-parser'
import type { EvalCase, EvalDataset } from './dataset'

export type EvalActualStatus = 'PARSED' | 'NO_MEAL' | 'ERROR'

export interface EvalRawResult {
  caseId: string
  status: EvalActualStatus
  parsedMeal?: ParsedMeal
  assessment?: MealAssessment
  metrics: AiMealCallMetrics
  error?: {
    name: string
    invalidOutputStage?: string
    invalidOutputPaths?: string[]
  }
}

export interface CaseScore {
  caseId: string
  structuredLegal: boolean
  expectedOutcomeCorrect: boolean
  itemCountCorrect: boolean
  primaryDishHits: number
  primaryDishTotal: number
  ingredientHits: number
  ingredientTotal: number
  cookingMethodHits: number
  cookingMethodTotal: number
  adviceRelevant: boolean | null
  containsOther: boolean
  usedConservativeFallback: boolean
  severeMisjudgment: boolean
  failureReasons: string[]
}

export interface EvaluationSummary {
  totalCases: number
  parsedCases: number
  noMealCases: number
  errorCases: number
  errorStatusCounts: Record<string, number>
  structuredLegalCount: number
  structuredLegalRate: number
  expectedOutcomeAccuracy: number
  primaryDishAccuracy: number
  ingredientAccuracy: number
  cookingMethodAccuracy: number
  adviceRelevantCount: number
  adviceScoredCount: number
  adviceRelevanceRate: number | null
  severeMisjudgmentCount: number
  otherSampleCount: number
  otherIngredientSampleCount: number
  otherCookingMethodSampleCount: number
  conservativeFallbackSampleCount: number
  ingredientTagCoverageRate: number
  unknownIngredientFrequency: Record<string, number>
  unknownCookingMethodFrequency: Record<string, number>
  durationMs: { p50: number | null; p90: number | null; max: number | null }
  tokens: { input: number; output: number; total: number; unavailableCalls: number }
  costCny: { calculated: number; unavailableCalls: number; budgetLimit: number; withinBudget: boolean }
  targets: {
    structuredLegalRate: boolean
    primaryDishAccuracy: boolean
    cookingMethodAccuracy: boolean
    adviceRelevanceRate: boolean | null
    severeMisjudgmentCount: boolean
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN').replace(/\s+/g, '')
}

function containsKeyword(value: string, keywords: readonly string[]): boolean {
  const normalized = normalize(value)
  return keywords.some((keyword) => normalized.includes(normalize(keyword)))
}

function matchingItem(parsedMeal: ParsedMeal, keywords: readonly string[]) {
  return parsedMeal.items.find((item) => containsKeyword(item.displayName, keywords))
}

export function scoreCase(evalCase: EvalCase, result: EvalRawResult): CaseScore {
  const failureReasons: string[] = []
  const structuredLegal = result.status !== 'ERROR'
  const expectedOutcomeCorrect = result.status === evalCase.expectation.outcome
  const actualCount = result.parsedMeal?.items.length ?? 0
  const itemCountCorrect =
    actualCount >= evalCase.expectation.itemCount.min &&
    actualCount <= evalCase.expectation.itemCount.max

  if (!structuredLegal) failureReasons.push('STRUCTURED_OUTPUT_ERROR')
  if (!expectedOutcomeCorrect) failureReasons.push('UNEXPECTED_OUTCOME')
  if (!itemCountCorrect) failureReasons.push('ITEM_COUNT_MISMATCH')

  let primaryDishHits = 0
  let ingredientHits = 0
  let ingredientTotal = 0
  let cookingMethodHits = 0
  let cookingMethodTotal = 0

  for (const expectedItem of evalCase.expectation.expectedItems) {
    const actualItem = result.parsedMeal
      ? matchingItem(result.parsedMeal, expectedItem.matchAnyKeywords)
      : undefined

    if (actualItem) primaryDishHits += 1
    else failureReasons.push(`MISSING_DISH:${expectedItem.matchAnyKeywords[0]}`)

    ingredientTotal += expectedItem.ingredientsAll.length
    if (actualItem) {
      ingredientHits += expectedItem.ingredientsAll.filter((ingredient) =>
        actualItem.ingredients.includes(ingredient as never)
      ).length
      if (
        expectedItem.otherIngredientKeywordsAny.length > 0 &&
        !actualItem.otherIngredients.some((value) =>
          containsKeyword(value, expectedItem.otherIngredientKeywordsAny)
        )
      ) {
        failureReasons.push(`OTHER_INGREDIENT_MISMATCH:${actualItem.displayName}`)
      }
    }

    if (expectedItem.cookingMethodsAny.length > 0) {
      cookingMethodTotal += 1
      if (
        actualItem?.cookingMethods.some((method) =>
          expectedItem.cookingMethodsAny.includes(method)
        )
      ) {
        cookingMethodHits += 1
      } else {
        failureReasons.push(`COOKING_METHOD_MISMATCH:${expectedItem.matchAnyKeywords[0]}`)
      }
    }

    if (
      actualItem &&
      expectedItem.otherCookingMethodKeywordsAny &&
      !actualItem.otherCookingMethods.some((value) =>
        containsKeyword(value, expectedItem.otherCookingMethodKeywordsAny ?? [])
      )
    ) {
      failureReasons.push(`OTHER_COOKING_METHOD_MISMATCH:${actualItem.displayName}`)
    }
  }

  if (ingredientHits !== ingredientTotal) failureReasons.push('INGREDIENT_TAG_MISMATCH')

  const forbiddenIngredientFound = Boolean(
    result.parsedMeal?.items.some((item) =>
      item.ingredients.some((ingredient) =>
        evalCase.expectation.forbiddenIngredientTags.includes(ingredient)
      )
    )
  )
  if (forbiddenIngredientFound) failureReasons.push('FORBIDDEN_INGREDIENT')

  const forbiddenOtherIngredientFound = Boolean(
    result.parsedMeal?.items.some((item) =>
      item.otherIngredients.some((value) =>
        containsKeyword(
          value,
          evalCase.expectation.forbiddenOtherIngredientKeywords ?? []
        )
      )
    )
  )
  if (forbiddenOtherIngredientFound) failureReasons.push('FORBIDDEN_OTHER_INGREDIENT')

  if (
    evalCase.expectation.requiredUncertaintyKeywordsAny &&
    result.parsedMeal &&
    !result.parsedMeal.items.some((item) =>
      item.uncertainties.some((value) =>
        containsKeyword(
          value,
          evalCase.expectation.requiredUncertaintyKeywordsAny ?? []
        )
      )
    )
  ) {
    failureReasons.push('MISSING_REQUIRED_UNCERTAINTY')
  }

  const adviceScored =
    evalCase.expectation.acceptableAdviceIds.length > 0 &&
    result.assessment !== undefined
  const adviceIds = result.assessment?.advice.map(({ id }) => id) ?? []
  const adviceRelevant = adviceScored
    ? adviceIds.length > 0 &&
      adviceIds.every((id) => evalCase.expectation.acceptableAdviceIds.includes(id)) &&
      (evalCase.expectation.requiredAnyAdviceIds.length === 0 ||
        adviceIds.some((id) => evalCase.expectation.requiredAnyAdviceIds.includes(id)))
    : null
  if (adviceRelevant === false) failureReasons.push('ADVICE_NOT_RELEVANT')

  const containsOther = Boolean(
    result.parsedMeal?.items.some(
      (item) =>
        item.ingredients.includes('OTHER') || item.cookingMethods.includes('OTHER')
    )
  )

  return {
    caseId: evalCase.id,
    structuredLegal,
    expectedOutcomeCorrect,
    itemCountCorrect,
    primaryDishHits,
    primaryDishTotal: evalCase.expectation.expectedItems.length,
    ingredientHits,
    ingredientTotal,
    cookingMethodHits,
    cookingMethodTotal,
    adviceRelevant,
    containsOther,
    usedConservativeFallback: containsOther && result.status === 'PARSED',
    severeMisjudgment:
      result.status !== 'ERROR' &&
      (!expectedOutcomeCorrect ||
        !itemCountCorrect ||
        forbiddenIngredientFound ||
        forbiddenOtherIngredientFound),
    failureReasons: [...new Set(failureReasons)]
  }
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

function percentile(values: readonly number[], fraction: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? null
}

function increment(target: Record<string, number>, value: string): void {
  const normalized = value.trim()
  if (normalized) target[normalized] = (target[normalized] ?? 0) + 1
}

export function summarizeEvaluation(
  dataset: EvalDataset,
  results: readonly EvalRawResult[]
): { scores: CaseScore[]; summary: EvaluationSummary } {
  const resultByCaseId = new Map(results.map((result) => [result.caseId, result]))
  const scores = dataset.cases.map((evalCase) => {
    const result = resultByCaseId.get(evalCase.id)
    if (!result) throw new Error(`Missing evaluation result for ${evalCase.id}`)
    return scoreCase(evalCase, result)
  })
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
  const durations = results.map(({ metrics }) => metrics.durationMs)
  const inputTokens = results.flatMap(({ metrics }) =>
    metrics.inputTokens === null ? [] : [metrics.inputTokens]
  )
  const outputTokens = results.flatMap(({ metrics }) =>
    metrics.outputTokens === null ? [] : [metrics.outputTokens]
  )
  const totalTokens = results.flatMap(({ metrics }) =>
    metrics.totalTokens === null ? [] : [metrics.totalTokens]
  )
  const costs = results.flatMap(({ metrics }) =>
    metrics.costCny === null ? [] : [metrics.costCny]
  )
  const unknownIngredientFrequency: Record<string, number> = {}
  const unknownCookingMethodFrequency: Record<string, number> = {}
  const errorStatusCounts: Record<string, number> = {}
  let ingredientTagCount = 0
  let controlledIngredientTagCount = 0
  for (const result of results) {
    if (result.status === 'ERROR') increment(errorStatusCounts, result.metrics.status)
    for (const item of result.parsedMeal?.items ?? []) {
      ingredientTagCount += item.ingredients.length
      controlledIngredientTagCount += item.ingredients.filter(
        (ingredient) => ingredient !== 'OTHER'
      ).length
      item.otherIngredients.forEach((value) => increment(unknownIngredientFrequency, value))
      item.otherCookingMethods.forEach((value) =>
        increment(unknownCookingMethodFrequency, value)
      )
    }
  }

  const structuredLegalRate = ratio(
    scores.filter(({ structuredLegal }) => structuredLegal).length,
    scores.length
  )
  const primaryDishAccuracy = ratio(
    sum(scores.map(({ primaryDishHits }) => primaryDishHits)),
    sum(scores.map(({ primaryDishTotal }) => primaryDishTotal))
  )
  const ingredientAccuracy = ratio(
    sum(scores.map(({ ingredientHits }) => ingredientHits)),
    sum(scores.map(({ ingredientTotal }) => ingredientTotal))
  )
  const cookingMethodAccuracy = ratio(
    sum(scores.map(({ cookingMethodHits }) => cookingMethodHits)),
    sum(scores.map(({ cookingMethodTotal }) => cookingMethodTotal))
  )
  const adviceScores = scores.filter(({ adviceRelevant }) => adviceRelevant !== null)
  const adviceRelevantCount = adviceScores.filter(
    ({ adviceRelevant }) => adviceRelevant
  ).length
  const adviceRelevanceRate = adviceScores.length
    ? ratio(adviceRelevantCount, adviceScores.length)
    : null
  const calculatedCost = sum(costs)

  return {
    scores,
    summary: {
      totalCases: results.length,
      parsedCases: results.filter(({ status }) => status === 'PARSED').length,
      noMealCases: results.filter(({ status }) => status === 'NO_MEAL').length,
      errorCases: results.filter(({ status }) => status === 'ERROR').length,
      errorStatusCounts,
      structuredLegalCount: scores.filter(({ structuredLegal }) => structuredLegal).length,
      structuredLegalRate,
      expectedOutcomeAccuracy: ratio(
        scores.filter(({ expectedOutcomeCorrect }) => expectedOutcomeCorrect).length,
        scores.length
      ),
      primaryDishAccuracy,
      ingredientAccuracy,
      cookingMethodAccuracy,
      adviceRelevantCount,
      adviceScoredCount: adviceScores.length,
      adviceRelevanceRate,
      severeMisjudgmentCount: scores.filter(({ severeMisjudgment }) => severeMisjudgment)
        .length,
      otherSampleCount: scores.filter(({ containsOther }) => containsOther).length,
      otherIngredientSampleCount: results.filter(({ parsedMeal }) =>
        parsedMeal?.items.some((item) => item.ingredients.includes('OTHER'))
      ).length,
      otherCookingMethodSampleCount: results.filter(({ parsedMeal }) =>
        parsedMeal?.items.some((item) => item.cookingMethods.includes('OTHER'))
      ).length,
      conservativeFallbackSampleCount: scores.filter(
        ({ usedConservativeFallback }) => usedConservativeFallback
      ).length,
      ingredientTagCoverageRate: ratio(
        controlledIngredientTagCount,
        ingredientTagCount
      ),
      unknownIngredientFrequency,
      unknownCookingMethodFrequency,
      durationMs: {
        p50: percentile(durations, 0.5),
        p90: percentile(durations, 0.9),
        max: durations.length ? Math.max(...durations) : null
      },
      tokens: {
        input: sum(inputTokens),
        output: sum(outputTokens),
        total: sum(totalTokens),
        unavailableCalls: results.length - totalTokens.length
      },
      costCny: {
        calculated: calculatedCost,
        unavailableCalls: results.length - costs.length,
        budgetLimit: 100,
        withinBudget: calculatedCost <= 100
      },
      targets: {
        structuredLegalRate: structuredLegalRate >= 0.95,
        primaryDishAccuracy: primaryDishAccuracy >= 0.8,
        cookingMethodAccuracy: cookingMethodAccuracy >= 0.8,
        adviceRelevanceRate:
          adviceRelevanceRate === null ? null : adviceRelevanceRate >= 0.85,
        severeMisjudgmentCount:
          scores.filter(({ severeMisjudgment }) => severeMisjudgment).length <= 2
      }
    }
  }
}
