import {
  updateDemoProfileRequestSchema,
  type ApiError,
  type ApiErrorResponse
} from '@food-sense/shared'
import { NextResponse } from 'next/server'

import {
  DemoProfileNotFoundError,
  getDemoProfile,
  updateDemoProfile,
  type ProfileDatabase
} from './profile-service'

const PROFILE_MISSING_ERROR: ApiError = {
  code: 'DB_UNAVAILABLE',
  message: '演示资料尚未初始化，请先运行 pnpm db:seed。',
  retryable: true
}

const DATABASE_ERROR: ApiError = {
  code: 'DB_UNAVAILABLE',
  message: '数据暂时无法读取或保存，请稍后重试。',
  retryable: true
}

const VALIDATION_ERROR: ApiError = {
  code: 'VALIDATION_FAILED',
  message: '输入内容不符合要求，请检查后重试。',
  retryable: false
}

const RANGE_ERROR: ApiError = {
  code: 'PROFILE_INVALID_RANGE',
  message: '每日范围设置无效，请确保上下限为正整数且下限小于上限。',
  retryable: false
}

function errorResponse(error: ApiError, status: number) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status })
}

function hasDailyRangeIssue(
  issues: readonly { path: readonly PropertyKey[] }[]
): boolean {
  return issues.some(
    ({ path }) =>
      path[0] === 'dailyCalorieMin' || path[0] === 'dailyCalorieMax'
  )
}

export function createProfileHandlers(database: ProfileDatabase) {
  return {
    async GET() {
      try {
        const profile = await getDemoProfile(database)

        if (!profile) {
          return errorResponse(PROFILE_MISSING_ERROR, 503)
        }

        return NextResponse.json(profile)
      } catch {
        return errorResponse(DATABASE_ERROR, 503)
      }
    },

    async PATCH(request: Request) {
      let body: unknown

      try {
        body = await request.json()
      } catch {
        return errorResponse(VALIDATION_ERROR, 400)
      }

      const parsed = updateDemoProfileRequestSchema.safeParse(body)

      if (!parsed.success) {
        return errorResponse(
          hasDailyRangeIssue(parsed.error.issues)
            ? RANGE_ERROR
            : VALIDATION_ERROR,
          400
        )
      }

      try {
        const profile = await updateDemoProfile(database, parsed.data)
        return NextResponse.json(profile)
      } catch (error) {
        if (error instanceof DemoProfileNotFoundError) {
          return errorResponse(PROFILE_MISSING_ERROR, 503)
        }

        return errorResponse(DATABASE_ERROR, 503)
      }
    }
  }
}
