import {
  textMealParseRequestSchema,
  type ApiError,
  type ApiErrorResponse,
  type ParsedMeal
} from '@food-sense/shared'
import { NextResponse } from 'next/server'

import {
  AI_MEAL_PROMPT_VERSION,
  AiMealInvalidOutputError,
  AiMealProviderError,
  AiMealTimeoutError,
  NoMealDetectedError
} from './ai-meal-parser'
import {
  AIProviderConfigurationError,
  getMealAnalysisModelConfiguration
} from './ai-provider'
import { OFFLINE_DEMO_MODEL_VERSION } from './demo-meals'
import {
  MealParserConfigurationError,
  OfflineMealSampleNotFoundError,
  parseMeal,
  resolveMealParserMode,
  type MealParseInput,
  type MealParserMode,
  type ParseMealOptions
} from './meal-parser'

const ERRORS = {
  validation: {
    code: 'VALIDATION_FAILED',
    message: '输入内容不符合要求，请检查后重试。',
    retryable: false
  },
  notConfigured: {
    code: 'AI_NOT_CONFIGURED',
    message: 'AI 服务尚未配置，请使用离线样例或联系维护者。',
    retryable: false
  },
  timeout: {
    code: 'AI_TIMEOUT',
    message: '分析时间较长，请重试。',
    retryable: true
  },
  invalidOutput: {
    code: 'AI_INVALID_OUTPUT',
    message: '本次结果无法可靠解析，请修改描述后重试。',
    retryable: false
  },
  noMeal: {
    code: 'NO_MEAL_DETECTED',
    message: '没有识别到餐食，请修改描述后重试。',
    retryable: false
  }
} as const satisfies Record<string, ApiError>

function errorResponse(error: ApiError, status: number) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status })
}

type ParseMealFunction = (
  input: MealParseInput,
  options?: ParseMealOptions
) => Promise<ParsedMeal>

export interface MealParseHandlerDependencies {
  parse?: ParseMealFunction
  resolveMode?: () => MealParserMode
  getAiModelVersion?: () => string
}

export function createMealParseHandlers(
  dependencies: MealParseHandlerDependencies = {}
) {
  const parse = dependencies.parse ?? parseMeal
  const resolveMode = dependencies.resolveMode ?? (() => resolveMealParserMode())
  const getAiModelVersion =
    dependencies.getAiModelVersion ??
    (() => getMealAnalysisModelConfiguration().modelVersion)

  return {
    async POST(request: Request) {
      let body: unknown

      try {
        body = await request.json()
      } catch {
        return errorResponse(ERRORS.validation, 400)
      }

      const parsedRequest = textMealParseRequestSchema.safeParse(body)
      if (!parsedRequest.success) {
        return errorResponse(ERRORS.validation, 400)
      }

      try {
        const mode = resolveMode()
        const meal = await parse(parsedRequest.data, { mode })
        const headers: Record<string, string> = {
          'x-food-sense-parser-mode': mode,
          'x-food-sense-is-demo': mode === 'offline' ? 'true' : 'false',
          'x-food-sense-model-version':
            mode === 'offline' ? OFFLINE_DEMO_MODEL_VERSION : getAiModelVersion()
        }

        if (mode === 'ai') {
          headers['x-food-sense-prompt-version'] = AI_MEAL_PROMPT_VERSION
        }

        return NextResponse.json(meal, { headers })
      } catch (error) {
        if (
          error instanceof AIProviderConfigurationError ||
          error instanceof MealParserConfigurationError
        ) {
          return errorResponse(ERRORS.notConfigured, 503)
        }

        if (
          error instanceof NoMealDetectedError ||
          error instanceof OfflineMealSampleNotFoundError
        ) {
          return errorResponse(ERRORS.noMeal, 422)
        }

        if (error instanceof AiMealTimeoutError) {
          return errorResponse(ERRORS.timeout, 504)
        }

        if (error instanceof AiMealInvalidOutputError) {
          return errorResponse(ERRORS.invalidOutput, 502)
        }

        if (error instanceof AiMealProviderError) {
          if (error.category === 'configuration') {
            return errorResponse(ERRORS.notConfigured, 503)
          }

          return errorResponse(ERRORS.timeout, 503)
        }

        return errorResponse(ERRORS.invalidOutput, 502)
      }
    }
  }
}
