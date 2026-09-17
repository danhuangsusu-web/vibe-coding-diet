import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { AiMealCallMetrics } from '../../apps/server/lib/ai-meal-parser'
import { loadEvalDataset } from './dataset'
import { scoreCase, summarizeEvaluation, type EvalRawResult } from './scoring'

const metrics: AiMealCallMetrics = {
  event: 'ai_meal_parse',
  status: 'success',
  modelVersion: 'test-model',
  promptVersion: 'text-meal-v3',
  durationMs: 100,
  inputTokens: 10,
  outputTokens: 20,
  totalTokens: 30,
  costCny: 0.001,
  costStatus: 'calculated_from_token_usage'
}

describe('step 23 evaluation dataset and scoring', () => {
  it('loads at least 30 uniquely identified cases', async () => {
    const dataset = await loadEvalDataset('scripts/ai-eval/cases.json')
    expect(dataset.cases).toHaveLength(38)
    expect(new Set(dataset.cases.map(({ id }) => id)).size).toBe(38)
  })

  it('keeps the fixed text/image split and validates every synthetic asset', async () => {
    const dataset = await loadEvalDataset('scripts/ai-eval/cases.json')
    const textCases = dataset.cases.filter(({ modality }) => modality === 'TEXT')
    const imageCases = dataset.cases.filter(({ modality }) => modality === 'IMAGE')

    expect(textCases).toHaveLength(26)
    expect(imageCases).toHaveLength(12)

    for (const evalCase of imageCases) {
      const bytes = await readFile(
        path.join(process.cwd(), 'scripts/ai-eval', evalCase.input.assetPath)
      )
      expect(bytes.byteLength).toBeLessThanOrEqual(1024 * 1024)
      expect(evalCase.input.provenance).toMatch(/^DETERMINISTIC_SYNTHETIC_/)

      if (evalCase.input.mediaType === 'image/png') {
        expect([...bytes.subarray(0, 8)]).toEqual([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
        ])
      } else {
        expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff])
      }
    }
  })

  it('scores an expected parsed meal and stable advice identifiers', async () => {
    const dataset = await loadEvalDataset('scripts/ai-eval/cases.json')
    const evalCase = dataset.cases.find(({ id }) => id === 'TXT-SINGLE-002')!
    const result: EvalRawResult = {
      caseId: evalCase.id,
      status: 'PARSED',
      metrics,
      parsedMeal: {
        items: [
          {
            displayName: '清蒸鸡胸肉',
            ingredients: ['CHICKEN_WITHOUT_SKIN'],
            otherIngredients: [],
            cookingMethods: ['STEAMED'],
            otherCookingMethods: [],
            portionLevel: 'regular',
            confidence: 0.95,
            uncertainties: []
          }
        ]
      },
      assessment: {
        items: [
          {
            displayName: '清蒸鸡胸肉',
            ingredients: ['CHICKEN_WITHOUT_SKIN'],
            otherIngredients: [],
            cookingMethods: ['STEAMED'],
            otherCookingMethods: [],
            portionLevel: 'regular',
            uncertainties: [],
            wasManuallyAdjusted: false
          }
        ],
        calorieRange: { min: 140, max: 230 },
        mealBudget: 500,
        rating: 'GREEN',
        ratingLabel: '这餐比较合适',
        reason: 'test',
        advice: [{ id: 'KEEP_CURRENT', text: '保持当前选择即可，无需额外调整。' }],
        uncertainties: [],
        ruleVersion: 'nutrition-assessment-v2'
      }
    }

    expect(scoreCase(evalCase, result)).toMatchObject({
      structuredLegal: true,
      expectedOutcomeCorrect: true,
      primaryDishHits: 1,
      cookingMethodHits: 1,
      adviceRelevant: true,
      severeMisjudgment: false
    })
  })

  it('counts invalid output, OTHER frequency, latency, tokens, and cost', async () => {
    const dataset = await loadEvalDataset('scripts/ai-eval/cases.json')
    const tinyDataset = { ...dataset, cases: dataset.cases.slice(0, 2) }
    const results: EvalRawResult[] = [
      {
        caseId: tinyDataset.cases[0].id,
        status: 'PARSED',
        metrics,
        parsedMeal: {
          items: [
            {
              displayName: '番茄炒鸡蛋',
              ingredients: ['EGG', 'OTHER'],
              otherIngredients: ['番茄'],
              cookingMethods: ['STIR_FRIED', 'OTHER'],
              otherCookingMethods: ['未说明，待用户选择'],
              portionLevel: 'regular',
              confidence: 0.9,
              uncertainties: []
            }
          ]
        }
      },
      {
        caseId: tinyDataset.cases[1].id,
        status: 'ERROR',
        metrics: { ...metrics, status: 'invalid_output', durationMs: 200 },
        error: { name: 'AiMealInvalidOutputError', invalidOutputStage: 'json_parse' }
      }
    ]

    const { summary } = summarizeEvaluation(tinyDataset, results)
    expect(summary).toMatchObject({
      totalCases: 2,
      structuredLegalCount: 1,
      errorStatusCounts: { invalid_output: 1 },
      otherSampleCount: 1,
      otherIngredientSampleCount: 1,
      otherCookingMethodSampleCount: 1,
      conservativeFallbackSampleCount: 1,
      ingredientTagCoverageRate: 0.5,
      durationMs: { p50: 100, p90: 200, max: 200 },
      tokens: { total: 60 },
      costCny: { calculated: 0.002, withinBudget: true }
    })
    expect(summary.unknownIngredientFrequency).toEqual({ 番茄: 1 })
    expect(summary.unknownCookingMethodFrequency).toEqual({
      '未说明，待用户选择': 1
    })
  })
})
