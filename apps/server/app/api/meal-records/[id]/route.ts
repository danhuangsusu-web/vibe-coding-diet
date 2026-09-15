import { createMealRecordDeleteHandler } from '../../../../lib/meal-record-delete-handler'
import { prisma } from '../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export const DELETE = createMealRecordDeleteHandler(prisma)
