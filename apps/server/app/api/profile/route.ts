import { createProfileHandlers } from '../../../lib/profile-handlers'
import { prisma } from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

const handlers = createProfileHandlers(prisma)

export const GET = handlers.GET
export const PATCH = handlers.PATCH
