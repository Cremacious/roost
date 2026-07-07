'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Dedicated cache entry for per-page intros. Kept separate from the
// ['user-profile'] key (which several components read with differing shapes) so
// the intro logic is not affected by, and does not affect, those reads.
interface IntroProfile {
  seenIntros: string[]
  isChildAccount: boolean
}

interface PageIntroModalProps {
  // Unique, stable key stored in users.seen_intros once dismissed.
  introKey: string
  icon: LucideIcon
  // Section base color and its darker shade (for the slab bottom border).
  color: string
  colorDark: string
  title: string
  body: string
  // When true, the intro is never shown to child accounts.
  hideForChildren?: boolean
}

export default function PageIntroModal({
  introKey,
  icon: Icon,
  color,
  colorDark,
  title,
  body,
  hideForChildren = false,
}: PageIntroModalProps) {
  const qc = useQueryClient()
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: profile } = useQuery<IntroProfile>({
    queryKey: ['user-intros'],
    queryFn: async () => {
      const r = await fetch('/api/user/profile')
      if (!r.ok) throw new Error('Failed to load profile')
      const json = await r.json()
      return {
        seenIntros: Array.isArray(json.seenIntros) ? (json.seenIntros as string[]) : [],
        isChildAccount: json.isChildAccount as boolean,
      }
    },
    staleTime: 5 * 60_000,
  })

  const open =
    !dismissed &&
    profile !== undefined &&
    !profile.seenIntros.includes(introKey) &&
    !(hideForChildren && profile.isChildAccount)

  function handleDismiss() {
    if (saving) return
    setSaving(true)

    // Optimistically record the key in the cached intro profile so navigating
    // back to this page (or any other) reads the dismissed state from cache
    // instead of the pre-dismiss snapshot during the 5m staleTime window.
    qc.setQueryData<IntroProfile | undefined>(['user-intros'], (old) =>
      old && !old.seenIntros.includes(introKey)
        ? { ...old, seenIntros: [...old.seenIntros, introKey] }
        : old,
    )
    setDismissed(true)

    // Persist in the background. On failure, log but do not revert the cache:
    // the user has visually dismissed the popup, and the worst case is it
    // reappears next session, which is acceptable for a one-off intro.
    fetch('/api/user/dismiss-intro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: introKey }),
    })
      .then((res) => {
        if (!res.ok) {
          console.warn('[PageIntroModal] dismiss-intro returned', res.status)
        }
      })
      .catch((err) => {
        console.warn('[PageIntroModal] dismiss-intro failed', err)
      })
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v: boolean) => !v && handleDismiss()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
          }}
        />
        <DialogPrimitive.Content
          onInteractOutside={(e: Event) => e.preventDefault()}
          onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(calc(100vw - 32px), 380px)',
            backgroundColor: 'var(--roost-surface)',
            border: 'none',
            borderBottom: `4px solid ${color}`,
            borderRadius: 20,
            padding: 0,
            overflow: 'hidden',
            zIndex: 51,
            outline: 'none',
          }}
        >
          <DialogPrimitive.Title style={{ display: 'none' }}>{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description style={{ display: 'none' }}>{body}</DialogPrimitive.Description>

          {/* Section-colored header */}
          <div
            style={{
              background: color,
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={26} style={{ color: '#fff' }} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>{title}</p>
          </div>

          {/* Body copy */}
          <div style={{ padding: '20px 24px 4px', background: '#ffffff' }}>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: 0.05 }}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
                margin: 0,
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              {body}
            </motion.p>
          </div>

          {/* Button */}
          <div style={{ padding: '18px 24px 24px', background: '#ffffff' }}>
            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={handleDismiss}
              disabled={saving}
              style={{
                width: '100%',
                height: 48,
                backgroundColor: color,
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                borderRadius: 12,
                border: 'none',
                outline: 'none',
                borderBottom: `3px solid ${colorDark}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Got It!
            </motion.button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
