import type { ApiErrorCode } from '@food-sense/shared'

import { MealApiError, type MealApiErrorCode } from './meal-api'

export type MealErrorRecovery =
  | 'USE_OFFLINE_SAMPLE'
  | 'RETRY_OR_USE_TEXT'
  | 'EDIT_INPUT'
  | 'RESELECT_IMAGE'
  | 'EDIT_PROFILE'
  | 'RETRY_LATER'
  | 'REFRESH_RECORDS'
  | 'CONFIRM_FALLBACK'

export interface MealErrorPresentation {
  code: MealApiErrorCode
  message: string
  recovery: MealErrorRecovery
  retryable: boolean
}

const API_ERROR_PRESENTATIONS: Record<
  ApiErrorCode,
  Pick<MealErrorPresentation, 'message' | 'recovery'>
> = {
  AI_NOT_CONFIGURED: {
    message: 'AI 服务尚未配置，请使用离线样例或联系维护者。',
    recovery: 'USE_OFFLINE_SAMPLE'
  },
  AI_TIMEOUT: {
    message: '分析时间较长，已经停止等待。你的内容仍然保留，可以重新尝试。',
    recovery: 'RETRY_OR_USE_TEXT'
  },
  AI_INVALID_OUTPUT: {
    message: '本次结果无法可靠解析，请修改描述或换一张图片。',
    recovery: 'EDIT_INPUT'
  },
  NO_MEAL_DETECTED: {
    message: '没有识别到餐食，请重新拍摄或改用文字描述。',
    recovery: 'EDIT_INPUT'
  },
  IMAGE_TOO_LARGE: {
    message: '图片仍然过大，请重新选择或裁剪后再试。',
    recovery: 'RESELECT_IMAGE'
  },
  IMAGE_UNSUPPORTED: {
    message: '暂不支持这种图片格式，请使用 JPG、PNG 或重新拍摄。',
    recovery: 'RESELECT_IMAGE'
  },
  IMAGE_COMPRESS_FAILED: {
    message: '图片处理失败，请重试或改用文字描述。',
    recovery: 'RETRY_OR_USE_TEXT'
  },
  PROFILE_INVALID_RANGE: {
    message: '每日范围设置无效，请修正上下限后重试。',
    recovery: 'EDIT_PROFILE'
  },
  DB_UNAVAILABLE: {
    message: '数据暂时无法读取或保存，你的内容仍然保留，请稍后重试。',
    recovery: 'RETRY_LATER'
  },
  MEAL_NOT_FOUND: {
    message: '记录不存在或已删除，请刷新记录列表。',
    recovery: 'REFRESH_RECORDS'
  },
  VALIDATION_FAILED: {
    message: '输入内容不符合要求，请检查后重试。',
    recovery: 'EDIT_INPUT'
  },
  UNKNOWN_DISH: {
    message: '暂时无法可靠估算该菜品，请补充信息，或确认使用宽范围估算。',
    recovery: 'CONFIRM_FALLBACK'
  }
}

export function mealErrorPresentation(error: unknown): MealErrorPresentation {
  if (error instanceof MealApiError) {
    const presentation =
      error.code in API_ERROR_PRESENTATIONS
        ? API_ERROR_PRESENTATIONS[error.code as ApiErrorCode]
        : null

    if (presentation) {
      return {
        code: error.code,
        message: presentation.message,
        recovery: presentation.recovery,
        retryable: error.retryable
      }
    }

    if (error.code === 'API_NOT_CONFIGURED') {
      return {
        code: error.code,
        message: '服务地址尚未配置，请使用离线样例或联系维护者。',
        recovery: 'USE_OFFLINE_SAMPLE',
        retryable: false
      }
    }

    if (error.code === 'REQUEST_ABORTED') {
      return {
        code: error.code,
        message: '请求已取消，你的内容仍然保留。',
        recovery: 'EDIT_INPUT',
        retryable: false
      }
    }
  }

  return {
    code: 'NETWORK_ERROR',
    message: '网络连接失败，你的内容仍然保留，可以稍后重试。',
    recovery: 'RETRY_LATER',
    retryable: true
  }
}
