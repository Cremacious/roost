'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Camera, ChevronDown, ChevronUp, DollarSign, Lock, Percent, Users } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { ReceiptScanner } from './ReceiptScanner'
import { LineItemReview, type LineItem } from './LineItemReview'
import { LineItemGrid, type AssignedSplit } from './LineItemGrid'
import type { ParsedReceipt } from '@/lib/utils/azureReceipts'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

// ── Types ──────────────────────────────────────────────────────────────────

interface Member {
  id: string
  name: string
  avatarColor?: string
}

interface CustomSplit {
  userId: string
  amount: string
}

interface PercentSplit {
  userId: string
  percent: string
}

interface ShareSplit {
  userId: string
  shares: number
}

interface SplitTemplate {
  id: string
  name: string
  method: 'custom' | 'percent' | 'shares'
  splits: { userId: string; value: number }[]
}

type SplitMethod = 'equal' | 'custom' | 'percent' | 'shares' | 'payer'
type ScanStep = 'idle' | 'scanning' | 'reviewing' | 'grid'

interface Props {
  open: boolean
  onClose: () => void
  members: Member[]
  currentUserId: string
  isPremium: boolean
  onUpgradeRequired?: (code: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function firstInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

function MiniAvatar({ member }: { member: Member }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      backgroundColor: member.avatarColor ?? COLOR,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: 12, userSelect: 'none',
    }}>
      {firstInitial(member.name)}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function ExpenseSheet({ open, onClose, members, currentUserId, isPremium, onUpgradeRequired }: Props) {
  const qc = useQueryClient()

  // Form state
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId ?? '')
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('payer')
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([])
  const [percentSplits, setPercentSplits] = useState<PercentSplit[]>([])
  const [shareSplits, setShareSplits] = useState<ShareSplit[]>([])
  const [saving, setSaving] = useState(false)

  // Receipt scan flow
  const [scanStep, setScanStep] = useState<ScanStep>('idle')
  const [scannedReceipt, setScannedReceipt] = useState<ParsedReceipt | null>(null)
  const [reviewedItems, setReviewedItems] = useState<LineItem[]>([])
  const [reviewedTaxAndTip, setReviewedTaxAndTip] = useState(0)
  const [receiptData, setReceiptData] = useState<object | null>(null)

  // Split templates
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('My split')

  // Fetch saved templates
  const { data: templates = [] } = useQuery<SplitTemplate[]>({
    queryKey: ['splitTemplates'],
    queryFn: () => fetch('/api/split-templates').then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  })

  // Seed paidBy whenever currentUserId becomes available (runs regardless of open state,
  // so the select is pre-filled even if the session query resolves while the sheet is open)
  useEffect(() => {
    if (currentUserId && !paidBy) {
      setPaidBy(currentUserId)
    }
  }, [currentUserId])

  const nonPayerMembers = members.filter(m => m.id !== paidBy)

  // ── Init helpers ───────────────────────────────────────────────────────

  function initCustomSplits(payerId: string) {
    const others = members.filter(m => m.id !== payerId)
    const each = others.length > 0 && amount ? (parseFloat(amount) / others.length).toFixed(2) : ''
    setCustomSplits(others.map(m => ({ userId: m.id, amount: each })))
  }

  function initPercentSplits() {
    const count = members.length
    const base = count > 0 ? Math.floor(100 / count) : 0
    const rem = count > 0 ? 100 - base * count : 0
    setPercentSplits(members.map((m, i) => ({
      userId: m.id,
      percent: i === 0 ? String(base + rem) : String(base),
    })))
  }

  function initShareSplits() {
    setShareSplits(members.map(m => ({ userId: m.id, shares: 1 })))
  }

  function handleSplitMethodChange(method: SplitMethod) {
    setSplitMethod(method)
    if (method === 'custom') initCustomSplits(paidBy)
    if (method === 'percent') initPercentSplits()
    if (method === 'shares') initShareSplits()
  }

  function handlePaidByChange(userId: string) {
    setPaidBy(userId)
    if (splitMethod === 'custom') {
      const others = members.filter(m => m.id !== userId)
      const each = others.length > 0 && amount ? (parseFloat(amount) / others.length).toFixed(2) : ''
      setCustomSplits(others.map(m => ({ userId: m.id, amount: each })))
    }
  }

  function resetForm() {
    setTitle('')
    setAmount('')
    setPaidBy(currentUserId)
    setSplitMethod('payer')
    setCustomSplits([])
    setPercentSplits([])
    setShareSplits([])
    setScanStep('idle')
    setScannedReceipt(null)
    setReviewedItems([])
    setReviewedTaxAndTip(0)
    setReceiptData(null)
    setSaveAsTemplate(false)
    setTemplateName('My split')
    setTemplatesOpen(false)
  }

  // ── Computed values ────────────────────────────────────────────────────

  const totalAmount = parseFloat(amount) || 0

  const percentTotal = percentSplits.reduce((s, p) => s + (parseFloat(p.percent) || 0), 0)
  const percentBalanced = Math.abs(percentTotal - 100) < 0.01

  const totalShares = shareSplits.reduce((s, sh) => s + sh.shares, 0)
  const perShare = totalShares > 0 && totalAmount > 0 ? totalAmount / totalShares : 0

  // ── Scan flow handlers ─────────────────────────────────────────────────

  function handleScanResult(receipt: ParsedReceipt) {
    setScannedReceipt(receipt)
    setScanStep('reviewing')
  }

  function handleManualEntry() {
    setScannedReceipt({ lineItems: [] })
    setScanStep('reviewing')
  }

  function handleReviewConfirm(items: LineItem[], taxAndTip: number, splitEnabled: boolean) {
    setReviewedItems(items)
    setReviewedTaxAndTip(taxAndTip)

    if (splitEnabled && members.length > 1) {
      setScanStep('grid')
    } else {
      // Skip grid: pre-fill form with receipt total, leave split method unchanged
      const total = items.reduce((sum, item) => sum + item.amount, 0) + taxAndTip
      if (scannedReceipt?.merchant) setTitle(scannedReceipt.merchant)
      setAmount(total.toFixed(2))
      setScanStep('idle')
    }
  }

  function handleGridConfirm(splits: AssignedSplit[], rData: object) {
    // Pre-fill form from receipt
    if (scannedReceipt?.merchant) setTitle(scannedReceipt.merchant)
    const total = splits.reduce((s, sp) => s + sp.amount, 0)
    setAmount(total.toFixed(2))
    setSplitMethod('custom')
    setCustomSplits(splits.map(sp => ({ userId: sp.userId, amount: sp.amount.toFixed(2) })))
    setReceiptData(rData)
    setScanStep('idle')
  }

  // ── Apply template ─────────────────────────────────────────────────────

  function applyTemplate(tmpl: SplitTemplate) {
    setSplitMethod(tmpl.method)
    if (tmpl.method === 'custom') {
      setCustomSplits(tmpl.splits.map(s => ({ userId: s.userId, amount: String(s.value) })))
    } else if (tmpl.method === 'percent') {
      setPercentSplits(tmpl.splits.map(s => ({ userId: s.userId, percent: String(s.value) })))
    } else if (tmpl.method === 'shares') {
      setShareSplits(tmpl.splits.map(s => ({ userId: s.userId, shares: s.value })))
    }
    setTemplatesOpen(false)
  }

  function templateSummary(tmpl: SplitTemplate): string {
    const names: Record<string, string> = {}
    members.forEach(m => { names[m.id] = m.name.split(' ')[0] })
    return tmpl.splits.slice(0, 3).map(s => {
      const name = names[s.userId] ?? 'Unknown'
      if (tmpl.method === 'percent') return `${name} ${s.value}%`
      if (tmpl.method === 'shares') return `${name} ${s.value}x`
      return `${name} $${s.value.toFixed(2)}`
    }).join(' · ')
  }

  // ── Save handler ───────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required', { description: 'Give the expense a name.' }); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive number.' }); return
    }

    const effectivePaidBy = paidBy || currentUserId || members[0]?.id || ''
    if (!effectivePaidBy) {
      toast.error('Payer required', { description: 'Select who paid for this expense.' })
      return
    }

    let splits: CustomSplit[] = []

    if (splitMethod === 'equal') {
      splits = members.filter(m => m.id !== effectivePaidBy).map(m => ({
        userId: m.id,
        amount: (totalAmount / members.length).toFixed(2),
      }))
    } else if (splitMethod === 'custom') {
      splits = customSplits.filter(s => s.amount && parseFloat(s.amount) > 0)
      const splitTotal = splits.reduce((s, sp) => s + parseFloat(sp.amount), 0)
      if (Math.abs(splitTotal - totalAmount) > 0.02) {
        toast.error('Splits do not add up', {
          description: `Total splits: $${splitTotal.toFixed(2)}, expense: $${totalAmount.toFixed(2)}`,
        })
        return
      }
    } else if (splitMethod === 'percent') {
      if (!percentBalanced) {
        toast.error('Percentages must total 100%', {
          description: `Currently at ${percentTotal.toFixed(1)}%.`,
        })
        return
      }
      splits = percentSplits.map(p => ({
        userId: p.userId,
        amount: ((parseFloat(p.percent) / 100) * totalAmount).toFixed(2),
      }))
    } else if (splitMethod === 'shares') {
      splits = shareSplits.map(sh => ({
        userId: sh.userId,
        amount: (sh.shares * perShare).toFixed(2),
      }))
    }
    // payer only: one split for the payer themselves covering the full amount
    if (splitMethod === 'payer') {
      splits = [{ userId: effectivePaidBy, amount: totalAmount.toFixed(2) }]
    }

    // Guard: reject any splits with a missing userId before hitting the DB
    const invalidSplit = splits.find(sp => !sp.userId || sp.userId.trim() === '')
    if (invalidSplit) {
      toast.error('Split error', { description: 'Some split members are missing. Please re-open the form and try again.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: totalAmount.toFixed(2),
          paidBy: effectivePaidBy,
          splits,
          ...(receiptData ? { receiptData: JSON.stringify(receiptData) } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code && onUpgradeRequired) { onUpgradeRequired(data.code); return }
        toast.error('Failed to save', { description: data.error ?? 'Something went wrong.' })
        return
      }

      // Save template if requested
      if (saveAsTemplate && templateName.trim() && splitMethod !== 'equal' && splitMethod !== 'payer') {
        const templateSplits =
          splitMethod === 'custom' ? splits.map(s => ({ userId: s.userId, value: parseFloat(s.amount) })) :
          splitMethod === 'percent' ? percentSplits.map(p => ({ userId: p.userId, value: parseFloat(p.percent) })) :
          shareSplits.map(sh => ({ userId: sh.userId, value: sh.shares }))

        fetch('/api/split-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: templateName.trim(), method: splitMethod, splits: templateSplits }),
        }).then(() => {
          qc.invalidateQueries({ queryKey: ['splitTemplates'] })
        }).catch(() => {
          // Non-fatal: template save failed silently
        })
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

  // ── Styles ─────────────────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    color: '#374151', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
    textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 16,
    border: `1.5px solid var(--roost-border)`,
    borderBottom: `3px solid var(--roost-border-bottom)`,
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    outline: 'none',
  }
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
    backgroundColor: active ? COLOR : 'var(--roost-surface)',
    color: active ? '#fff' : 'var(--roost-text-primary)',
    border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
    borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
  })

  // ── Render ─────────────────────────────────────────────────────────────

  // Full-screen scan steps replace the normal form
  const showScanFlow = scanStep !== 'idle'

  return (
    <DraggableSheet
      open={open}
      onOpenChange={(v: boolean) => { if (!v) { resetForm(); onClose() } }}
      featureColor={COLOR}
    >
      {/* ── SCAN: ReceiptScanner ─────────────────────────────────────────── */}
      {scanStep === 'scanning' && (
        <ReceiptScanner
          onResult={handleScanResult}
          onManual={handleManualEntry}
          onCancel={() => setScanStep('idle')}
        />
      )}

      {/* ── SCAN: LineItemReview ─────────────────────────────────────────── */}
      {scanStep === 'reviewing' && scannedReceipt && (
        <LineItemReview
          receipt={scannedReceipt}
          members={members}
          currentUserId={currentUserId}
          onConfirm={handleReviewConfirm}
          onManual={() => {
            setScannedReceipt({ lineItems: [] })
            setScanStep('reviewing')
          }}
          onBack={() => setScanStep('scanning')}
        />
      )}

      {/* ── SCAN: LineItemGrid ───────────────────────────────────────────── */}
      {scanStep === 'grid' && (
        <LineItemGrid
          items={reviewedItems}
          taxAndTip={reviewedTaxAndTip}
          members={members}
          onConfirm={handleGridConfirm}
          onBack={() => setScanStep('reviewing')}
        />
      )}

      {/* ── NORMAL FORM ─────────────────────────────────────────────────── */}
      {!showScanFlow && (
        <div className="px-4 pb-8">
          <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
            Add expense
          </p>

          {/* Scan banner (create mode only) */}
          <button
            onClick={() => {
              if (!isPremium) {
                if (onUpgradeRequired) {
                  onUpgradeRequired('RECEIPT_SCANNING_PREMIUM')
                } else {
                  toast.error('Receipt scanning is a premium feature', {
                    description: 'Upgrade to scan receipts and get unlimited scans.',
                  })
                }
                return
              }
              setScanStep('scanning')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '12px 14px',
              marginBottom: 20,
              borderRadius: 12,
              border: `1.5px dashed ${COLOR}`,
              borderBottom: `3px dashed ${COLOR_DARK}`,
              backgroundColor: `${COLOR}0D`,
              cursor: 'pointer',
              textAlign: 'left',
              opacity: isPremium ? 1 : 0.6,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              backgroundColor: `${COLOR}22`,
              border: `1.5px solid ${COLOR}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPremium
                ? <Camera size={18} style={{ color: COLOR }} />
                : <Lock size={18} style={{ color: COLOR }} />
              }
            </div>
            <div>
              <p style={{ color: COLOR_DARK, fontWeight: 800, fontSize: 14, margin: 0 }}>
                Scan receipt to auto-fill
              </p>
              <p style={{ color: COLOR_DARK, fontWeight: 600, fontSize: 12, margin: 0, opacity: 0.7 }}>
                {isPremium ? '75 free scans/month' : 'Premium feature'}
              </p>
            </div>
          </button>

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

          {/* Saved templates section */}
          {templates.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setTemplatesOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 14 }}>
                  Saved templates
                </span>
                {templatesOpen
                  ? <ChevronUp size={16} style={{ color: 'var(--roost-text-muted)' }} />
                  : <ChevronDown size={16} style={{ color: 'var(--roost-text-muted)' }} />
                }
              </button>
              {templatesOpen && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {templates.map(tmpl => (
                    <div key={tmpl.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: 'var(--roost-surface)',
                      border: '1.5px solid var(--roost-border)',
                    }}>
                      <div>
                        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 14, margin: 0 }}>
                          {tmpl.name}
                        </p>
                        <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, margin: 0 }}>
                          {templateSummary(tmpl)}
                        </p>
                      </div>
                      <button
                        onClick={() => applyTemplate(tmpl)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                          backgroundColor: COLOR, color: '#fff',
                          border: 'none', borderBottom: `2px solid ${COLOR_DARK}`,
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Split method */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Split</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { value: 'payer', label: 'Just me' },
                { value: 'equal', label: 'Equal' },
                { value: 'custom', label: 'Custom $' },
                { value: 'percent', label: '%' },
                { value: 'shares', label: 'Shares' },
              ] as const).map(({ value, label }) => (
                <button key={value} onClick={() => handleSplitMethodChange(value)} style={pillStyle(splitMethod === value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom $ splits */}
          {splitMethod === 'custom' && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.filter(m => m.id !== paidBy).map(m => {
                const split = customSplits.find(s => s.userId === m.id)
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniAvatar member={m} />
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                      {m.name}
                    </span>
                    <div style={{ position: 'relative', width: 100 }}>
                      <span style={{
                        position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13,
                      }}>$</span>
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

          {/* Percent splits */}
          {splitMethod === 'percent' && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => {
                const entry = percentSplits.find(p => p.userId === m.id)
                const pct = parseFloat(entry?.percent ?? '0') || 0
                const dollars = (pct / 100) * totalAmount
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniAvatar member={m} />
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                      {m.name}
                    </span>
                    <div style={{ position: 'relative', width: 80 }}>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={entry?.percent ?? ''}
                        onChange={e => setPercentSplits(prev =>
                          prev.some(p => p.userId === m.id)
                            ? prev.map(p => p.userId === m.id ? { ...p, percent: e.target.value } : p)
                            : [...prev, { userId: m.id, percent: e.target.value }]
                        )}
                        style={{ ...inputStyle, width: '100%', paddingRight: 20, textAlign: 'right' }}
                      />
                      <span style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13, pointerEvents: 'none',
                      }}>%</span>
                    </div>
                    <span style={{
                      width: 70, textAlign: 'right', fontWeight: 700, fontSize: 13,
                      color: 'var(--roost-text-muted)',
                    }}>
                      {totalAmount > 0 ? `$${dollars.toFixed(2)}` : '--'}
                    </span>
                  </div>
                )
              })}

              {/* Progress bar */}
              <div style={{ marginTop: 4 }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  backgroundColor: 'var(--roost-border)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(percentTotal, 100)}%`,
                    borderRadius: 3,
                    backgroundColor: percentBalanced ? COLOR : (percentTotal > 100 ? '#EF4444' : '#F59E0B'),
                    transition: 'width 0.2s, background-color 0.2s',
                  }} />
                </div>
                <p style={{
                  color: percentBalanced ? COLOR_DARK : 'var(--roost-text-muted)',
                  fontWeight: 700, fontSize: 12, marginTop: 4,
                }}>
                  {percentBalanced
                    ? `${percentTotal.toFixed(0)}% — balanced`
                    : percentTotal > 100
                      ? `${percentTotal.toFixed(0)}% — ${(percentTotal - 100).toFixed(0)}% over`
                      : `${percentTotal.toFixed(0)}% — needs ${(100 - percentTotal).toFixed(0)}% more`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Shares splits */}
          {splitMethod === 'shares' && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => {
                const entry = shareSplits.find(s => s.userId === m.id)
                const shares = entry?.shares ?? 1
                const dollars = totalShares > 0 ? (shares / totalShares) * totalAmount : 0
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniAvatar member={m} />
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                      {m.name}
                    </span>
                    {/* Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setShareSplits(prev => prev.map(s =>
                          s.userId === m.id ? { ...s, shares: Math.max(1, s.shares - 1) } : s
                        ))}
                        style={{
                          width: 32, height: 32, borderRadius: 8, fontWeight: 800, fontSize: 18,
                          backgroundColor: 'var(--roost-surface)',
                          border: '1.5px solid var(--roost-border)',
                          borderBottom: '2px solid var(--roost-border-bottom)',
                          cursor: 'pointer', color: 'var(--roost-text-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        −
                      </button>
                      <span style={{
                        width: 36, textAlign: 'center', fontWeight: 800, fontSize: 15,
                        color: 'var(--roost-text-primary)',
                      }}>
                        {shares}x
                      </span>
                      <button
                        onClick={() => setShareSplits(prev => prev.map(s =>
                          s.userId === m.id ? { ...s, shares: s.shares + 1 } : s
                        ))}
                        style={{
                          width: 32, height: 32, borderRadius: 8, fontWeight: 800, fontSize: 18,
                          backgroundColor: 'var(--roost-surface)',
                          border: '1.5px solid var(--roost-border)',
                          borderBottom: '2px solid var(--roost-border-bottom)',
                          cursor: 'pointer', color: 'var(--roost-text-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        +
                      </button>
                    </div>
                    <span style={{
                      width: 70, textAlign: 'right', fontWeight: 700, fontSize: 13,
                      color: 'var(--roost-text-muted)',
                    }}>
                      {totalAmount > 0 && totalShares > 0 ? `$${dollars.toFixed(2)}` : '--'}
                    </span>
                  </div>
                )
              })}
              {totalShares > 0 && totalAmount > 0 && (
                <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, marginTop: 2 }}>
                  {totalShares} total shares · ${perShare.toFixed(2)} per share
                </p>
              )}
            </div>
          )}

          {/* Save as template (for non-equal, non-payer methods) */}
          {(splitMethod === 'custom' || splitMethod === 'percent' || splitMethod === 'shares') && (
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 14,
              }}>
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={e => setSaveAsTemplate(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                Save this split as a template
              </label>
              {saveAsTemplate && (
                <input
                  type="text"
                  placeholder="Template name"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  style={{ ...inputStyle, marginTop: 10 }}
                />
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || (splitMethod === 'percent' && !percentBalanced)}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 800, fontSize: 16,
              backgroundColor: COLOR, color: '#fff', border: 'none',
              borderBottom: `3px solid ${COLOR_DARK}`,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving || (splitMethod === 'percent' && !percentBalanced) ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Add expense'}
          </button>
        </div>
      )}
    </DraggableSheet>
  )
}
