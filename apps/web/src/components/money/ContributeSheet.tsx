'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

interface Goal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
}

interface Props {
  open: boolean
  onClose: () => void
  goal: Goal | null
}

export function ContributeSheet({ open, onClose, goal }: Props) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setAmount('')
    setNote('')
  }

  async function handleSave() {
    if (!goal) return
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive contribution amount.' }); return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/money/goals/${goal.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, note: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error('Failed to save', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success('Contribution logged')
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
      resetForm()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const labelStyle = { color: '#374151', fontWeight: 700 as const, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 16,
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    outline: 'none',
  }

  if (!goal) return null

  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) { resetForm(); onClose() } }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>Log contribution</p>
        <p style={{ marginBottom: 20, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
          {goal.name} &bull; ${remaining.toFixed(2)} remaining
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Amount contributed</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontWeight: 700 }}>$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 24 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Note (optional)</label>
          <input type="text" placeholder="e.g. Monthly transfer" value={note} onChange={e => setNote(e.target.value)} style={inputStyle} />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 800, fontSize: 16,
            backgroundColor: COLOR, color: '#fff', border: 'none',
            borderBottom: `3px solid ${COLOR_DARK}`, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Log contribution'}
        </button>
      </div>
    </DraggableSheet>
  )
}
