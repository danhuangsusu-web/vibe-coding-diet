import { createMealAssessmentHandlers } from '../../../lib/meal-assessment-handlers'
import { prisma } from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

const handlers = createMealAssessmentHandlers(prisma)

export const POST = handlers.POST
