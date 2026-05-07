'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

interface DebtItem {
  from: string
  to: string
  amount: number
  splitIds: string[]
  pendingClaim?: { settledByPayer: boolean; settledByPayee: boolean } | null
}

interface Member {
  id: string
  name: string
}

type SettleMode = 'initial' | 'i_claimed' | 'they_claimed'

interface Props {
  open: boolean
  onClose: () => void
  debt: DebtItem | null
  currentUserId: string
  members: Member[]
  payeeVenmoHandle?: string | null
  payeeCashappHandle?: string | null
}

export function SettleSheet({ open, onClose, debt, currentUserId, members, payeeVenmoHandle, payeeCashappHandle }: Props) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)

  if (!debt) return null

  const iDebtor = debt.from === currentUserId
  const iCreditor = debt.to === currentUserId

  const debtorName = members.find(m => m.id === debt.from)?.name ?? 'Unknown'
  const creditorName = members.find(m => m.id === debt.to)?.name ?? 'Unknown'

  let mode: SettleMode = 'initial'
  if (debt.pendingClaim?.settledByPayer) {
    mode = iDebtor ? 'i_claimed' : 'they_claimed'
  }

  async function post(path: string, body?: object) {
    setLoading(true)
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error('Action failed', { description: data.error ?? 'Something went wrong.' })
        return false
      }
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
      return true
    } finally {
      setLoading(false)
    }
  }

  async function handleClaim() {
    const ok = await post('/api/expenses/settle-all/claim', { creditorId: debt!.to })
    if (ok) { toast.success('Claim sent', { description: `${creditorName} will confirm when received.` }); onClose() }
  }

  async function handleConfirm() {
    const ok = await post('/api/expenses/settle-all/confirm', { debtorId: debt!.from })
    if (ok) { toast.success('Settled up!'); onClose() }
  }

  async function handleDispute() {
    const ok = await post('/api/expenses/settle-all/dispute', { debtorId: debt!.from })
    if (ok) { toast.success('Disputed. They have been notified.'); onClose() }
  }

  async function handleCancel() {
    const ok = await post('/api/expenses/settle-all/cancel', { creditorId: debt!.to })
    if (ok) { toast.success('Claim cancelled'); onClose() }
  }

  async function handleRemind() {
    const res = await fetch('/api/expenses/settle-all/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditorId: debt!.to }),
    })
    const data = await res.json()
    if (res.status === 429) { toast.error('Already reminded recently', { description: 'You can send one reminder every 24 hours.' }); return }
    if (!res.ok) { toast.error('Failed to send reminder', { description: data.error }); return }
    toast.success('Reminder sent')
  }

  const btnBase = {
    width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 800, fontSize: 15,
    border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-2 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>Settle up</p>

        <div style={{
          padding: '16px', borderRadius: 14, marginBottom: 20,
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: `4px solid ${COLOR}`,
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>
            {iDebtor ? `You owe ${creditorName}` : `${debtorName} owes you`}
          </p>
          <p style={{ margin: '4px 0 0', fontWeight: 900, fontSize: 28, color: 'var(--roost-text-primary)' }}>
            ${debt.amount.toFixed(2)}
          </p>
        </div>

        {mode === 'initial' && iDebtor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)', marginBottom: 4 }}>
              Pay {creditorName} outside the app, then mark as paid here.
            </p>

            {(payeeVenmoHandle || payeeCashappHandle) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                  Pay via
                </p>

                {payeeVenmoHandle && (() => {
                  const handle = payeeVenmoHandle.replace(/^@/, '')
                  const venmoUrl = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(handle)}&amount=${debt.amount.toFixed(2)}&note=Roost+expense`
                  return (
                    <a
                      href={venmoUrl}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 14, textDecoration: 'none',
                        backgroundColor: '#3d95ce', borderBottom: '3px solid #2d7ab0',
                        border: '1.5px solid #2d7ab0', borderBottomWidth: 3,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0,
                      }}>V</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>Pay with Venmo</p>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                          Opens Venmo pre-filled with ${debt.amount.toFixed(2)}
                        </p>
                      </div>
                    </a>
                  )
                })()}

                {payeeCashappHandle && (() => {
                  const handle = payeeCashappHandle.replace(/^\$/, '')
                  const cashUrl = `cashme://cash.app/$${encodeURIComponent(handle)}/${debt.amount.toFixed(2)}`
                  return (
                    <a
                      href={cashUrl}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 14, textDecoration: 'none',
                        backgroundColor: '#5724c0', borderBottom: '3px solid #4118a0',
                        border: '1.5px solid #4118a0', borderBottomWidth: 3,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0,
                      }}>$</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>Pay with Cash App</p>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                          Opens Cash App pre-filled with ${debt.amount.toFixed(2)}
                        </p>
                      </div>
                    </a>
                  )
                })()}

                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', margin: 0 }}>
                  After paying, tap the button below to notify {creditorName}.
                </p>
              </div>
            )}

            <button onClick={handleClaim} disabled={loading} style={{ ...btnBase, backgroundColor: COLOR, color: '#fff', borderBottom: `3px solid ${COLOR_DARK}` }}>
              I paid {creditorName}
            </button>
          </div>
        )}

        {mode === 'initial' && iCreditor && (
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Waiting for {debtorName} to mark this as paid.
          </p>
        )}

        {mode === 'i_claimed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 10, backgroundColor: '#FEF3C7', border: '1.5px solid #FDE68A' }}>
              <Clock size={16} color="#D97706" />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                Waiting for {creditorName} to confirm
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleRemind} disabled={loading} style={{ ...btnBase, flex: 1, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)' }}>
                Remind
              </button>
              <button onClick={handleCancel} disabled={loading} style={{ ...btnBase, flex: 1, backgroundColor: 'var(--roost-surface)', color: '#EF4444', border: '1.5px solid #FECACA', borderBottom: '3px solid #FCA5A5' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === 'they_claimed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 10, backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
              <CheckCircle size={16} color={COLOR} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLOR_DARK }}>
                {debtorName} says they paid you
              </p>
            </div>
            <button onClick={handleConfirm} disabled={loading} style={{ ...btnBase, backgroundColor: COLOR, color: '#fff', borderBottom: `3px solid ${COLOR_DARK}` }}>
              Confirm I received it
            </button>
            <button onClick={handleDispute} disabled={loading} style={{ ...btnBase, backgroundColor: 'var(--roost-surface)', color: '#EF4444', border: '1.5px solid #FECACA', borderBottom: '3px solid #FCA5A5' }}>
              Dispute — I did not receive it
            </button>
          </div>
        )}
      </div>
    </DraggableSheet>
  )
}
