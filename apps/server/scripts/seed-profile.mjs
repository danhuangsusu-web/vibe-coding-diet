import { pathToFileURL } from 'node:url'

import { PrismaClient } from '@prisma/client'

import {
  DEFAULT_DEMO_PROFILE,
  DEMO_PROFILE_ID
} from '../lib/demo-profile.mjs'

export async function seedDemoProfile(prisma) {
  return prisma.demoProfile.upsert({
    where: { id: DEMO_PROFILE_ID },
    create: DEFAULT_DEMO_PROFILE,
    update: {
      name: DEFAULT_DEMO_PROFILE.name,
      goalDirection: DEFAULT_DEMO_PROFILE.goalDirection,
      dailyCalorieMin: DEFAULT_DEMO_PROFILE.dailyCalorieMin,
      dailyCalorieMax: DEFAULT_DEMO_PROFILE.dailyCalorieMax
    }
  })
}

async function main() {
  const prisma = new PrismaClient()

  try {
    const profile = await seedDemoProfile(prisma)
    console.log(`Demo profile is ready: ${profile.id}`)
  } finally {
    await prisma.$disconnect()
  }
}

const entryPoint = process.argv[1]

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  await main()
}
