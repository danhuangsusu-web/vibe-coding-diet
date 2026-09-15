import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@food-sense/shared', '@food-sense/nutrition']
}

export default nextConfig
