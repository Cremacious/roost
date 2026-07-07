export async function register() {
  // Validate required environment variables once, at server startup, in the
  // Node.js runtime only. This is the place Next.js runs boot-time code, so a
  // missing required secret fails fast here instead of surfacing as a cryptic
  // runtime error deep inside a library on the first request.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env')
    validateEnv()
  }
}
