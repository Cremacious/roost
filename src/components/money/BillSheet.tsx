'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

interface Category {
  id: string
  name: string
  color: string
}

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

type Frequency = 'monthly' | 'weekly' | 'yearly'

interface Props {
  open: boolean
  onClose: () => void
}

export function BillSheet({ open, onClose }: Props) {
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [dueDay, setDueDay] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const r = await fetch('/api/expenses/categories')
      if (!r.ok) return []
      return r.json()
    },
    staleTime: 60_000,
    enabled: open,
  })

  function resetForm() {
    setTitle('')
    setAmount('')
    setFrequency('monthly')
    setDueDay('')
    setNextDueDate('')
    setCategoryId('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  // Auto-compute nextDueDate from dueDay for monthly bills
  function handleDueDayChange(val: string) {
    setDueDay(val)
    const day = parseInt(val)
    if (!isNaN(day) && day >= 1 && day <= 31) {
      const now = new Date()
      let year = now.getFullYear()
      let month = now.getMonth()
      if (day <= now.getDate()) {
        month += 1
        if (month > 11) { month = 0; year += 1 }
      }
      const d = new Date(year, month, day)
      setNextDueDate(d.toISOString().split('T')[0])
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Name required', { description: 'Give this bill a name.' })
      return
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive number.' })
      return
    }
    if (!nextDueDate) {
      toast.error('Due date required', { description: 'Set when this bill is next due.' })
      return
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      totalAmount: parseFloat(amount).toFixed(2),
      frequency,
      nextDueDate,
      isBill: true,
      splits: [],
      ...(categoryId ? { categoryId } : {}),
    }
    if (frequency === 'monthly' && dueDay) {
      body.dueDay = parseInt(dueDay)
    }

    setSaving(true)
    try {
      const res = await fetch('/api/expenses/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error('Could not save bill', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success('Bill added', { description: `"${title.trim()}" is now being tracked.` })
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    color: '#374151', fontWeight: 700, fontSize: 11,
    letterSpacing: '0.07em', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 16,
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    outline: 'none', boxSizing: 'border-box',
  }
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13,
    cursor: 'pointer',
    backgroundColor: active ? COLOR : 'var(--roost-surface)',
    color: active ? '#fff' : 'var(--roost-text-primary)',
    border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
    borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
  })

  return (
    <DraggableSheet
      open={open}
      onOpenChange={(v) => { if (!v) handleClose() }}
      featureColor={COLOR}
    >
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Add bill
        </p>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Bill name</label>
          <input
            type="text"
            placeholder="e.g. Netflix, Rent, Electric"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--roost-text-muted)', fontWeight: 700,
            }}>$</span>
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

        {/* Category */}
        {categories.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.map(cat => {
                const active = categoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(active ? '' : cat.id)}
                    style={{
                      padding: '6px 11px', borderRadius: 9, fontWeight: 700, fontSize: 12,
                      cursor: 'pointer',
                      backgroundColor: active ? cat.color + '22' : 'var(--roost-surface)',
                      color: active ? cat.color : 'var(--roost-text-secondary)',
                      border: `1.5px solid ${active ? cat.color : 'var(--roost-border)'}`,
                      borderBottom: `3px solid ${active ? cat.color : 'var(--roost-border-bottom)'}`,
                    }}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Frequency */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Frequency</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['monthly', 'weekly', 'yearly'] as Frequency[]).map(f => (
              <button key={f} onClick={() => setFrequency(f)} style={pillStyle(frequency === f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Due day (monthly only) */}
        {frequency === 'monthly' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Due day of month</label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="e.g. 15"
              value={dueDay}
              onChange={e => handleDueDayChange(e.target.value)}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
              Sets the due date and auto-fills next due below
            </p>
          </div>
        )}

        {/* Next due date */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Next due date</label>
          <input
            type="date"
            value={nextDueDate}
            onChange={e => setNextDueDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14,
            fontWeight: 800, fontSize: 16,
            backgroundColor: COLOR, color: '#fff',
            border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Add bill'}
        </button>
      </div>
    </DraggableSheet>
  )
}
