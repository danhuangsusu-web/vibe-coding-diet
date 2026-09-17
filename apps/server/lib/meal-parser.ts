import { parsedMealSchema, type ParsedMeal } from '@food-sense/shared'

import { aiMealParser } from './ai-meal-parser'
import {
  DEMO_MEAL_SAMPLES,
  getDemoMealSample,
  type DemoMealSampleId
} from './demo-meals'

export type MealParserMode = 'offline' | 'ai'

export type MealParseInput =
  | {
      sourceType: 'TEXT'
      sourceText: string
    }
  | {
      sourceType: 'IMAGE'
      image: Uint8Array
      mediaType: 'image/jpeg' | 'image/png'
      demoSampleId?: DemoMealSampleId
    }

export interface MealParserContext {
  signal?: AbortSignal
}

export type MealParser = (
  input: MealParseInput,
  context?: MealParserContext
) => Promise<ParsedMeal>

export interface ParseMealOptions {
  mode?: MealParserMode
  aiParser?: MealParser
  signal?: AbortSignal
}

export class MealParserConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MealParserConfigurationError'
  }
}

export class OfflineMealSampleNotFoundError extends Error {
  constructor() {
    super('No offline meal sample matches the provided input')
    this.name = 'OfflineMealSampleNotFoundError'
  }
}

function normalizeSampleText(value: string): string {
  return value.trim().replace(/[\s，,、+和]/g, '')
}

function findTextSample(sourceText: string) {
  const normalizedInput = normalizeSampleText(sourceText)

  return DEMO_MEAL_SAMPLES.find(
    (sample) => normalizeSampleText(sample.input.sourceText) === normalizedInput
  )
}

export function resolveMealParserMode(
  configuredMode: string | undefined = process.env.MEAL_PARSER
): MealParserMode {
  if (configuredMode === undefined || configuredMode === '' || configuredMode === 'offline') {
    return 'offline'
  }

  if (configuredMode === 'ai') {
    return 'ai'
  }

  throw new MealParserConfigurationError(
    'MEAL_PARSER must be either "offline" or "ai"'
  )
}

export const offlineMealParser: MealParser = async (input) => {
  const sample =
    input.sourceType === 'TEXT'
      ? findTextSample(input.sourceText)
      : getDemoMealSample(input.demoSampleId ?? 'northeast-combo')

  if (!sample) {
    throw new OfflineMealSampleNotFoundError()
  }

  return parsedMealSchema.parse(sample.parsedMeal)
}

export async function parseMeal(
  input: MealParseInput,
  options: ParseMealOptions = {}
): Promise<ParsedMeal> {
  const mode = options.mode ?? resolveMealParserMode()
  const parser =
    mode === 'offline' ? offlineMealParser : (options.aiParser ?? aiMealParser)

  const result = options.signal
    ? await parser(input, { signal: options.signal })
    : await parser(input)

  return parsedMealSchema.parse(result)
}
