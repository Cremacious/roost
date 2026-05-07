// apps/web/src/components/shared/WelcomeModal.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Baby,
  CheckSquare,
  DollarSign,
  LayoutGrid,
  Home,
} from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

const FEATURES = [
  {
    icon: Users,
    color: '#EF4444',
    title: 'Invite your household',
    body: 'Share your code and family or roommates join instantly.',
  },
  {
    icon: Baby,
    color: '#3B82F6',
    title: 'Add child accounts',
    body: 'Kids get a 4-digit PIN login. No email, no finance access.',
  },
  {
    icon: CheckSquare,
    color: '#EF4444',
    title: 'Chores and rewards',
    body: 'Assign chores, track who did what, and set up automatic rewards for kids.',
  },
  {
    icon: DollarSign,
    color: '#22C55E',
    title: 'Split expenses',
    body: 'Track shared bills, scan receipts, and settle up.',
  },
  {
    icon: LayoutGrid,
    color: '#F59E0B',
    title: 'Meals, grocery, calendar and more',
    body: 'Everything else your household needs, in one place.',
  },
] as const

interface WelcomeModalProps {
  open: boolean
  onDismiss: () => void
}

export default function WelcomeModal({ open, onDismiss }: WelcomeModalProps) {
  const [dismissing, setDismissing] = useState(false)

  async function handleDismiss() {
    if (dismissing) return
    setDismissing(true)
    // Fire and forget — close immediately, persist in background
    fetch('/api/user/dismiss-welcome', { method: 'POST' }).catch(() => {})
    onDismiss()
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
            width: 'min(calc(100vw - 32px), 400px)',
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: '4px solid #EF4444',
            borderRadius: 20,
            padding: 0,
            overflow: 'hidden',
            zIndex: 51,
            outline: 'none',
          }}
        >
          <DialogPrimitive.Title style={{ display: 'none' }}>
            Welcome to Roost
          </DialogPrimitive.Title>
          <DialogPrimitive.Description style={{ display: 'none' }}>
            A quick overview of what you can do in Roost.
          </DialogPrimitive.Description>

          {/* Red header */}
          <div
            style={{
              background: '#EF4444',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Inline logo placeholder until RoostLogo component is available */}
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
              <Home size={28} style={{ color: '#fff' }} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
              Welcome to Roost
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                margin: 0,
              }}
            >
              Your household, all in one place
            </p>
          </div>

          {/* Feature list */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background: '#ffffff',
            }}
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.05 + i * 0.05 }}
                style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: f.color + '1A', // 10% opacity
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <f.icon size={16} style={{ color: f.color }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#111827',
                      margin: 0,
                      marginBottom: 2,
                    }}
                  >
                    {f.title}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#6B7280',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {f.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Button */}
          <div style={{ padding: '0 24px 24px', background: '#ffffff' }}>
            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={handleDismiss}
              disabled={dismissing}
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#EF4444',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                borderRadius: 12,
                border: 'none',
                borderBottom: '3px solid #C93B3B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Got it!
            </motion.button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
