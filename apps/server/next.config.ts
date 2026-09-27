import type { NextConfig } from 'next'

const isolatedBuildDirectory = process.env.FOOD_SENSE_NEXT_DIST_DIR?.trim()

const nextConfig: NextConfig = {
  ...(isolatedBuildDirectory ? { distDir: isolatedBuildDirectory } : {}),
  transpilePackages: ['@food-sense/shared', '@food-sense/nutrition']
}

export default nextConfig
