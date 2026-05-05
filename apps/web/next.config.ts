import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
  transpilePackages: ['@roost/constants', '@roost/utils', '@roost/api-types'],
  serverExternalPackages: ['@node-rs/argon2'],
}

export default nextConfig
