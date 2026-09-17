import {
  textMealParseRequestSchema,
  type ApiError,
  type ApiErrorResponse,
  type ParsedMeal
} from '@food-sense/shared'
import { NextResponse } from 'next/server'

import {
  AI_IMAGE_MEAL_PROMPT_VERSION,
  AI_MEAL_PROMPT_VERSION,
  AiMealCancelledError,
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
    message: '本次结果无法可靠解析，请修改描述或换一张图片后重试。',
    retryable: false
  },
  noMeal: {
    code: 'NO_MEAL_DETECTED',
    message: '没有识别到餐食，请重新拍摄或改用文字描述。',
    retryable: false
  },
  imageTooLarge: {
    code: 'IMAGE_TOO_LARGE',
    message: '图片仍然过大，请重新选择或裁剪后再试。',
    retryable: false
  },
  imageUnsupported: {
    code: 'IMAGE_UNSUPPORTED',
    message: '暂不支持这种图片格式，请使用 JPG、PNG 或重新拍摄。',
    retryable: false
  }
} as const satisfies Record<string, ApiError>

export const MAX_IMAGE_REQUEST_BYTES = 2 * 1024 * 1024

class MealImageRequestError extends Error {
  constructor(
    readonly code: 'IMAGE_TOO_LARGE' | 'IMAGE_UNSUPPORTED' | 'VALIDATION_FAILED'
  ) {
    super(code)
    this.name = 'MealImageRequestError'
  }
}

async function readRequestBodyWithinLimit(
  request: Request,
  maximumBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new MealImageRequestError('IMAGE_TOO_LARGE')
  }

  if (!request.body) throw new MealImageRequestError('VALIDATION_FAILED')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    byteLength += value.byteLength
    if (byteLength > maximumBytes) {
      await reader.cancel()
      throw new MealImageRequestError('IMAGE_TOO_LARGE')
    }
    chunks.push(value)
  }

  const body = new Uint8Array(new ArrayBuffer(byteLength))
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function detectedImageMediaType(
  bytes: Uint8Array
): 'image/jpeg' | 'image/png' | null {
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  if (isJpeg) return 'image/jpeg'

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (
    bytes.length >= pngSignature.length &&
    pngSignature.every((value, index) => bytes[index] === value)
  ) {
    return 'image/png'
  }

  return null
}

async function parseImageRequest(
  request: Request,
  contentType: string
): Promise<MealParseInput> {
  const body = await readRequestBodyWithinLimit(
    request,
    MAX_IMAGE_REQUEST_BYTES
  )
  let form: FormData

  try {
    form = await new Response(body.buffer, {
      headers: { 'content-type': contentType }
    }).formData()
  } catch {
    throw new MealImageRequestError('VALIDATION_FAILED')
  }

  const images = form.getAll('image')
  const hasUnexpectedField = Array.from(form.keys()).some(
    (key) => key !== 'image'
  )
  if (images.length !== 1 || hasUnexpectedField || !(images[0] instanceof Blob)) {
    throw new MealImageRequestError('VALIDATION_FAILED')
  }

  const file = images[0]
  const declaredType =
    file.type.toLowerCase() === 'image/jpg'
      ? 'image/jpeg'
      : file.type.toLowerCase()
  const image = new Uint8Array(await file.arrayBuffer())
  const mediaType = detectedImageMediaType(image)
  const canInferTypeFromBytes =
    declaredType === '' || declaredType === 'application/octet-stream'
  if (
    !mediaType ||
    (!canInferTypeFromBytes && mediaType !== declaredType)
  ) {
    throw new MealImageRequestError('IMAGE_UNSUPPORTED')
  }

  return { sourceType: 'IMAGE', image, mediaType }
}

async function parseRequest(request: Request): Promise<MealParseInput> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    return parseImageRequest(request, contentType)
  }

  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new MealImageRequestError('VALIDATION_FAILED')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new MealImageRequestError('VALIDATION_FAILED')
  }

  const parsedRequest = textMealParseRequestSchema.safeParse(body)
  if (!parsedRequest.success) {
    throw new MealImageRequestError('VALIDATION_FAILED')
  }
  return parsedRequest.data
}

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
      let parsedRequest: MealParseInput
      try {
        parsedRequest = await parseRequest(request)
      } catch (error) {
        if (error instanceof MealImageRequestError) {
          if (error.code === 'IMAGE_TOO_LARGE') {
            return errorResponse(ERRORS.imageTooLarge, 413)
          }
          if (error.code === 'IMAGE_UNSUPPORTED') {
            return errorResponse(ERRORS.imageUnsupported, 415)
          }
        }
        return errorResponse(ERRORS.validation, 400)
      }

      try {
        const mode = resolveMode()
        const meal = await parse(parsedRequest, {
          mode,
          signal: request.signal
        })
        const headers: Record<string, string> = {
          'x-food-sense-parser-mode': mode,
          'x-food-sense-is-demo': mode === 'offline' ? 'true' : 'false',
          'x-food-sense-model-version':
            mode === 'offline' ? OFFLINE_DEMO_MODEL_VERSION : getAiModelVersion()
        }

        if (mode === 'ai') {
          headers['x-food-sense-prompt-version'] =
            parsedRequest.sourceType === 'IMAGE'
              ? AI_IMAGE_MEAL_PROMPT_VERSION
              : AI_MEAL_PROMPT_VERSION
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

        if (error instanceof AiMealCancelledError) {
          return errorResponse(ERRORS.timeout, 499)
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
