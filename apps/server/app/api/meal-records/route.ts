import { createMealRecordHandlers } from '../../../lib/meal-record-handlers'
import { prisma } from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

const handlers = createMealRecordHandlers(prisma)

export const GET = handlers.GET
export const POST = handlers.POST
