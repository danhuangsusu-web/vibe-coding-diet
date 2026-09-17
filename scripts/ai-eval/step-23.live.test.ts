import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  AiMealInvalidOutputError,
  createAiMealParser,
  NoMealDetectedError,
  type AiMealCallMetrics
} from '../../apps/server/lib/ai-meal-parser'
import { assessMeal } from '../../packages/nutrition/src'
import { loadEvalDataset } from './dataset'
import { renderComparisonReport, renderEvaluationReport } from './report'
import { summarizeEvaluation, type EvalRawResult } from './scoring'

const ROOT = process.cwd()
const DATASET_PATH = path.join(
  ROOT,
  'scripts/ai-eval',
  process.env.AI_EVAL_DATASET_FILE ?? 'cases.json'
)
const RESULTS_DIRECTORY = path.join(ROOT, 'scripts/ai-eval/results')
const RESULT_SET = process.env.AI_EVAL_RESULT_SET?.trim()

if (!RESULT_SET) {
  throw new Error('AI_EVAL_RESULT_SET is required to avoid overwriting evaluation evidence')
}

async function loadServerEnvironment(): Promise<void> {
  const envText = await readFile(path.join(ROOT, 'apps/server/.env'), 'utf8')
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

describe('step 23 live AI evaluation', () => {
  it(
    'runs the fixed dataset and writes reproducible raw results and a report',
    async () => {
      const dataset = await loadEvalDataset(DATASET_PATH)
      const recomputeOnly = process.env.AI_EVAL_RECOMPUTE_ONLY === '1'
      if (!recomputeOnly && process.env.AI_EVAL_ALLOW_LIVE !== '1') {
        throw new Error(
          'Live AI evaluation requires explicit AI_EVAL_ALLOW_LIVE=1 approval'
        )
      }
      let generatedAt: string
      let results: EvalRawResult[]
      if (recomputeOnly) {
        const raw = JSON.parse(
          await readFile(path.join(RESULTS_DIRECTORY, `${RESULT_SET}.raw.json`), 'utf8')
        ) as { generatedAt: string; results: EvalRawResult[] }
        generatedAt = raw.generatedAt
        results = raw.results
      } else {
        await loadServerEnvironment()
        results = []
        let capturedMetrics: AiMealCallMetrics | undefined
        const parser = createAiMealParser({
          logger: (metrics) => {
            capturedMetrics = metrics
          }
        })

        for (const [index, evalCase] of dataset.cases.entries()) {
          capturedMetrics = undefined
          const input =
            evalCase.modality === 'TEXT'
              ? { sourceType: 'TEXT' as const, sourceText: evalCase.input.sourceText }
              : {
                  sourceType: 'IMAGE' as const,
                  image: new Uint8Array(
                    await readFile(path.join(ROOT, 'scripts/ai-eval', evalCase.input.assetPath))
                  ),
                  mediaType: evalCase.input.mediaType
                }
          let result: EvalRawResult
          try {
            const parsedMeal = await parser(input)
            if (!capturedMetrics) throw new Error('Parser did not emit evaluation metrics')
            const confirmedItems = parsedMeal.items.map(
              ({ confidence: _confidence, ...item }) => ({
                ...item,
                wasManuallyAdjusted: false
              })
            )
            const assessmentResult = assessMeal({
              items: confirmedItems,
              dailyCalorieRange: dataset.fixedAssessmentContext.dailyCalorieRange,
              todayMealRanges: dataset.fixedAssessmentContext.todayMealRanges,
              now: new Date(dataset.fixedAssessmentContext.now),
              unknownHandling: dataset.fixedAssessmentContext.unknownHandling,
              modelVersion: capturedMetrics.modelVersion
            })
            if (assessmentResult.status !== 'ASSESSED') {
              throw new Error('Conservative fallback did not produce an assessment')
            }
            result = {
              caseId: evalCase.id,
              status: 'PARSED',
              parsedMeal,
              assessment: assessmentResult.assessment,
              metrics: capturedMetrics
            }
          } catch (error) {
            if (!capturedMetrics) throw error
            if (error instanceof NoMealDetectedError) {
              result = {
                caseId: evalCase.id,
                status: 'NO_MEAL',
                metrics: capturedMetrics
              }
            } else {
              result = {
                caseId: evalCase.id,
                status: 'ERROR',
                metrics: capturedMetrics,
                error: {
                  name: error instanceof Error ? error.name : 'UnknownError',
                  ...(error instanceof AiMealInvalidOutputError
                    ? {
                        invalidOutputStage: error.stage,
                        invalidOutputPaths: error.issuePaths
                      }
                    : {})
                }
              }
            }
          }
          results.push(result)
          console.info(
            `[step-23] ${index + 1}/${dataset.cases.length} ${evalCase.id} ${result.status} ${result.metrics.durationMs}ms`
          )
        }
        generatedAt = new Date().toISOString()
      }
      const { scores, summary } = summarizeEvaluation(dataset, results)
      await mkdir(RESULTS_DIRECTORY, { recursive: true })
      if (!recomputeOnly) {
        await writeFile(
          path.join(RESULTS_DIRECTORY, `${RESULT_SET}.raw.json`),
          `${JSON.stringify({ datasetId: dataset.datasetId, generatedAt, results }, null, 2)}\n`,
          'utf8'
        )
      }
      await writeFile(
        path.join(RESULTS_DIRECTORY, `${RESULT_SET}.summary.json`),
        `${JSON.stringify({ datasetId: dataset.datasetId, generatedAt, summary, scores }, null, 2)}\n`,
        'utf8'
      )
      await writeFile(
        path.join(RESULTS_DIRECTORY, `${RESULT_SET}-report.md`),
        renderEvaluationReport(
          dataset,
          results,
          scores,
          summary,
          generatedAt,
          RESULT_SET
        ),
        'utf8'
      )
      if (RESULT_SET !== 'baseline') {
        const baselineFile = JSON.parse(
          await readFile(path.join(RESULTS_DIRECTORY, 'baseline.summary.json'), 'utf8')
        ) as { summary: typeof summary }
        await writeFile(
          path.join(RESULTS_DIRECTORY, `${RESULT_SET}-comparison.md`),
          renderComparisonReport(baselineFile.summary, summary, generatedAt),
          'utf8'
        )
      }

      expect(results).toHaveLength(dataset.cases.length)
      expect(dataset.cases.length).toBeGreaterThanOrEqual(30)
    },
    30 * 60 * 1000
  )
})
