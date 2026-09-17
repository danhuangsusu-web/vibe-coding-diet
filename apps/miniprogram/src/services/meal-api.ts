import type {
  ApiErrorCode,
  ApiErrorResponse,
  AssessMealRequest,
  CreateMealRecordRequest,
  DemoProfile,
  MealAssessment,
  MealRecord,
  MealRecordsResponse,
  ParsedMeal,
  UpdateDemoProfileRequest
} from '@food-sense/shared'
import Taro from '@tarojs/taro'

export type MealApiErrorCode =
  | ApiErrorCode
  | 'NETWORK_ERROR'
  | 'API_NOT_CONFIGURED'
  | 'REQUEST_ABORTED'

export interface CancellableTask<T> {
  promise: Promise<T>
  cancel: () => void
}

interface JsonResponse<T> {
  data: T
  statusCode: number
  header: Record<string, unknown>
}

type AbortableRequest<T> = Promise<JsonResponse<T>> & { abort: () => void }

export class MealApiError extends Error {
  code: MealApiErrorCode
  retryable: boolean

  constructor(code: MealApiErrorCode, message: string, retryable: boolean) {
    super(message)
    this.name = 'MealApiError'
    this.code = code
    this.retryable = retryable
  }
}

function parseApiErrorResponse(value: unknown) {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return null
  }

  const error = value.error
  if (
    Object.keys(value).length !== 1 ||
    typeof error !== 'object' ||
    error === null ||
    Object.keys(error).length !== 3 ||
    !('code' in error) ||
    typeof error.code !== 'string' ||
    !(error.code in API_ERROR_RETRYABILITY) ||
    !('message' in error) ||
    typeof error.message !== 'string' ||
    error.message.trim().length === 0 ||
    !('retryable' in error) ||
    typeof error.retryable !== 'boolean'
  ) {
    return null
  }

  const code = error.code as ApiErrorCode
  if (error.retryable !== API_ERROR_RETRYABILITY[code]) return null

  return {
    error: {
      code,
      message: error.message,
      retryable: error.retryable
    }
  }
}

const API_ERROR_RETRYABILITY = {
  AI_NOT_CONFIGURED: false,
  AI_TIMEOUT: true,
  AI_INVALID_OUTPUT: false,
  NO_MEAL_DETECTED: false,
  IMAGE_TOO_LARGE: false,
  IMAGE_UNSUPPORTED: false,
  IMAGE_COMPRESS_FAILED: true,
  PROFILE_INVALID_RANGE: false,
  DB_UNAVAILABLE: true,
  MEAL_NOT_FOUND: false,
  VALIDATION_FAILED: false,
  UNKNOWN_DISH: false
} as const satisfies Record<ApiErrorCode, boolean>

function transportFailure(
  error: unknown,
  fallbackMessage: string
): MealApiError {
  const errMsg =
    typeof error === 'object' &&
    error !== null &&
    'errMsg' in error &&
    typeof error.errMsg === 'string'
      ? error.errMsg.toLowerCase()
      : ''

  if (errMsg.includes('timeout')) {
    return new MealApiError(
      'AI_TIMEOUT',
      '分析时间较长，已经停止等待。你的内容仍然保留，可以重新尝试。',
      true
    )
  }

  if (errMsg.includes('abort')) {
    return new MealApiError('REQUEST_ABORTED', '请求已取消。', false)
  }

  return new MealApiError('NETWORK_ERROR', fallbackMessage, true)
}

function apiUrl(path: string): string {
  if (!__API_BASE_URL__) {
    throw new MealApiError(
      'API_NOT_CONFIGURED',
      '服务地址尚未配置，请在开发环境中设置接口地址。',
      false
    )
  }

  return `${__API_BASE_URL__}${path}`
}

function postJsonResponseTask<T>(
  path: string,
  data: unknown,
  timeout?: number
): CancellableTask<JsonResponse<T>> {
  let requestTask: AbortableRequest<T | unknown>

  try {
    requestTask = Taro.request({
      url: apiUrl(path),
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data,
      ...(timeout ? { timeout } : {})
    }) as unknown as AbortableRequest<T | unknown>
  } catch (error) {
    const failure =
      error instanceof MealApiError
        ? error
        : transportFailure(
            error,
            '网络连接失败，你的内容仍然保留，可以稍后重试。'
          )
    return { promise: Promise.reject(failure), cancel: () => undefined }
  }

  const promise = requestTask
    .then((response) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response as JsonResponse<T>
      }

      const apiError = parseApiErrorResponse(response.data)
      if (apiError) {
        throw new MealApiError(
          apiError.error.code,
          apiError.error.message,
          apiError.error.retryable
        )
      }

      throw new MealApiError(
        'NETWORK_ERROR',
        '服务暂时没有返回可用结果，请稍后重试。',
        true
      )
    })
    .catch((error: unknown) => {
      if (error instanceof MealApiError) throw error
      throw transportFailure(
        error,
        '网络连接失败，你的内容仍然保留，可以稍后重试。'
      )
    })

  return {
    promise,
    cancel: () => requestTask.abort()
  }
}

async function postJsonResponse<T>(
  path: string,
  data: unknown,
  timeout?: number
) {
  return postJsonResponseTask<T>(path, data, timeout).promise
}

async function postJson<T>(path: string, data: unknown): Promise<T> {
  const response = await postJsonResponse<T>(path, data)
  return response.data as T
}

function responseHeader(
  headers: Record<string, unknown>,
  expectedName: string
): string | undefined {
  const entry = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === expectedName.toLowerCase()
  )
  const value = typeof entry?.[1] === 'string' ? entry[1].trim() : undefined
  return value || undefined
}

export interface MealParseResult {
  parsedMeal: ParsedMeal
  metadata: {
    isDemo: boolean
    modelVersion?: string
    promptVersion?: string
  }
}

function mealParseResultFromResponse(
  response: JsonResponse<ParsedMeal>
): MealParseResult {
  const modelVersion = responseHeader(
    response.header,
    'x-food-sense-model-version'
  )
  const promptVersion = responseHeader(
    response.header,
    'x-food-sense-prompt-version'
  )

  return {
    parsedMeal: response.data,
    metadata: {
      isDemo:
        responseHeader(response.header, 'x-food-sense-is-demo') === 'true',
      ...(modelVersion ? { modelVersion } : {}),
      ...(promptVersion ? { promptVersion } : {})
    }
  }
}

export function startTextMealParse(
  sourceText: string
): CancellableTask<MealParseResult> {
  const task = postJsonResponseTask<ParsedMeal>(
    '/api/parse-meal',
    { sourceType: 'TEXT', sourceText },
    20_000
  )

  return {
    promise: task.promise.then(mealParseResultFromResponse),
    cancel: task.cancel
  }
}

export function parseTextMeal(sourceText: string): Promise<MealParseResult> {
  return startTextMealParse(sourceText).promise
}

function parseUploadResponseBody(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export function startImageMealParse(
  localPath: string
): CancellableTask<MealParseResult> {
  let uploadTask: ReturnType<typeof Taro.uploadFile>

  try {
    uploadTask = Taro.uploadFile({
      url: apiUrl('/api/parse-meal'),
      filePath: localPath,
      name: 'image',
      timeout: 20_000
    })
  } catch (error) {
    const failure =
      error instanceof MealApiError
        ? error
        : transportFailure(
            error,
            '图片上传失败，你的图片仍然保留，可以稍后重试。'
          )
    return { promise: Promise.reject(failure), cancel: () => undefined }
  }

  const promise = uploadTask
    .then((response) => {
      const body = parseUploadResponseBody(response.data)
      if (response.statusCode < 200 || response.statusCode >= 300) {
        const apiError = parseApiErrorResponse(body)
        if (apiError) {
          throw new MealApiError(
            apiError.error.code,
            apiError.error.message,
            apiError.error.retryable
          )
        }
        throw new MealApiError(
          'NETWORK_ERROR',
          '服务暂时没有返回可用结果，请稍后重试。',
          true
        )
      }

      if (typeof body !== 'object' || body === null || !('items' in body)) {
        throw new MealApiError(
          'NETWORK_ERROR',
          '服务暂时没有返回可用结果，请稍后重试。',
          true
        )
      }

      const headers = response.header ?? {}
      const modelVersion = responseHeader(
        headers,
        'x-food-sense-model-version'
      )
      const promptVersion = responseHeader(
        headers,
        'x-food-sense-prompt-version'
      )
      return {
        parsedMeal: body as ParsedMeal,
        metadata: {
          isDemo: responseHeader(headers, 'x-food-sense-is-demo') === 'true',
          ...(modelVersion ? { modelVersion } : {}),
          ...(promptVersion ? { promptVersion } : {})
        }
      }
    })
    .catch((error: unknown) => {
      if (error instanceof MealApiError) throw error
      throw transportFailure(
        error,
        '图片上传失败，你的图片仍然保留，可以稍后重试。'
      )
    })

  return { promise, cancel: () => uploadTask.abort() }
}

export function parseImageMeal(localPath: string): Promise<MealParseResult> {
  return startImageMealParse(localPath).promise
}

async function getJson<T>(path: string): Promise<T> {
  try {
    const response = await Taro.request<T | ApiErrorResponse>({
      url: apiUrl(path),
      method: 'GET'
    })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.data as T
    }

    const apiError = parseApiErrorResponse(response.data)
    if (apiError) {
      throw new MealApiError(
        apiError.error.code,
        apiError.error.message,
        apiError.error.retryable
      )
    }

    throw new MealApiError(
      'NETWORK_ERROR',
      '服务暂时没有返回可用结果，请稍后重试。',
      true
    )
  } catch (error) {
    if (error instanceof MealApiError) throw error

    throw new MealApiError(
      'NETWORK_ERROR',
      '网络连接失败，请稍后重试。',
      true
    )
  }
}

async function patchJson<T>(path: string, data: unknown): Promise<T> {
  try {
    const response = await Taro.request<T | ApiErrorResponse>({
      url: apiUrl(path),
      method: 'PATCH',
      header: { 'content-type': 'application/json' },
      data
    })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.data as T
    }

    const apiError = parseApiErrorResponse(response.data)
    if (apiError) {
      throw new MealApiError(
        apiError.error.code,
        apiError.error.message,
        apiError.error.retryable
      )
    }

    throw new MealApiError(
      'NETWORK_ERROR',
      '服务暂时没有返回可用结果，请稍后重试。',
      true
    )
  } catch (error) {
    if (error instanceof MealApiError) throw error

    throw new MealApiError(
      'NETWORK_ERROR',
      '网络连接失败，你的设置仍然保留，可以稍后重试。',
      true
    )
  }
}

async function deleteJson(path: string): Promise<void> {
  try {
    const response = await Taro.request<unknown | ApiErrorResponse>({
      url: apiUrl(path),
      method: 'DELETE'
    })

    if (response.statusCode >= 200 && response.statusCode < 300) return

    const apiError = parseApiErrorResponse(response.data)
    if (apiError) {
      throw new MealApiError(
        apiError.error.code,
        apiError.error.message,
        apiError.error.retryable
      )
    }

    throw new MealApiError(
      'NETWORK_ERROR',
      '服务暂时没有返回可用结果，请稍后重试。',
      true
    )
  } catch (error) {
    if (error instanceof MealApiError) throw error

    throw new MealApiError(
      'NETWORK_ERROR',
      '网络连接失败，记录没有从页面移除，请稍后重试。',
      true
    )
  }
}

export function assessConfirmedMeal(
  request: AssessMealRequest
): Promise<MealAssessment> {
  return postJson<MealAssessment>('/api/assess-meal', request)
}

export function saveMealRecord(
  request: CreateMealRecordRequest
): Promise<MealRecord> {
  return postJson<MealRecord>('/api/meal-records', request)
}

export function getMealRecords(): Promise<MealRecordsResponse> {
  return getJson<MealRecordsResponse>('/api/meal-records')
}

export function getDemoProfile(): Promise<DemoProfile> {
  return getJson<DemoProfile>('/api/profile')
}

export function updateDemoProfile(
  request: UpdateDemoProfileRequest
): Promise<DemoProfile> {
  return patchJson<DemoProfile>('/api/profile', request)
}

export function deleteMealRecord(recordId: string): Promise<void> {
  return deleteJson(`/api/meal-records/${encodeURIComponent(recordId)}`)
}
