import { readFile } from 'node:fs/promises'

export interface ExpectedEvalItem {
  matchAnyKeywords: string[]
  ingredientsAll: string[]
  otherIngredientKeywordsAny: string[]
  cookingMethodsAny: string[]
  otherCookingMethodKeywordsAny?: string[]
}

export interface EvalExpectation {
  outcome: 'PARSED' | 'NO_MEAL'
  itemCount: { min: number; max: number }
  expectedItems: ExpectedEvalItem[]
  forbiddenIngredientTags: string[]
  forbiddenOtherIngredientKeywords?: string[]
  acceptableAdviceIds: string[]
  requiredAnyAdviceIds: string[]
  requiresUserCookingMethodSelection?: boolean
  requiredUncertaintyKeywordsAny?: string[]
}

interface EvalCaseBase {
  id: string
  category: string
  title: string
  expectation: EvalExpectation
}

export interface TextEvalCase extends EvalCaseBase {
  modality: 'TEXT'
  input: { sourceText: string }
}

export interface ImageEvalCase extends EvalCaseBase {
  modality: 'IMAGE'
  input: {
    assetPath: string
    mediaType: 'image/jpeg' | 'image/png'
    provenance: string
    assetBrief: string
  }
}

export type EvalCase = TextEvalCase | ImageEvalCase

export interface EvalDataset {
  schemaVersion: '1.0'
  datasetId: string
  status: string
  title: string
  description: string
  fixedAssessmentContext: {
    dailyCalorieRange: { min: number; max: number }
    todayMealRanges: Array<{ min: number; max: number }>
    now: string
    unknownHandling: 'CONSERVATIVE_FALLBACK'
  }
  scoringNotes: Record<string, string>
  cases: EvalCase[]
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`)
  }
  return value as Record<string, unknown>
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${path} must be a non-empty string`)
  }
  return value
}

function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number`)
  }
  return value
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`)
  return value.map((entry, index) => string(entry, `${path}[${index}]`))
}

function optionalStringArray(value: unknown, path: string): string[] | undefined {
  return value === undefined ? undefined : stringArray(value, path)
}

function validateExpectedItem(value: unknown, path: string): ExpectedEvalItem {
  const item = record(value, path)
  const matchAnyKeywords = stringArray(item.matchAnyKeywords, `${path}.matchAnyKeywords`)
  if (matchAnyKeywords.length === 0) {
    throw new TypeError(`${path}.matchAnyKeywords must not be empty`)
  }
  const optionalCookingKeywords = optionalStringArray(
    item.otherCookingMethodKeywordsAny,
    `${path}.otherCookingMethodKeywordsAny`
  )
  return {
    matchAnyKeywords,
    ingredientsAll: stringArray(item.ingredientsAll, `${path}.ingredientsAll`),
    otherIngredientKeywordsAny: stringArray(
      item.otherIngredientKeywordsAny,
      `${path}.otherIngredientKeywordsAny`
    ),
    cookingMethodsAny: stringArray(item.cookingMethodsAny, `${path}.cookingMethodsAny`),
    ...(optionalCookingKeywords === undefined
      ? {}
      : { otherCookingMethodKeywordsAny: optionalCookingKeywords })
  }
}

function validateExpectation(value: unknown, path: string): EvalExpectation {
  const expectation = record(value, path)
  const outcome = string(expectation.outcome, `${path}.outcome`)
  if (outcome !== 'PARSED' && outcome !== 'NO_MEAL') {
    throw new TypeError(`${path}.outcome must be PARSED or NO_MEAL`)
  }
  const count = record(expectation.itemCount, `${path}.itemCount`)
  const min = number(count.min, `${path}.itemCount.min`)
  const max = number(count.max, `${path}.itemCount.max`)
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || min > max) {
    throw new TypeError(`${path}.itemCount must contain valid non-negative integer bounds`)
  }
  if (!Array.isArray(expectation.expectedItems)) {
    throw new TypeError(`${path}.expectedItems must be an array`)
  }
  const expectedItems = expectation.expectedItems.map((item, index) =>
    validateExpectedItem(item, `${path}.expectedItems[${index}]`)
  )
  if (outcome === 'NO_MEAL' && expectedItems.length > 0) {
    throw new TypeError(`${path}.expectedItems must be empty for NO_MEAL`)
  }
  const optionalBoolean = expectation.requiresUserCookingMethodSelection
  if (optionalBoolean !== undefined && typeof optionalBoolean !== 'boolean') {
    throw new TypeError(`${path}.requiresUserCookingMethodSelection must be boolean`)
  }
  const forbiddenOther = optionalStringArray(
    expectation.forbiddenOtherIngredientKeywords,
    `${path}.forbiddenOtherIngredientKeywords`
  )
  const requiredUncertainty = optionalStringArray(
    expectation.requiredUncertaintyKeywordsAny,
    `${path}.requiredUncertaintyKeywordsAny`
  )
  return {
    outcome,
    itemCount: { min, max },
    expectedItems,
    forbiddenIngredientTags: stringArray(
      expectation.forbiddenIngredientTags,
      `${path}.forbiddenIngredientTags`
    ),
    ...(forbiddenOther === undefined
      ? {}
      : { forbiddenOtherIngredientKeywords: forbiddenOther }),
    acceptableAdviceIds: stringArray(
      expectation.acceptableAdviceIds,
      `${path}.acceptableAdviceIds`
    ),
    requiredAnyAdviceIds: stringArray(
      expectation.requiredAnyAdviceIds,
      `${path}.requiredAnyAdviceIds`
    ),
    ...(optionalBoolean === undefined
      ? {}
      : { requiresUserCookingMethodSelection: optionalBoolean }),
    ...(requiredUncertainty === undefined
      ? {}
      : { requiredUncertaintyKeywordsAny: requiredUncertainty })
  }
}

function validateCase(value: unknown, index: number): EvalCase {
  const path = `cases[${index}]`
  const evalCase = record(value, path)
  const id = string(evalCase.id, `${path}.id`)
  if (!/^(TXT|IMG)-[A-Z0-9]+-\d{3}$/.test(id)) {
    throw new TypeError(`${path}.id has an invalid stable identifier`)
  }
  const modality = string(evalCase.modality, `${path}.modality`)
  const input = record(evalCase.input, `${path}.input`)
  const base = {
    id,
    category: string(evalCase.category, `${path}.category`),
    title: string(evalCase.title, `${path}.title`),
    expectation: validateExpectation(evalCase.expectation, `${path}.expectation`)
  }
  if (modality === 'TEXT') {
    const sourceText = string(input.sourceText, `${path}.input.sourceText`)
    if (sourceText.length > 100) throw new TypeError(`${path}.input.sourceText exceeds 100 chars`)
    return { ...base, modality, input: { sourceText } }
  }
  if (modality === 'IMAGE') {
    const mediaType = string(input.mediaType, `${path}.input.mediaType`)
    if (mediaType !== 'image/jpeg' && mediaType !== 'image/png') {
      throw new TypeError(`${path}.input.mediaType must be JPEG or PNG`)
    }
    return {
      ...base,
      modality,
      input: {
        assetPath: string(input.assetPath, `${path}.input.assetPath`),
        mediaType,
        provenance: string(input.provenance, `${path}.input.provenance`),
        assetBrief: string(input.assetBrief, `${path}.input.assetBrief`)
      }
    }
  }
  throw new TypeError(`${path}.modality must be TEXT or IMAGE`)
}

function validateDataset(value: unknown): EvalDataset {
  const dataset = record(value, 'dataset')
  const schemaVersion = string(dataset.schemaVersion, 'schemaVersion')
  if (schemaVersion !== '1.0') throw new TypeError('schemaVersion must be 1.0')
  if (!Array.isArray(dataset.cases) || dataset.cases.length < 30) {
    throw new TypeError('cases must contain at least 30 entries')
  }
  const cases = dataset.cases.map(validateCase)
  const ids = new Set<string>()
  for (const evalCase of cases) {
    if (ids.has(evalCase.id)) throw new TypeError(`Duplicate case id: ${evalCase.id}`)
    ids.add(evalCase.id)
  }
  const context = record(dataset.fixedAssessmentContext, 'fixedAssessmentContext')
  const daily = record(context.dailyCalorieRange, 'fixedAssessmentContext.dailyCalorieRange')
  if (!Array.isArray(context.todayMealRanges)) {
    throw new TypeError('fixedAssessmentContext.todayMealRanges must be an array')
  }
  const unknownHandling = string(
    context.unknownHandling,
    'fixedAssessmentContext.unknownHandling'
  )
  if (unknownHandling !== 'CONSERVATIVE_FALLBACK') {
    throw new TypeError('unknownHandling must be CONSERVATIVE_FALLBACK')
  }
  const scoring = record(dataset.scoringNotes, 'scoringNotes')
  return {
    schemaVersion,
    datasetId: string(dataset.datasetId, 'datasetId'),
    status: string(dataset.status, 'status'),
    title: string(dataset.title, 'title'),
    description: string(dataset.description, 'description'),
    fixedAssessmentContext: {
      dailyCalorieRange: {
        min: number(daily.min, 'fixedAssessmentContext.dailyCalorieRange.min'),
        max: number(daily.max, 'fixedAssessmentContext.dailyCalorieRange.max')
      },
      todayMealRanges: context.todayMealRanges.map((entry, index) => {
        const range = record(entry, `fixedAssessmentContext.todayMealRanges[${index}]`)
        return {
          min: number(range.min, `fixedAssessmentContext.todayMealRanges[${index}].min`),
          max: number(range.max, `fixedAssessmentContext.todayMealRanges[${index}].max`)
        }
      }),
      now: string(context.now, 'fixedAssessmentContext.now'),
      unknownHandling
    },
    scoringNotes: Object.fromEntries(
      Object.entries(scoring).map(([key, entry]) => [key, string(entry, `scoringNotes.${key}`)])
    ),
    cases
  }
}

export async function loadEvalDataset(path: string): Promise<EvalDataset> {
  return validateDataset(JSON.parse(await readFile(path, 'utf8')))
}
