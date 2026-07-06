'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'roost-admin-hide-test'

// Module-level listener set so a write in the current tab re-renders every
// consumer (the native 'storage' event only fires in *other* tabs).
const listeners = new Set<() => void>()

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Server always renders "show all" so the markup is stable; React reconciles to
// the real localStorage value on the client after hydration.
function getServerSnapshot(): boolean {
  return false
}

/**
 * Shared "hide test accounts" toggle for the admin panel, persisted to
 * localStorage so the choice is consistent across Overview / Users /
 * Households. Backed by useSyncExternalStore so it stays hydration-safe without
 * a manual mounted guard.
 */
export function useHideTest(): {
  hideTest: boolean
  setHideTest: (value: boolean) => void
} {
  const hideTest = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function setHideTest(value: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore persistence failures (private mode, etc.)
    }
    listeners.forEach((l) => l())
  }

  return { hideTest, setHideTest }
}
