'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

interface Goal {
  id: string
  name: string
  targetAmount: number | string
  targetDate?: string | null
  description?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  goal?: Goal | null
}

export function GoalSheet({ open, onClose, goal }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = !!goal

  useEffect(() => {
    if (goal) {
      setName(goal.name)
      setTargetAmount(String(goal.targetAmount))
      setTargetDate(goal.targetDate ?? '')
      setDescription(goal.description ?? '')
    } else {
      setName('')
      setTargetAmount('')
      setTargetDate('')
      setDescription('')
    }
  }, [goal, open])

  async function handleSave() {
    if (!name.trim()) { toast.error('Name required', { description: 'Give your goal a name.' }); return }
    if (!targetAmount || isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive target amount.' }); return
    }

    setSaving(true)
    try {
      const url = isEdit ? `/api/money/goals/${goal!.id}` : '/api/money/goals'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount,
          targetDate: targetDate || null,
          description: description.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'SAVINGS_GOALS_PREMIUM') {
          toast.error('Premium required', { description: 'Savings goals are a premium feature.' })
          return
        }
        toast.error('Failed to save', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success(isEdit ? 'Goal updated' : 'Goal created')
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
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

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          {isEdit ? 'Edit goal' : 'New savings goal'}
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Goal name</label>
          <input type="text" placeholder="e.g. Emergency fund" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Target amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontWeight: 700 }}>$</span>
            <input type="number" step="0.01" placeholder="0.00" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} style={{ ...inputStyle, paddingLeft: 24 }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Target date (optional)</label>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea
            placeholder="What is this goal for?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
          />
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
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create goal'}
        </button>
      </div>
    </DraggableSheet>
  )
}
