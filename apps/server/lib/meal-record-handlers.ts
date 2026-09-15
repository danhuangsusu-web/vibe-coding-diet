import {
  createMealRecordRequestSchema,
  type ApiError,
  type ApiErrorResponse
} from '@food-sense/shared'
import { NextResponse } from 'next/server'

import {
  createMealRecord,
  getRecentMealRecords,
  UnknownDishError,
  type MealRecordDatabase
} from './meal-record-service'
import { DemoProfileNotFoundError } from './profile-service'

const VALIDATION_ERROR: ApiError = {
  code: 'VALIDATION_FAILED',
  message: '输入内容不符合要求，请检查后重试。',
  retryable: false
}

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

const UNKNOWN_DISH_ERROR: ApiError = {
  code: 'UNKNOWN_DISH',
  message: '暂时无法可靠估算该菜品，请先补充食材或做法。',
  retryable: false
}

function errorResponse(error: ApiError, status: number) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status })
}

export function createMealRecordHandlers(
  database: MealRecordDatabase,
  nowProvider: () => Date = () => new Date()
) {
  return {
    async GET() {
      try {
        const records = await getRecentMealRecords(database, nowProvider())
        return NextResponse.json(records)
      } catch (error) {
        if (error instanceof DemoProfileNotFoundError) {
          return errorResponse(PROFILE_MISSING_ERROR, 503)
        }

        return errorResponse(DATABASE_ERROR, 503)
      }
    },

    async POST(request: Request) {
      let body: unknown

      try {
        body = await request.json()
      } catch {
        return errorResponse(VALIDATION_ERROR, 400)
      }

      const parsed = createMealRecordRequestSchema.safeParse(body)

      if (!parsed.success) {
        return errorResponse(VALIDATION_ERROR, 400)
      }

      try {
        const result = await createMealRecord(
          database,
          parsed.data,
          nowProvider()
        )

        return NextResponse.json(result.record, {
          status: result.created ? 201 : 200
        })
      } catch (error) {
        if (error instanceof DemoProfileNotFoundError) {
          return errorResponse(PROFILE_MISSING_ERROR, 503)
        }

        if (error instanceof UnknownDishError) {
          return errorResponse(UNKNOWN_DISH_ERROR, 422)
        }

        return errorResponse(DATABASE_ERROR, 503)
      }
    }
  }
}
