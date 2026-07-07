'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#159143'
const COLOR_DARK = '#15803D'

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export interface EditableBudget {
  id: string
  categoryId: string
  categoryName: string
  amount: string
  warningThreshold: number
}

interface Props {
  open: boolean
  onClose: () => void
  budget?: EditableBudget | null
}

export function BudgetSheet({ open, onClose, budget }: Props) {
  const qc = useQueryClient()
  const isEditing = !!budget

  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [warningThreshold, setWarningThreshold] = useState(70)
  const [saving, setSaving] = useState(false)

  // Pre-fill when editing
  useEffect(() => {
    if (open && budget) {
      setAmount(parseFloat(budget.amount).toFixed(2))
      setWarningThreshold(budget.warningThreshold)
      setCategoryId(budget.categoryId)
    }
  }, [open, budget])

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const r = await fetch('/api/expenses/categories')
      if (!r.ok) return []
      return r.json()
    },
    staleTime: 60_000,
    enabled: open && !isEditing, // only needed for create
  })

  function resetForm() {
    setCategoryId('')
    setAmount('')
    setWarningThreshold(70)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSave() {
    if (!isEditing && !categoryId) {
      toast.error('Category required', { description: 'Choose a spending category for this budget.' })
      return
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive monthly limit.' })
      return
    }

    setSaving(true)
    try {
      let res: Response
      if (isEditing) {
        res = await fetch(`/api/expenses/budgets/${budget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(amount).toFixed(2),
            warningThreshold,
          }),
        })
      } else {
        res = await fetch('/api/expenses/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId,
            amount: parseFloat(amount).toFixed(2),
            warningThreshold,
          }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        toast.error(isEditing ? 'Could not update budget' : 'Could not save budget', {
          description: data.error ?? 'Something went wrong.',
        })
        return
      }

      const catName = isEditing
        ? budget.categoryName
        : (categories.find(c => c.id === categoryId)?.name ?? 'Budget')

      toast.success(isEditing ? 'Budget updated' : 'Budget set', {
        description: `${catName} budget of $${parseFloat(amount).toFixed(2)}/mo ${isEditing ? 'updated' : 'added'}.`,
      })
      qc.invalidateQueries({ queryKey: ['budgets'] })
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

  const warningColor = warningThreshold >= 90 ? '#EF4444' : warningThreshold >= 70 ? '#F59E0B' : COLOR
  const selectedCat = categories.find(c => c.id === categoryId)
  const displayCatName = isEditing ? budget.categoryName : selectedCat?.name

  return (
    <DraggableSheet
      open={open}
      onOpenChange={(v) => { if (!v) handleClose() }}
      featureColor={COLOR}
    >
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          {isEditing ? `Edit budget` : 'Add budget'}
        </p>

        {/* Category — read-only in edit mode, picker in create mode */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Category</label>
          {isEditing ? (
            <div style={{
              padding: '10px 12px', borderRadius: 12,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border-bottom)',
              backgroundColor: 'var(--roost-bg)',
              color: 'var(--roost-text-secondary)',
              fontWeight: 700, fontSize: 14,
            }}>
              {budget.categoryName}
            </div>
          ) : categories.length === 0 ? (
            <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 13 }}>
              Loading categories...
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(cat => {
                const active = categoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    style={{
                      padding: '7px 12px', borderRadius: 10,
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      backgroundColor: active ? cat.color + '22' : 'var(--roost-surface)',
                      color: active ? cat.color : 'var(--roost-text-primary)',
                      border: `1.5px solid ${active ? cat.color : 'var(--roost-border)'}`,
                      borderBottom: `3px solid ${active ? cat.color : 'var(--roost-border-bottom)'}`,
                    }}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Monthly limit */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Monthly limit{displayCatName ? ` for ${displayCatName}` : ''}
          </label>
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

        {/* Warning threshold */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Warn me at</label>
            <span style={{ fontWeight: 800, fontSize: 14, color: warningColor }}>
              {warningThreshold}%
              {amount && parseFloat(amount) > 0 ? ` ($${(parseFloat(amount) * warningThreshold / 100).toFixed(2)})` : ''}
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            step="5"
            value={warningThreshold}
            onChange={e => setWarningThreshold(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: warningColor }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>50%</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>95%</span>
          </div>
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
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Budget'}
        </button>
      </div>
    </DraggableSheet>
  )
}
