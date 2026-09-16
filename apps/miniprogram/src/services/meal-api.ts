import type {
  ApiErrorCode,
  ApiErrorResponse,
  AssessMealRequest,
  CreateMealRecordRequest,
  DemoProfile,
  MealAssessment,
  MealRecord,
  MealRecordsResponse
} from '@food-sense/shared'
import Taro from '@tarojs/taro'

export type MealApiErrorCode =
  | ApiErrorCode
  | 'NETWORK_ERROR'
  | 'API_NOT_CONFIGURED'

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

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false
  }

  const error = value.error
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string' &&
    'retryable' in error &&
    typeof error.retryable === 'boolean'
  )
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

async function postJson<T>(path: string, data: unknown): Promise<T> {
  try {
    const response = await Taro.request<T | ApiErrorResponse>({
      url: apiUrl(path),
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data
    })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.data as T
    }

    if (isApiErrorResponse(response.data)) {
      throw new MealApiError(
        response.data.error.code,
        response.data.error.message,
        response.data.error.retryable
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
      '网络连接失败，你的内容仍然保留，可以稍后重试。',
      true
    )
  }
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

    if (isApiErrorResponse(response.data)) {
      throw new MealApiError(
        response.data.error.code,
        response.data.error.message,
        response.data.error.retryable
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
