import { createMealParseHandlers } from '../../../lib/meal-parse-handlers'

export const dynamic = 'force-dynamic'

const handlers = createMealParseHandlers()

export const POST = handlers.POST
