'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import MemberAvatar from '@/components/shared/MemberAvatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface SheetMember {
  id: string
  userId: string
  name: string
  email: string | null
  role: string
  avatarColor: string | null
  joinedAt: string | null
  expiresAt?: string | null
}

interface MemberSheetProps {
  member: SheetMember | null
  householdId: string
  onClose: () => void
  onRefetch: () => void
}

const ROLE_BADGE: Record<string, { bg: string; label: string }> = {
  admin:  { bg: '#EF4444', label: 'Admin' },
  member: { bg: '#3B82F6', label: 'Member' },
  guest:  { bg: '#F59E0B', label: 'Guest' },
  child:  { bg: '#8B5CF6', label: 'Child' },
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--roost-text-muted)',
  marginBottom: 8,
  display: 'block',
}

const DIVIDER_STYLE: React.CSSProperties = {
  borderTop: '1px solid var(--roost-border)',
  marginTop: 20,
  paddingTop: 20,
}

export default function MemberSheet({
  member,
  onClose,
  onRefetch,
}: MemberSheetProps) {
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)

  if (!member) return null

  const badge = ROLE_BADGE[member.role] ?? { bg: '#6B7280', label: member.role }
  const isChild = member.role === 'child'
  const isAdmin = member.role === 'admin'

  async function handleUpdatePin() {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error('Invalid PIN', { description: 'PIN must be exactly 4 digits.' })
      return
    }
    setPinLoading(true)
    try {
      const res = await fetch(`/api/household/members/${member!.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update PIN')
      }
      toast.success('PIN updated')
      setPin('')
      setShowPin(false)
    } catch (err) {
      toast.error('Could not update PIN', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPinLoading(false)
    }
  }

  async function handleRemove() {
    setRemoveLoading(true)
    try {
      const res = await fetch(`/api/household/members/${member!.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to remove member')
      }
      toast.success(`${member!.name} removed`)
      onRefetch()
      onClose()
    } catch (err) {
      toast.error('Could not remove member', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setRemoveLoading(false)
      setRemoveOpen(false)
    }
  }

  return (
    <>
      <DraggableSheet
        open={!!member}
        onOpenChange={(v: boolean) => { if (!v) onClose() }}
        featureColor="#6366F1"
      >
        <div className="px-4 pb-8">
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <MemberAvatar name={member.name} avatarColor={member.avatarColor} size="lg" />
            <div className="flex flex-col gap-1">
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--roost-text-primary)',
                  lineHeight: 1.2,
                }}
              >
                {member.name}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: badge.bg,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                }}
              >
                {badge.label}
              </span>
            </div>
          </div>

          {/* PIN reset — child only */}
          {isChild && (
            <div style={DIVIDER_STYLE}>
              <span style={SECTION_LABEL_STYLE}>PIN</span>
              <div className="flex items-center gap-3">
                <div style={{ position: 'relative', width: 120 }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setPin(val)
                    }}
                    placeholder="••••"
                    style={{
                      width: '100%',
                      height: 48,
                      fontSize: 18,
                      fontWeight: 900,
                      letterSpacing: 6,
                      textAlign: 'center',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                      borderRadius: 12,
                      background: 'var(--roost-surface)',
                      color: 'var(--roost-text-primary)',
                      outline: 'none',
                      paddingRight: 36,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--roost-text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                    }}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <motion.button
                  whileTap={{ y: 1 }}
                  type="button"
                  onClick={handleUpdatePin}
                  disabled={pinLoading || pin.length !== 4}
                  style={{
                    height: 48,
                    paddingLeft: 16,
                    paddingRight: 16,
                    borderRadius: 12,
                    background: '#6366F1',
                    border: 'none',
                    borderBottom: '3px solid #4338CA',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: pinLoading || pin.length !== 4 ? 'not-allowed' : 'pointer',
                    opacity: pinLoading || pin.length !== 4 ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pinLoading ? 'Saving...' : 'Update PIN'}
                </motion.button>
              </div>
            </div>
          )}

          {/* Remove member — not shown for admins */}
          {!isAdmin && (
            <div style={DIVIDER_STYLE}>
              <motion.button
                whileTap={{ y: 1 }}
                type="button"
                onClick={() => setRemoveOpen(true)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  background: 'transparent',
                  border: '1.5px solid #EF4444',
                  color: '#EF4444',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Trash2 size={16} />
                Remove from household
              </motion.button>
            </div>
          )}
        </div>
      </DraggableSheet>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to this household immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeLoading}
              style={{
                background: '#EF4444',
                borderBottom: '3px solid #C93B3B',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {removeLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
