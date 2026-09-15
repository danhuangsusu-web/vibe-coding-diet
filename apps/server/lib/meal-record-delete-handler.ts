import type { ApiError, ApiErrorResponse } from '@food-sense/shared'
import { NextResponse } from 'next/server'

import {
  deleteMealRecord,
  type MealRecordDatabase
} from './meal-record-service'

const NOT_FOUND_ERROR: ApiError = {
  code: 'MEAL_NOT_FOUND',
  message: '记录不存在或已删除，请刷新记录列表。',
  retryable: false
}

const DATABASE_ERROR: ApiError = {
  code: 'DB_UNAVAILABLE',
  message: '数据暂时无法读取或保存，请稍后重试。',
  retryable: true
}

function errorResponse(error: ApiError, status: number) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status })
}

export interface MealRecordRouteContext {
  params: Promise<{ id: string }>
}

export function createMealRecordDeleteHandler(database: MealRecordDatabase) {
  return async function DELETE(
    _request: Request,
    context: MealRecordRouteContext
  ) {
    try {
      const { id } = await context.params

      if (!id.trim()) {
        return errorResponse(NOT_FOUND_ERROR, 404)
      }

      const deleted = await deleteMealRecord(database, id)

      if (!deleted) {
        return errorResponse(NOT_FOUND_ERROR, 404)
      }

      return new NextResponse(null, { status: 204 })
    } catch {
      return errorResponse(DATABASE_ERROR, 503)
    }
  }
}
