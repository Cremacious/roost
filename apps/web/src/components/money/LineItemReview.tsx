'use client'

import { useState } from 'react'
import { Plus, X, Lock, ArrowLeft, Receipt } from 'lucide-react'
import type { ParsedReceipt } from '@/lib/utils/azureReceipts'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

export interface LineItem {
  id: string
  description: string
  amount: number
}

interface LineItemReviewProps {
  receipt: ParsedReceipt
  members: { id: string; name: string; avatarColor?: string }[]
  currentUserId: string
  onConfirm: (items: LineItem[], taxAndTip: number, splitEnabled: boolean) => void
  onManual: () => void
  onBack: () => void
}

function formatAmount(n: number): string {
  return n.toFixed(2)
}

export function LineItemReview({ receipt, members, currentUserId, onConfirm, onManual, onBack }: LineItemReviewProps) {
  const [items, setItems] = useState<LineItem[]>(() =>
    receipt.lineItems.map(li => ({
      id: crypto.randomUUID(),
      description: li.description,
      amount: li.amount,
    }))
  )
  const [splitEnabled, setSplitEnabled] = useState(false)

  const taxAndTip = (receipt.tax ?? 0) + (receipt.tip ?? 0)
  const canSplit = members.length > 1

  function updateDescription(id: string, value: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, description: value } : item))
  }

  function updateAmount(id: string, value: string) {
    const parsed = parseFloat(value)
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, amount: isNaN(parsed) ? 0 : parsed } : item
    ))
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function addItem() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', amount: 0 }])
  }

  const isValid = items.length > 0 && items.every(item => item.description.trim().length > 0 && item.amount > 0)

  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const grandTotal = itemsTotal + taxAndTip

  const labelStyle: React.CSSProperties = {
    color: '#374151',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
  }

  const inputBase: React.CSSProperties = {
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    padding: '10px 12px',
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '0 16px 32px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--roost-border)',
            borderBottom: '3px solid var(--roost-border-bottom)',
            backgroundColor: 'var(--roost-surface)', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--roost-text-primary)' }} />
        </button>
        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 18, margin: 0 }}>
          Review items
        </p>
      </div>

      {/* Merchant + total summary header */}
      <div style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${COLOR}`,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            backgroundColor: `${COLOR}1A`,
            border: `1.5px solid ${COLOR}4D`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Receipt size={18} style={{ color: COLOR }} />
          </div>
          <div>
            <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 15, margin: 0 }}>
              {receipt.merchant ?? 'Receipt'}
            </p>
            {receipt.date && (
              <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 13, margin: 0 }}>
                {receipt.date}
              </p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 11, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Total
          </p>
          <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 18, margin: 0 }}>
            ${formatAmount(grandTotal)}
          </p>
        </div>
      </div>

      {/* Items label */}
      <p style={{ ...labelStyle, marginBottom: 10 }}>Line items</p>

      {/* Item rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {/* Description input */}
            <input
              type="text"
              value={item.description}
              onChange={e => updateDescription(item.id, e.target.value)}
              placeholder="Item name"
              style={{ ...inputBase, flex: 1 }}
            />

            {/* Amount input with $ prefix */}
            <div style={{ position: 'relative', flexShrink: 0, width: 90 }}>
              <span style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 15, pointerEvents: 'none',
              }}>
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={item.amount === 0 ? '' : formatAmount(item.amount)}
                onChange={e => updateAmount(item.id, e.target.value)}
                placeholder="0.00"
                style={{ ...inputBase, paddingLeft: 24, textAlign: 'right' }}
              />
            </div>

            {/* Delete button */}
            <button
              onClick={() => deleteItem(item.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                border: '1.5px solid var(--roost-border)',
                borderBottom: '3px solid var(--roost-border-bottom)',
                backgroundColor: 'var(--roost-surface)', cursor: 'pointer',
              }}
              aria-label="Remove item"
            >
              <X size={16} style={{ color: 'var(--roost-text-muted)' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Add item row */}
      <button
        onClick={addItem}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px 0',
          border: '1.5px dashed var(--roost-border)',
          borderRadius: 12, marginBottom: 20,
          backgroundColor: 'transparent', cursor: 'pointer',
          color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 14,
        }}
      >
        <Plus size={16} />
        Add item
      </button>

      {/* Tax + tip locked row (shown only when > 0) */}
      {taxAndTip > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ ...labelStyle, marginBottom: 10 }}>Tax and tip</p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: '3px solid var(--roost-border-bottom)',
            borderRadius: 12,
          }}>
            <Lock size={14} style={{ color: 'var(--roost-text-muted)', flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 15 }}>
              Tax + tip
            </span>
            <span style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 15 }}>
              ${formatAmount(taxAndTip)}
            </span>
          </div>
          <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, marginTop: 6, marginBottom: 0 }}>
            Tax and tip are added to the total automatically.
          </p>
        </div>
      )}

      {/* Split between members toggle (only shown when multiple members) */}
      {canSplit && (
        <label
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', marginBottom: 16,
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: `3px solid ${splitEnabled ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
            borderRadius: 12, cursor: 'pointer',
          }}
        >
          <span style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 15 }}>
            Split between members
          </span>
          <div
            onClick={() => setSplitEnabled(v => !v)}
            style={{
              width: 44, height: 26, borderRadius: 13, flexShrink: 0,
              backgroundColor: splitEnabled ? COLOR : 'var(--roost-border)',
              transition: 'background-color 0.2s',
              position: 'relative', cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: splitEnabled ? 21 : 3,
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s',
            }} />
          </div>
        </label>
      )}

      {/* Confirm button */}
      <button
        onClick={() => isValid && onConfirm(items, taxAndTip, canSplit && splitEnabled)}
        disabled={!isValid}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '15px 0', borderRadius: 14,
          fontWeight: 800, fontSize: 16, cursor: isValid ? 'pointer' : 'not-allowed',
          border: 'none',
          backgroundColor: isValid ? COLOR : `${COLOR}80`,
          color: '#fff',
          borderBottom: isValid ? `3px solid ${COLOR_DARK}` : 'none',
          marginBottom: 12,
          opacity: isValid ? 1 : 0.7,
        }}
      >
        {canSplit && splitEnabled ? 'Assign items' : 'Use receipt total'}
      </button>

      {/* Enter manually link */}
      <button
        onClick={onManual}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '10px 0',
          border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
          color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 14,
          borderRadius: 10,
        }}
      >
        Enter items manually instead
      </button>
    </div>
  )
}
