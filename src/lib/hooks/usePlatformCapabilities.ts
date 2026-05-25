'use client'

import { useSyncExternalStore } from 'react'

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
 * navigator-derived flags use useSyncExternalStore so the server snapshot is
 * false and the client snapshot resolves after hydration, with no hydration
 * mismatch and without calling setState inside an effect.
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

// These flags never change during a session, so the subscribe is a no-op.
const noopSubscribe = () => () => {}

function getHasNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

function getIsMobileWeb(): boolean {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

const serverFalse = () => false

export function usePlatformCapabilities(): PlatformCapabilities {
  const hasNativeShare = useSyncExternalStore(noopSubscribe, getHasNativeShare, serverFalse)
  const isMobileWeb = useSyncExternalStore(noopSubscribe, getIsMobileWeb, serverFalse)

  return { canPush: WEB_CAN_PUSH, hasNativeShare, isMobileWeb }
}
