import type { NextConfig } from 'next'
import path from 'node:path'

const repoRoot = path.join(__dirname, '../..')

const nextConfig: NextConfig = {
  // Shared code is shipped as TypeScript source and compiled by each app.
  transpilePackages: ['@revision-app/core'],
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
}

export default nextConfig
