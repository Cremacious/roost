'use client'

import { useEffect, useState } from 'react'

/**
 * Platform capability flags for conditional UI.
 *
 * Push notifications are not available on the web build. The column
 * users.push_token exists for the future Expo (iOS/Android) app, but the web
 * app never registers a token, so any push-only control is a no-op on web.
 * Gate those controls behind `canPush`.
 *
 * In the Expo app this hook is replaced with a native implementation that
 * reports real device capabilities. `canPush` is a build constant here so it is
 * safe to read during the first render with no hydration mismatch. The
 * navigator-derived flags resolve after mount.
 */

// Web build can never deliver push. Flip this in the Expo build.
export const WEB_CAN_PUSH = false

export interface PlatformCapabilities {
  /** Can this platform deliver push notifications? Always false on web today. */
  canPush: boolean
  /** Is the native Web Share API available (most mobile browsers)? */
  hasNativeShare: boolean
  /** Is this a mobile-sized touch browser? */
  isMobileWeb: boolean
}

export function usePlatformCapabilities(): PlatformCapabilities {
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [isMobileWeb, setIsMobileWeb] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    setHasNativeShare(typeof navigator.share === 'function')
    setIsMobileWeb(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))
  }, [])

  return { canPush: WEB_CAN_PUSH, hasNativeShare, isMobileWeb }
}
