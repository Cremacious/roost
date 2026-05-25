/**
 * Share text via the native Web Share API when available (most mobile browsers
 * and the future Expo app), falling back to copying to the clipboard.
 *
 * Returns how the content was delivered so callers can tailor their feedback:
 *  - 'shared'  the native share sheet handled it
 *  - 'copied'  copied to the clipboard as a fallback
 *  - 'failed'  nothing happened (user cancelled the share sheet, or no API)
 *
 * Callers own their own toast/UI feedback. This util never shows a toast.
 */

export interface SharePayload {
  title?: string
  text?: string
  url?: string
}

export async function shareOrCopy(
  payload: SharePayload,
  copyText?: string,
): Promise<'shared' | 'copied' | 'failed'> {
  const fallback = copyText ?? payload.url ?? payload.text ?? ''

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      // User dismissed the share sheet: treat as a no-op, do not also copy.
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
      // Any other share error falls through to the clipboard path below.
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && fallback) {
    try {
      await navigator.clipboard.writeText(fallback)
      return 'copied'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}
