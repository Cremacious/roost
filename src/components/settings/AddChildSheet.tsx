'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle2, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#3B82F6'
const COLOR_DARK = '#1A5CB5'

interface AddChildSheetProps {
  open: boolean
  onClose: () => void
}

type Step = 'form' | 'success'

export default function AddChildSheet({ open, onClose }: AddChildSheetProps) {
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdName, setCreatedName] = useState('')
  const [createdPin, setCreatedPin] = useState('')
  const [copied, setCopied] = useState(false)

  const [nameError, setNameError] = useState('')
  const [pinError, setPinError] = useState('')

  const handleClose = useCallback(() => {
    // Reset everything on close
    setStep('form')
    setName('')
    setPin('')
    setShowPin(false)
    setIsSubmitting(false)
    setCreatedName('')
    setCreatedPin('')
    setCopied(false)
    setNameError('')
    setPinError('')
    onClose()
  }, [onClose])

  const validate = () => {
    let valid = true
    setNameError('')
    setPinError('')

    if (!name.trim()) {
      setNameError('Name is required.')
      valid = false
    }

    if (!/^\d{4}$/.test(pin)) {
      setPinError('PIN must be exactly 4 digits.')
      valid = false
    }

    return valid
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/household/members/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'CHILDREN_LIMIT') {
          toast.error('Child account limit reached.', {
            description: 'Upgrade to premium for more children.',
          })
        } else {
          toast.error('Could not create child account.', {
            description: data.error ?? 'Please try again.',
          })
        }
        return
      }

      setCreatedName(data.child?.name ?? name.trim())
      setCreatedPin(data.pin ?? pin)
      setStep('success')
    } catch {
      toast.error('Something went wrong.', {
        description: 'Check your connection and try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(createdPin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy PIN.', { description: 'Copy it manually from the screen.' })
    }
  }

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ['household-members'] })
    handleClose()
  }

  return (
    <DraggableSheet
      open={open}
      onOpenChange={(v) => { if (!v) handleClose() }}
      featureColor={COLOR}
    >
      <div className="px-4 pb-8">
        {step === 'form' ? (
          <>
            <p
              className="mb-5 text-lg"
              style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
            >
              Add Child Account
            </p>

            {/* Name field */}
            <div className="mb-4">
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. Lily"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 14px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--roost-text-primary)',
                  backgroundColor: 'var(--roost-surface)',
                  border: nameError
                    ? '1.5px solid #EF4444'
                    : `1.5px solid var(--roost-border)`,
                  borderBottom: nameError
                    ? '3px solid #C93B3B'
                    : `3px solid var(--roost-border-bottom)`,
                  borderRadius: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = `1.5px solid ${COLOR}`
                  e.currentTarget.style.borderBottom = `3px solid ${COLOR_DARK}`
                }}
                onBlur={(e) => {
                  if (!nameError) {
                    e.currentTarget.style.border = '1.5px solid var(--roost-border)'
                    e.currentTarget.style.borderBottom = '3px solid var(--roost-border-bottom)'
                  }
                }}
              />
              {nameError && (
                <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>
                  {nameError}
                </p>
              )}
            </div>

            {/* PIN field */}
            <div className="mb-6">
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                4-Digit PIN
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                    setPin(raw)
                    if (pinError) setPinError('')
                  }}
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 48px 0 14px',
                    fontSize: 20,
                    fontWeight: 900,
                    letterSpacing: showPin ? 6 : 4,
                    fontFamily: 'monospace',
                    color: 'var(--roost-text-primary)',
                    backgroundColor: 'var(--roost-surface)',
                    border: pinError
                      ? '1.5px solid #EF4444'
                      : '1.5px solid var(--roost-border)',
                    borderBottom: pinError
                      ? '3px solid #C93B3B'
                      : '3px solid var(--roost-border-bottom)',
                    borderRadius: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = `1.5px solid ${COLOR}`
                    e.currentTarget.style.borderBottom = `3px solid ${COLOR_DARK}`
                  }}
                  onBlur={(e) => {
                    if (!pinError) {
                      e.currentTarget.style.border = '1.5px solid var(--roost-border)'
                      e.currentTarget.style.borderBottom = '3px solid var(--roost-border-bottom)'
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: 'var(--roost-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {pinError && (
                <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>
                  {pinError}
                </p>
              )}
            </div>

            {/* Submit button */}
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: 48,
                backgroundColor: isSubmitting ? `${COLOR}99` : COLOR,
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                border: 'none',
                borderBottom: `3px solid ${COLOR_DARK}`,
                borderRadius: 12,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </motion.button>
          </>
        ) : (
          <>
            {/* Success view */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 8,
                paddingBottom: 4,
                marginBottom: 20,
              }}
            >
              <CheckCircle2 size={48} color="#22C55E" strokeWidth={2} />
              <p
                style={{
                  marginTop: 12,
                  fontSize: 20,
                  fontWeight: 900,
                  color: 'var(--roost-text-primary)',
                  textAlign: 'center',
                }}
              >
                {createdName} is ready!
              </p>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--roost-text-muted)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Share the PIN below. They will use the household code and this PIN to sign in.
              </p>
            </div>

            {/* PIN display */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1.5px solid #BBF7D0',
                borderRadius: 14,
                padding: '16px 20px',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#15803D',
                  marginBottom: 8,
                }}
              >
                PIN
              </p>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: 8,
                  color: '#166534',
                }}
              >
                {createdPin}
              </p>
            </div>

            {/* Copy button */}
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={handleCopyPin}
              style={{
                width: '100%',
                height: 48,
                backgroundColor: copied ? '#22C55E' : 'var(--roost-surface)',
                color: copied ? '#fff' : 'var(--roost-text-primary)',
                fontSize: 14,
                fontWeight: 700,
                border: copied
                  ? '1.5px solid #22C55E'
                  : '1.5px solid var(--roost-border)',
                borderBottom: copied
                  ? '3px solid #159040'
                  : '3px solid var(--roost-border)',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16,
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy PIN
                </>
              )}
            </motion.button>

            {/* Info callout */}
            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #FDE68A',
                borderBottom: '3px solid #D97706',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', lineHeight: 1.5 }}>
                Children sign in at /child-login using the household code and their PIN.
              </p>
            </div>

            {/* Done button */}
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={handleDone}
              style={{
                width: '100%',
                height: 48,
                backgroundColor: COLOR,
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                border: 'none',
                borderBottom: `3px solid ${COLOR_DARK}`,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Done
            </motion.button>
          </>
        )}
      </div>
    </DraggableSheet>
  )
}
