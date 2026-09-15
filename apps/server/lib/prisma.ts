import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  foodSensePrisma?: PrismaClient
}

export const prisma = globalForPrisma.foodSensePrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.foodSensePrisma = prisma
}
