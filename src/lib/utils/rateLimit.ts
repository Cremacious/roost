/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Each Vercel serverless function instance has its own memory, so this provides
 * per-instance protection rather than globally consistent limits. That is still
 * a meaningful barrier against burst abuse (scripts, automation) because:
 *   1. The attacker must exhaust the limit on each instance independently.
 *   2. Vercel's load balancer is not guaranteed to pin requests to the same
 *      instance, so automated bursts will frequently hit fresh instances.
 *
 * For globally consistent rate limiting (e.g., strict quota enforcement across
 * all instances), replace with Upstash Redis + @upstash/ratelimit when the
 * operational cost becomes justified.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
 *   const result = limiter.check(userId)
 *   if (!result.allowed) return 429 response with result.retryAfterMs
 */

export interface RateLimitResult {
  /** Whether the request is within the allowed window. */
  allowed: boolean
  /** Requests remaining in the current window. */
  remaining: number
  /** Milliseconds until the window resets (useful for Retry-After header). */
  retryAfterMs: number
}

interface RateLimiterOptions {
  /** Duration of the sliding window in milliseconds. */
  windowMs: number
  /** Maximum number of requests allowed within the window. */
  maxRequests: number
}

interface WindowEntry {
  count: number
  windowStart: number
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests } = options
  // Map is module-scoped: persists for the lifetime of this function instance.
  const store = new Map<string, WindowEntry>()

  // Periodically evict expired entries so the Map does not grow unbounded on
  // long-lived instances. We do this lazily on check() rather than on a timer
  // to avoid setInterval keeping the process alive in Edge Runtime.
  let lastEviction = Date.now()
  function maybeEvict() {
    const now = Date.now()
    if (now - lastEviction < windowMs) return
    lastEviction = now
    for (const [key, entry] of store) {
      if (now - entry.windowStart > windowMs) store.delete(key)
    }
  }

  return {
    check(key: string): RateLimitResult {
      maybeEvict()
      const now = Date.now()
      const entry = store.get(key)

      if (!entry || now - entry.windowStart > windowMs) {
        // New window for this key
        store.set(key, { count: 1, windowStart: now })
        return { allowed: true, remaining: maxRequests - 1, retryAfterMs: windowMs }
      }

      if (entry.count >= maxRequests) {
        const retryAfterMs = windowMs - (now - entry.windowStart)
        return { allowed: false, remaining: 0, retryAfterMs }
      }

      entry.count += 1
      const retryAfterMs = windowMs - (now - entry.windowStart)
      return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs }
    },

    /** Reset the counter for a key (e.g., on successful auth to clear lockout). */
    reset(key: string) {
      store.delete(key)
    },
  }
}
