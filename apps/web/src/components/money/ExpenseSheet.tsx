'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DollarSign, Lock, RefreshCw } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

interface Member {
  id: string
  name: string
}

interface CustomSplit {
  userId: string
  amount: string
}

interface Props {
  open: boolean
  onClose: () => void
  members: Member[]
  currentUserId: string
  isPremium: boolean
  onUpgradeRequired?: (code: string) => void
}

export function ExpenseSheet({ open, onClose, members, currentUserId, isPremium, onUpgradeRequired }: Props) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'payer'>('equal')
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([])
  const [saving, setSaving] = useState(false)

  const nonPayerMembers = members.filter(m => m.id !== paidBy)

  function initCustomSplits(payerId: string, method: 'equal' | 'custom' | 'payer') {
    if (method !== 'custom') return
    const others = members.filter(m => m.id !== payerId)
    const each = others.length > 0 && amount ? (parseFloat(amount) / others.length).toFixed(2) : ''
    setCustomSplits(others.map(m => ({ userId: m.id, amount: each })))
  }

  function handleSplitMethodChange(method: 'equal' | 'custom' | 'payer') {
    setSplitMethod(method)
    initCustomSplits(paidBy, method)
  }

  function handlePaidByChange(userId: string) {
    setPaidBy(userId)
    if (splitMethod === 'custom') initCustomSplits(userId, 'custom')
  }

  function resetForm() {
    setTitle('')
    setAmount('')
    setPaidBy(currentUserId)
    setSplitMethod('equal')
    setCustomSplits([])
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required', { description: 'Give the expense a name.' }); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive number.' }); return
    }

    let splits: CustomSplit[] = []
    if (splitMethod === 'equal') {
      splits = members.filter(m => m.id !== paidBy).map(m => ({
        userId: m.id,
        amount: (parseFloat(amount) / members.length).toFixed(2),
      }))
    } else if (splitMethod === 'custom') {
      splits = customSplits.filter(s => s.amount && parseFloat(s.amount) > 0)
      const splitTotal = splits.reduce((s, sp) => s + parseFloat(sp.amount), 0)
      if (Math.abs(splitTotal - parseFloat(amount)) > 0.02) {
        toast.error('Splits do not add up', { description: `Total splits: $${splitTotal.toFixed(2)}, expense: $${parseFloat(amount).toFixed(2)}` })
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), amount: parseFloat(amount).toFixed(2), paidBy, splits }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code && onUpgradeRequired) { onUpgradeRequired(data.code); return }
        toast.error('Failed to save', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success('Expense added')
      qc.invalidateQueries({ queryKey: ['expenses'] })
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
    border: `1.5px solid var(--roost-border)`,
    borderBottom: `3px solid var(--roost-border-bottom)`,
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    outline: 'none',
  }
  const pillStyle = (active: boolean) => ({
    padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
    backgroundColor: active ? COLOR : 'var(--roost-surface)',
    color: active ? '#fff' : 'var(--roost-text-primary)',
    border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
    borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
  })

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) { resetForm(); onClose() } }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>Add expense</p>

        {/* Amount */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Amount</label>
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

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <input
            type="text"
            placeholder="What was it for?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Paid by */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Paid by</label>
          <select value={paidBy} onChange={e => handlePaidByChange(e.target.value)} style={inputStyle}>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.id === currentUserId ? `${m.name} (you)` : m.name}</option>
            ))}
          </select>
        </div>

        {/* Split method */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Split</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['equal', 'custom', 'payer'] as const).map(method => (
              <button key={method} onClick={() => handleSplitMethodChange(method)} style={pillStyle(splitMethod === method)}>
                {method === 'equal' ? 'Equal' : method === 'custom' ? 'Custom' : 'Just me'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom splits */}
        {splitMethod === 'custom' && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.filter(m => m.id !== paidBy).map(m => {
              const split = customSplits.find(s => s.userId === m.id)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>{m.name}</span>
                  <div style={{ position: 'relative', width: 100 }}>
                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13 }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={split?.amount ?? ''}
                      onChange={e => setCustomSplits(prev =>
                        prev.some(s => s.userId === m.id)
                          ? prev.map(s => s.userId === m.id ? { ...s, amount: e.target.value } : s)
                          : [...prev, { userId: m.id, amount: e.target.value }]
                      )}
                      style={{ ...inputStyle, paddingLeft: 20, width: '100%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
          {saving ? 'Saving...' : 'Add expense'}
        </button>
      </div>
    </DraggableSheet>
  )
}
