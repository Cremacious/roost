import type { NextConfig } from 'next'

// Validate required env vars at build/start time so missing secrets surface
// immediately rather than as cryptic runtime errors at request time.
// Wrapped in a try/catch during `next build` so CI can still run a type check
// without a full .env file; the build will fail at a later stage if env is wrong.
import { validateEnv } from './src/lib/env'
try {
  validateEnv()
} catch (err) {
  // In CI / build environments the full secret set may not be present.
  // Print the error prominently but don't crash the build process itself
  // (Vercel injects secrets at deploy time, not at build time for most vars).
  console.error((err as Error).message)
}

const nextConfig: NextConfig = {
  turbopack: {
    // Now at monorepo root; packages/ is a sibling of src/
    root: __dirname,
  },
  transpilePackages: ['@roost/constants', '@roost/utils', '@roost/api-types'],
  serverExternalPackages: ['@node-rs/argon2'],
}

export default nextConfig
