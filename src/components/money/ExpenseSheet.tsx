'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Camera, ChevronDown, ChevronUp, DollarSign, Lock, Percent, Trash2, Users } from 'lucide-react'
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

interface SplitTemplate {
  id: string
  name: string
  method: 'custom' | 'percent'
  splits: { userId: string; value: number }[]
}

type SplitMethod = 'equal' | 'custom' | 'percent' | 'payer'
type ScanStep = 'idle' | 'scanning' | 'reviewing' | 'grid'

export interface EditableExpense {
  id: string
  title: string
  amount: string | number
  categoryId?: string | null
  notes?: string | null
  paidBy: string
}

interface Props {
  open: boolean
  onClose: () => void
  members: Member[]
  currentUserId: string
  isPremium: boolean
  onUpgradeRequired?: (code: string) => void
  // When set, the sheet opens in edit mode: only title, category, and notes are
  // editable (the PATCH endpoint accepts nothing else). Amount, payer, and the
  // split editor are read-only in this mode.
  expense?: EditableExpense | null
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

export function ExpenseSheet({ open, onClose, members, currentUserId, isPremium, onUpgradeRequired, expense }: Props) {
  const qc = useQueryClient()

  const editing = !!expense

  // Form state
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId ?? '')
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('payer')
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([])
  const [percentSplits, setPercentSplits] = useState<PercentSplit[]>([])
  const [equalSelectedIds, setEqualSelectedIds] = useState<Set<string>>(new Set())
  // Selection state for the Custom / Percent pickers. Each tracks which other
  // members are "in" the split. You (the logged-in user) are always implicitly
  // a participant; your share is computed from the remainder.
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set())
  const [percentSelectedIds, setPercentSelectedIds] = useState<Set<string>>(new Set())
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

  // Fetch categories
  const { data: categories = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const r = await fetch('/api/expenses/categories')
      if (!r.ok) return []
      return r.json()
    },
    staleTime: 60_000,
    enabled: open,
  })

  // Fetch saved templates — parse `splits` from JSON string to array
  const { data: templates = [] } = useQuery<SplitTemplate[]>({
    queryKey: ['splitTemplates'],
    queryFn: async () => {
      const r = await fetch('/api/split-templates')
      if (!r.ok) return []
      const data = await r.json()
      const raw: { id: string; name: string; method: string; splits: string | { userId: string; value: number }[] }[] =
        Array.isArray(data.templates) ? data.templates : []
      return raw
        // Legacy "shares" templates are no longer supported; hide them so they
        // cannot be applied to a method that no longer exists.
        .filter(t => t.method === 'custom' || t.method === 'percent')
        .map(t => ({
          ...t,
          method: t.method as SplitTemplate['method'],
          splits: typeof t.splits === 'string' ? JSON.parse(t.splits) : t.splits,
        }))
    },
    staleTime: 60_000,
  })

  // Seed paidBy whenever currentUserId becomes available (runs regardless of open state,
  // so the select is pre-filled even if the session query resolves while the sheet is open)
  useEffect(() => {
    if (currentUserId && !paidBy) {
      setPaidBy(currentUserId)
    }
  }, [currentUserId])

  // Seed the form from the expense being edited. `expense` is a stable state
  // value from the parent, so this only fires when the sheet opens in edit mode.
  useEffect(() => {
    if (open && expense) {
      setTitle(expense.title)
      setAmount(String(expense.amount))
      setCategoryId(expense.categoryId ?? '')
      setNotes(expense.notes ?? '')
      setPaidBy(expense.paidBy)
    }
  }, [open, expense])

  // ── Init helpers ───────────────────────────────────────────────────────

  // All four splits use the same mental model: the logged-in user (you) is
  // always implicitly a participant and is never shown in the picker (you
  // cannot split a bill with yourself). The picker chooses the other people to
  // split with, and the default values distribute evenly across (you + the
  // selected others). Who actually paid is a separate choice ("Paid by") that
  // only affects the debt direction, not who participates.

  function initCustomSplits(selfId: string) {
    const others = members.filter(m => m.id !== selfId)
    const preselect = others.length === 1
    setCustomSelectedIds(new Set(preselect ? others.map(m => m.id) : []))
    const each = preselect && amount ? (parseFloat(amount) / 2).toFixed(2) : ''
    setCustomSplits(preselect ? others.map(m => ({ userId: m.id, amount: each })) : [])
  }

  function initPercentSplits(selfId: string) {
    const others = members.filter(m => m.id !== selfId)
    const preselect = others.length === 1
    setPercentSelectedIds(new Set(preselect ? others.map(m => m.id) : []))
    setPercentSplits(preselect ? others.map(m => ({ userId: m.id, percent: '50' })) : [])
  }

  function initEqualSplits(selfId: string) {
    const others = members.filter(m => m.id !== selfId)
    const preselect = others.length === 1
    setEqualSelectedIds(new Set(preselect ? others.map(m => m.id) : []))
  }

  function handleSplitMethodChange(method: SplitMethod) {
    setSplitMethod(method)
    if (method === 'equal') initEqualSplits(selfId)
    if (method === 'custom') initCustomSplits(selfId)
    if (method === 'percent') initPercentSplits(selfId)
  }

  // Changing who paid does not change who participates (you are always in the
  // split, the picker holds the others), so we only record the payer here and
  // leave the user's member selections untouched.
  function handlePaidByChange(userId: string) {
    setPaidBy(userId)
  }

  function resetForm() {
    setTitle('')
    setAmount('')
    setCategoryId('')
    setNotes('')
    setPaidBy(currentUserId)
    setSplitMethod('payer')
    setCustomSplits([])
    setPercentSplits([])
    setEqualSelectedIds(new Set())
    setCustomSelectedIds(new Set())
    setPercentSelectedIds(new Set())
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

  // The effective payer: the explicit "Paid by" choice, falling back to the
  // current user (the one adding the expense) and then to the first member.
  // Use this everywhere we filter the picker or compute participant counts,
  // because `paidBy` state can be transiently empty before the session resolves
  // or when the dropdown is in an indeterminate state — in those cases the
  // current user is the right implicit payer.
  const effectivePaidBy = paidBy || currentUserId || members[0]?.id || ''

  // The logged-in user is always implicitly part of the split and is never an
  // option in the "split with" picker. This identity drives the picker and the
  // participant math; it is independent of who paid (effectivePaidBy).
  const selfId = currentUserId || members[0]?.id || ''

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

  // ── Delete template ────────────────────────────────────────────────────

  async function deleteTemplate(id: string, name: string) {
    try {
      const r = await fetch(`/api/split-templates/${id}`, { method: 'DELETE' })
      if (r.ok) {
        toast.success('Template deleted', { description: `"${name}" removed.` })
        qc.invalidateQueries({ queryKey: ['splitTemplates'] })
      } else {
        toast.error('Could not delete template', { description: 'Try again.' })
      }
    } catch {
      toast.error('Could not delete template', { description: 'Network error.' })
    }
  }

  // ── Apply template ─────────────────────────────────────────────────────

  function applyTemplate(tmpl: SplitTemplate) {
    setSplitMethod(tmpl.method)
    if (tmpl.method === 'custom') {
      setCustomSplits(tmpl.splits.map(s => ({ userId: s.userId, amount: String(s.value) })))
    } else if (tmpl.method === 'percent') {
      setPercentSplits(tmpl.splits.map(s => ({ userId: s.userId, percent: String(s.value) })))
    }
    setTemplatesOpen(false)
  }

  function templateSummary(tmpl: SplitTemplate): string {
    const names: Record<string, string> = {}
    members.forEach(m => { names[m.id] = m.name.split(' ')[0] })
    return tmpl.splits.slice(0, 3).map(s => {
      const name = names[s.userId] ?? 'Unknown'
      if (tmpl.method === 'percent') return `${name} ${s.value}%`
      return `${name} $${s.value.toFixed(2)}`
    }).join(' · ')
  }

  // ── Save handler ───────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required', { description: 'Give the expense a name.' }); return }

    // Edit mode: only title, category, and notes can change. The amount, payer,
    // and splits are locked, so we PATCH just those three fields.
    if (editing && expense) {
      setSaving(true)
      try {
        const res = await fetch(`/api/expenses/${expense.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            categoryId: categoryId || null,
            notes: notes.trim() || null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error('Failed to save', { description: data.error ?? 'Something went wrong.' })
          return
        }
        toast.success('Expense updated')
        qc.invalidateQueries({ queryKey: ['expenses'] })
        qc.invalidateQueries({ queryKey: ['money-dashboard'] })
        qc.invalidateQueries({ queryKey: ['budgets'] })
        resetForm()
        onClose()
      } finally {
        setSaving(false)
      }
      return
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive number.' }); return
    }

    if (!effectivePaidBy) {
      toast.error('Payer required', { description: 'Select who paid for this expense.' })
      return
    }

    let splits: CustomSplit[] = []

    if (splitMethod === 'equal') {
      // Selected other members from the picker; you (the logged-in user) are
      // always implicitly a participant (your share is recorded on your own row).
      const selectedOtherIds = [...equalSelectedIds]
        .filter(id => id !== selfId && members.some(m => m.id === id))
      const participantIds = [selfId, ...selectedOtherIds]
      const n = participantIds.length
      // Even per-person amount; the last row absorbs the rounding residual so
      // the splits sum exactly equals the expense total. Without this, three
      // participants at $80 would each be $26.67 and the splits would sum to
      // $80.01, which is fine here, but for some totals the rounding drift
      // would exceed the server's 0.02 tolerance and the save would fail.
      const per = Math.round((totalAmount / n) * 100) / 100
      const lastRowAmount = Math.round((totalAmount - per * (n - 1)) * 100) / 100
      splits = participantIds.map((id, i) => ({
        userId: id,
        amount: (i === n - 1 ? lastRowAmount : per).toFixed(2),
      }))
    } else if (splitMethod === 'custom') {
      // Selected other entries with a non-empty value. You are implicit; your
      // amount = totalAmount - sum(others). If the user has overshot the total,
      // surface a clear error rather than letting the server reject.
      const selected = customSplits.filter(
        s => customSelectedIds.has(s.userId) && s.userId !== selfId && s.amount,
      )
      const othersSum = selected.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)
      if (othersSum > totalAmount + 0.02) {
        toast.error('Splits exceed the total', {
          description: `Selected splits add up to $${othersSum.toFixed(2)}, expense: $${totalAmount.toFixed(2)}.`,
        })
        return
      }
      const yourAmount = Math.max(0, Math.round((totalAmount - othersSum) * 100) / 100)
      splits = [
        { userId: selfId, amount: yourAmount.toFixed(2) },
        ...selected.map(s => ({ userId: s.userId, amount: (parseFloat(s.amount) || 0).toFixed(2) })),
      ]
    } else if (splitMethod === 'percent') {
      const selected = percentSplits.filter(
        p => percentSelectedIds.has(p.userId) && p.userId !== selfId,
      )
      const othersPct = selected.reduce((s, p) => s + (parseFloat(p.percent) || 0), 0)
      if (othersPct > 100 + 0.01) {
        toast.error('Percentages exceed 100%', {
          description: `Selected percents add up to ${othersPct.toFixed(1)}%.`,
        })
        return
      }
      const yourPct = Math.max(0, 100 - othersPct)
      splits = [
        { userId: selfId, amount: ((yourPct / 100) * totalAmount).toFixed(2) },
        ...selected.map(p => ({ userId: p.userId, amount: ((parseFloat(p.percent) / 100) * totalAmount).toFixed(2) })),
      ]
    }
    // just me: one split for you covering the full amount (a personal expense)
    if (splitMethod === 'payer') {
      splits = [{ userId: selfId, amount: totalAmount.toFixed(2) }]
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
          ...(categoryId ? { categoryId } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
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
          splitMethod === 'custom'
            ? splits.map(s => ({ userId: s.userId, value: parseFloat(s.amount) }))
            : percentSplits.map(p => ({ userId: p.userId, value: parseFloat(p.percent) }))

        try {
          const tr = await fetch('/api/split-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: templateName.trim(), method: splitMethod, splits: templateSplits }),
          })
          if (tr.ok) {
            toast.success('Split template saved', { description: `"${templateName.trim()}" is ready to reuse.` })
            qc.invalidateQueries({ queryKey: ['splitTemplates'] })
          } else {
            const td = await tr.json().catch(() => ({}))
            toast.error('Could not save template', { description: (td as { error?: string }).error ?? 'Try again.' })
          }
        } catch {
          toast.error('Could not save template', { description: 'Network error. Try again.' })
        }
      }

      toast.success('Expense added')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
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
            {editing ? 'Edit expense' : 'Add expense'}
          </p>

          {/* Scan banner (create mode only) */}
          {!editing && (
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
                {isPremium ? 'Unlimited scans' : 'Premium feature'}
              </p>
            </div>
          </button>
          )}

          {/* Amount (locked in edit mode: the amount and its splits cannot change) */}
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
                disabled={editing}
                style={{
                  ...inputStyle, paddingLeft: 24,
                  ...(editing ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--roost-bg)' } : {}),
                }}
              />
            </div>
            {editing && (
              <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, marginTop: 6 }}>
                The amount and split cannot be changed after an expense is created.
              </p>
            )}
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
                        padding: '6px 11px', borderRadius: 9,
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
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

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Anything worth remembering about this expense"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.4 }}
            />
          </div>

          {/* Paid by (locked in edit mode) */}
          {!editing && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Paid by</label>
            <select value={paidBy} onChange={e => handlePaidByChange(e.target.value)} style={inputStyle}>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.id === currentUserId ? `${m.name} (you)` : m.name}</option>
              ))}
            </select>
          </div>
          )}

          {/* Saved templates section */}
          {!editing && templates.length > 0 && (
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
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: 'var(--roost-surface)',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 14, margin: 0 }}>
                          {tmpl.name}
                        </p>
                        <p style={{
                          color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {tmpl.method} · {templateSummary(tmpl)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => applyTemplate(tmpl)}
                          style={{
                            padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                            backgroundColor: COLOR, color: '#fff',
                            border: 'none', borderBottom: `2px solid ${COLOR_DARK}`,
                            cursor: 'pointer',
                          }}
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => deleteTemplate(tmpl.id, tmpl.name)}
                          style={{
                            width: 34, height: 34, borderRadius: 8,
                            backgroundColor: 'var(--roost-surface)',
                            border: '1.5px solid var(--roost-border)',
                            borderBottom: '2px solid var(--roost-border-bottom)',
                            cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} style={{ color: '#EF4444' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Split method (locked in edit mode: PATCH does not accept splits) */}
          {!editing && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Split</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { value: 'payer', label: 'Just me' },
                { value: 'equal', label: 'Equal' },
                { value: 'custom', label: 'Custom $' },
                { value: 'percent', label: '%' },
              ] as const).map(({ value, label }) => (
                <button key={value} onClick={() => handleSplitMethodChange(value)} style={pillStyle(splitMethod === value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Equal split member selector */}
          {!editing && splitMethod === 'equal' && (() => {
            // Count only the selected other members; you (the logged-in user)
            // are always the implicit +1, so participantCount stays correct even
            // if equalSelectedIds was seeded before the session resolved.
            const selectedOtherCount = [...equalSelectedIds].filter(id => id !== selfId).length
            const participantCount = selectedOtherCount + 1 // +1 for you
            const perPerson = participantCount > 1 && totalAmount > 0
              ? (totalAmount / participantCount).toFixed(2)
              : null
            return (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
                  Split with (you are always included)
                </p>
                {members.filter(m => m.id !== selfId).map(m => {
                  const checked = equalSelectedIds.has(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => setEqualSelectedIds(prev => {
                        const next = new Set(prev)
                        if (next.has(m.id)) next.delete(m.id)
                        else next.add(m.id)
                        return next
                      })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        backgroundColor: checked ? `${COLOR}11` : 'var(--roost-surface)',
                        border: `1.5px solid ${checked ? COLOR : 'var(--roost-border)'}`,
                        borderBottom: `3px solid ${checked ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        backgroundColor: checked ? COLOR : 'var(--roost-surface)',
                        border: `2px solid ${checked ? COLOR : 'var(--roost-border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                            <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <MiniAvatar member={m} />
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                        {m.name}
                      </span>
                      {checked && perPerson && (
                        <span style={{ fontWeight: 700, fontSize: 13, color: COLOR_DARK }}>
                          ${perPerson}
                        </span>
                      )}
                    </button>
                  )
                })}
                {totalAmount > 0 && selectedOtherCount > 0 && (
                  <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, marginTop: 2 }}>
                    {participantCount} people · ${(totalAmount / participantCount).toFixed(2)} each
                  </p>
                )}
              </div>
            )
          })()}

          {/* Custom $ splits */}
          {!editing && splitMethod === 'custom' && (() => {
            // Filter selection against selfId; you are implicit and cover the
            // remainder, so your own row never appears in the picker.
            const selectedSum = customSplits
              .filter(s => customSelectedIds.has(s.userId) && s.userId !== selfId)
              .reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)
            const yourAmount = Math.max(0, totalAmount - selectedSum)
            const over = selectedSum > totalAmount + 0.02
            return (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
                  Split with (you cover the remainder)
                </p>
                {members.filter(m => m.id !== selfId).map(m => {
                  const split = customSplits.find(s => s.userId === m.id)
                  const checked = customSelectedIds.has(m.id)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        aria-label={`${checked ? 'Remove' : 'Add'} ${m.name}`}
                        onClick={() => setCustomSelectedIds(prev => {
                          const next = new Set(prev)
                          if (next.has(m.id)) next.delete(m.id)
                          else next.add(m.id)
                          return next
                        })}
                        style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          backgroundColor: checked ? COLOR : 'var(--roost-surface)',
                          border: `2px solid ${checked ? COLOR : 'var(--roost-border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {checked && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                            <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <MiniAvatar member={m} />
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: checked ? 'var(--roost-text-primary)' : 'var(--roost-text-muted)' }}>
                        {m.name}
                      </span>
                      {checked ? (
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
                      ) : (
                        <span style={{ width: 100, textAlign: 'right', color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13 }}>-</span>
                      )}
                    </div>
                  )
                })}
                {totalAmount > 0 && (
                  <p style={{ color: over ? '#EF4444' : 'var(--roost-text-muted)', fontWeight: 700, fontSize: 12, marginTop: 2 }}>
                    {over
                      ? `Selected total $${selectedSum.toFixed(2)}, $${(selectedSum - totalAmount).toFixed(2)} over the expense.`
                      : `Your share: $${yourAmount.toFixed(2)}`}
                  </p>
                )}
              </div>
            )
          })()}

          {/* Percent splits */}
          {!editing && splitMethod === 'percent' && (() => {
            const selectedPct = percentSplits
              .filter(p => percentSelectedIds.has(p.userId) && p.userId !== selfId)
              .reduce((s, p) => s + (parseFloat(p.percent) || 0), 0)
            const yourPct = Math.max(0, 100 - selectedPct)
            const over = selectedPct > 100
            return (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
                  Split with (you cover the remaining %)
                </p>
                {members.filter(m => m.id !== selfId).map(m => {
                  const entry = percentSplits.find(p => p.userId === m.id)
                  const pct = parseFloat(entry?.percent ?? '0') || 0
                  const dollars = (pct / 100) * totalAmount
                  const checked = percentSelectedIds.has(m.id)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        aria-label={`${checked ? 'Remove' : 'Add'} ${m.name}`}
                        onClick={() => setPercentSelectedIds(prev => {
                          const next = new Set(prev)
                          if (next.has(m.id)) next.delete(m.id)
                          else next.add(m.id)
                          return next
                        })}
                        style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          backgroundColor: checked ? COLOR : 'var(--roost-surface)',
                          border: `2px solid ${checked ? COLOR : 'var(--roost-border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {checked && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                            <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <MiniAvatar member={m} />
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: checked ? 'var(--roost-text-primary)' : 'var(--roost-text-muted)' }}>
                        {m.name}
                      </span>
                      {checked ? (
                        <>
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
                            {totalAmount > 0 ? `$${dollars.toFixed(2)}` : '-'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ width: 80, textAlign: 'right', color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13 }}>-</span>
                          <span style={{ width: 70 }} />
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Progress bar fills with the selected others' percents; you
                    cover whatever is left. */}
                <div style={{ marginTop: 4 }}>
                  <div style={{
                    height: 6, borderRadius: 3,
                    backgroundColor: 'var(--roost-border)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(selectedPct, 100)}%`,
                      borderRadius: 3,
                      backgroundColor: over ? '#EF4444' : COLOR,
                      transition: 'width 0.2s, background-color 0.2s',
                    }} />
                  </div>
                  <p style={{
                    color: over ? '#EF4444' : 'var(--roost-text-muted)',
                    fontWeight: 700, fontSize: 12, marginTop: 4,
                  }}>
                    {over
                      ? `Selected ${selectedPct.toFixed(0)}%, ${(selectedPct - 100).toFixed(0)}% over`
                      : `Your share: ${yourPct.toFixed(0)}%`}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Save as template (for non-equal, non-payer methods) */}
          {!editing && (splitMethod === 'custom' || splitMethod === 'percent') && (
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
            disabled={saving}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 800, fontSize: 16,
              backgroundColor: COLOR, color: '#fff', border: 'none',
              borderBottom: `3px solid ${COLOR_DARK}`,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      )}
    </DraggableSheet>
  )
}
