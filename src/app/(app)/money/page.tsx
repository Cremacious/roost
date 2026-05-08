'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, Wallet, Receipt, BarChart3, Target, ListChecks, TrendingUp,
  CheckCircle, Clock, AlertCircle, ChevronRight, Edit2, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { SlabCard } from '@/components/ui/SlabCard'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { ExpenseSheet } from '@/components/money/ExpenseSheet'
import { SettleSheet } from '@/components/money/SettleSheet'
import { GoalSheet } from '@/components/money/GoalSheet'
import { ContributeSheet } from '@/components/money/ContributeSheet'
import { BillSheet } from '@/components/money/BillSheet'
import { BudgetSheet, type EditableBudget } from '@/components/money/BudgetSheet'
import { useHousehold } from '@/lib/hooks/useHousehold'

function EmptyState({ color, icon, title, body, buttonLabel, onButtonClick }: {
  color: string; icon: React.ReactNode; title: string; body: string; buttonLabel?: string; onButtonClick?: () => void
}) {
  return (
    <div style={{ backgroundColor: 'var(--roost-surface)', border: '2px dashed var(--roost-border)', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 12, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${color}`, marginBottom: 12, color }}>{icon}</div>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)' }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>{body}</p>
      {buttonLabel && onButtonClick && (
        <button onClick={onButtonClick} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, backgroundColor: color, color: '#fff', border: 'none', borderBottom: `3px solid #159040`, cursor: 'pointer' }}>{buttonLabel}</button>
      )}
    </div>
  )
}

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

type Tab = 'dashboard' | 'expenses' | 'bills' | 'budget' | 'goals' | 'insights'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Overview', icon: <Wallet size={14} /> },
  { id: 'expenses', label: 'Expenses', icon: <Receipt size={14} /> },
  { id: 'bills', label: 'Bills', icon: <ListChecks size={14} /> },
  { id: 'budget', label: 'Budget', icon: <BarChart3 size={14} /> },
  { id: 'goals', label: 'Goals', icon: <Target size={14} /> },
  { id: 'insights', label: 'Insights', icon: <TrendingUp size={14} /> },
]

const STATUS_CONFIG = {
  paid: { label: 'Paid', color: COLOR, icon: <CheckCircle size={14} color={COLOR} /> },
  due_soon: { label: 'Due soon', color: '#F59E0B', icon: <Clock size={14} color="#F59E0B" /> },
  overdue: { label: 'Overdue', color: '#EF4444', icon: <AlertCircle size={14} color="#EF4444" /> },
  upcoming: { label: 'Upcoming', color: 'var(--roost-text-muted)', icon: null },
}

function TabPill({ id, label, icon, active, onClick }: { id: Tab; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 12px', borderRadius: 10, fontWeight: 700, fontSize: 13,
        backgroundColor: active ? COLOR : 'var(--roost-surface)',
        color: active ? '#fff' : 'var(--roost-text-secondary)',
        border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
        borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {icon}{label}
    </button>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ currentUserId, members, isPremium, onOpenExpense, onOpenSettle }: {
  currentUserId: string
  members: Member[]
  isPremium: boolean
  onOpenExpense: () => void
  onOpenSettle: (debt: DebtItem) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['money-dashboard'],
    queryFn: () => fetch('/api/money/dashboard').then(r => r.json()),
    staleTime: 10_000,
  })

  if (isLoading) return <LoadingRows />

  const { balances, bills, budgetSummary, activeGoal, recentExpenses } = data ?? {}

  const netPositive = (balances?.netBalance ?? 0) >= 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Balance hero */}
      <SlabCard color={netPositive ? COLOR : '#EF4444'}>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <StatBox label="You're owed" value={`$${(balances?.totalOwed ?? 0).toFixed(2)}`} color={COLOR} />
          <StatBox label="You owe" value={`$${(balances?.totalOwe ?? 0).toFixed(2)}`} color="#EF4444" />
          <StatBox label="Spent this month" value={`$${(balances?.totalSpentThisMonth ?? 0).toFixed(2)}`} color="var(--roost-text-primary)" />
        </div>
      </SlabCard>

      {/* Bills preview */}
      {isPremium && bills?.length > 0 && (
        <div>
          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)', marginBottom: 8 }}>Bills this month</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bills.slice(0, 4).map((bill: Bill) => <BillRow key={bill.id} bill={bill} />)}
          </div>
        </div>
      )}

      {/* Budget summary */}
      {isPremium && budgetSummary && (
        <SlabCard color={budgetSummary.overBudgetCount > 0 ? '#EF4444' : COLOR}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>Budget this month</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)' }}>${budgetSummary.totalSpent.toFixed(2)}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--roost-text-muted)' }}>of ${budgetSummary.totalCap.toFixed(2)}</span>
            </div>
            {budgetSummary.overBudgetCount > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#EF4444' }}>
                {budgetSummary.overBudgetCount} {budgetSummary.overBudgetCount === 1 ? 'category' : 'categories'} over budget
              </p>
            )}
            <div style={{ marginTop: 8, height: 6, borderRadius: 99, backgroundColor: 'var(--roost-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, (budgetSummary.totalSpent / budgetSummary.totalCap) * 100)}%`, backgroundColor: budgetSummary.overBudgetCount > 0 ? '#EF4444' : COLOR, transition: 'width 0.3s' }} />
            </div>
          </div>
        </SlabCard>
      )}

      {/* Active goal */}
      {isPremium && activeGoal && (
        <SlabCard color={COLOR}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>Savings goal: {activeGoal.name}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)' }}>${activeGoal.savedAmount.toFixed(2)}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--roost-text-muted)' }}>of ${activeGoal.targetAmount.toFixed(2)}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: COLOR }}>{activeGoal.progressPercent}%</span>
            </div>
            <div style={{ marginTop: 8, height: 6, borderRadius: 99, backgroundColor: 'var(--roost-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${activeGoal.progressPercent}%`, backgroundColor: COLOR, transition: 'width 0.3s' }} />
            </div>
          </div>
        </SlabCard>
      )}

      {/* Recent expenses */}
      {recentExpenses?.length > 0 && (
        <div>
          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)', marginBottom: 8 }}>Recent expenses</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentExpenses.map((e: RecentExpense) => (
              <SlabCard key={e.id} color="var(--roost-border-bottom)">
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{e.paidByName} &bull; {format(new Date(e.createdAt), 'MMM d')}</p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>${parseFloat(String(e.amount)).toFixed(2)}</span>
                </div>
              </SlabCard>
            ))}
          </div>
        </div>
      )}

      {!recentExpenses?.length && (
        <EmptyState
          color={COLOR}
          icon={<Wallet size={28} />}
          title="All square."
          body="No expenses tracked. Either everyone is being weirdly generous, or nobody has added anything yet."
          buttonLabel="Add expense"
          onButtonClick={onOpenExpense}
        />
      )}
    </div>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

interface DebtItem {
  from: string
  to: string
  amount: number
  splitIds: string[]
  pendingClaim?: { settledByPayer: boolean; settledByPayee: boolean } | null
  toVenmoHandle?: string | null
  toCashappHandle?: string | null
}

interface Member {
  id: string
  name: string
  avatarColor?: string
}

interface Bill {
  id: string
  title: string
  amount: string | number
  dueDay: number | null
  status: 'paid' | 'due_soon' | 'overdue' | 'upcoming'
}

interface RecentExpense {
  id: string
  title: string
  amount: string | number
  paidBy: string
  paidByName: string
  createdAt: string
}

function ExpensesTab({ currentUserId, members, isPremium, onOpenExpense, onOpenSettle, onUpgradeRequired }: {
  currentUserId: string
  members: Member[]
  isPremium: boolean
  onOpenExpense: () => void
  onOpenSettle: (debt: DebtItem) => void
  onUpgradeRequired?: (code: string) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => fetch('/api/expenses').then(r => r.json()),
    staleTime: 10_000,
  })

  if (isLoading) return <LoadingRows />

  const { debts = [], expenses: expenseList = [], myBalance } = data ?? {}

  const myDebts: DebtItem[] = debts.filter((d: DebtItem) => d.from === currentUserId || d.to === currentUserId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Debt cards */}
      {myDebts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)', marginBottom: 0 }}>Who owes who</p>
          {myDebts.map((debt: DebtItem, i: number) => {
            const otherName = members.find(m => m.id === (debt.from === currentUserId ? debt.to : debt.from))?.name ?? 'Unknown'
            const iOwe = debt.from === currentUserId
            const pendingClaim = debt.pendingClaim
            const iClaimed = iOwe && pendingClaim?.settledByPayer
            const theyClaimed = !iOwe && pendingClaim?.settledByPayer

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2) }}
              >
                <SlabCard color={iClaimed ? '#F59E0B' : theyClaimed ? COLOR : (iOwe ? '#EF4444' : COLOR)} pressable onClick={() => onOpenSettle(debt)}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                        {iOwe ? `You owe ${otherName}` : `${otherName} owes you`}
                      </p>
                      {iClaimed && <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: '#D97706' }}>Awaiting confirmation</p>}
                      {theyClaimed && <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: COLOR }}>Tap to confirm</p>}
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 18, color: iOwe ? '#EF4444' : COLOR }}>${debt.amount.toFixed(2)}</span>
                    <ChevronRight size={16} color="var(--roost-text-muted)" />
                  </div>
                </SlabCard>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Expense list */}
      {expenseList.length > 0 ? (
        <div>
          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)', marginBottom: 8 }}>All expenses</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {expenseList.map((e: any, i: number) => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.2) }}>
                <SlabCard color="var(--roost-border-bottom)">
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                        Paid by {e.paidByName ?? 'Unknown'} &bull; {format(new Date(e.createdAt), 'MMM d')}
                      </p>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>${parseFloat(e.amount).toFixed(2)}</span>
                  </div>
                </SlabCard>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          color={COLOR}
          icon={<Receipt size={28} />}
          title="All square."
          body="No expenses tracked. Either everyone is being weirdly generous, or nobody has added anything yet."
          buttonLabel="Add expense"
          onButtonClick={onOpenExpense}
        />
      )}
    </div>
  )
}

// ─── Bills Tab ────────────────────────────────────────────────────────────────

function BillRow({ bill, isAdmin = false, onMarkPaid, marking = false, onDelete, deleting = false }: {
  bill: Bill
  isAdmin?: boolean
  onMarkPaid?: (id: string) => void
  marking?: boolean
  onDelete?: (id: string, title: string) => void
  deleting?: boolean
}) {
  const cfg = STATUS_CONFIG[bill.status]
  const isPaid = bill.status === 'paid'

  return (
    <SlabCard color={cfg.color}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>{bill.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
            {bill.dueDay ? `Due on the ${bill.dueDay}${ordinal(bill.dueDay)}` : 'No due date set'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>${parseFloat(String(bill.amount)).toFixed(2)}</span>
            {isAdmin && onDelete && (
              <button
                onClick={() => onDelete(bill.id, bill.title)}
                disabled={deleting}
                style={{
                  padding: 6, borderRadius: 8, border: 'none',
                  backgroundColor: 'transparent', cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.4 : 0.6, display: 'flex', alignItems: 'center',
                }}
              >
                <Trash2 size={15} color="#EF4444" />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {cfg.icon}
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>
          {isAdmin && !isPaid && onMarkPaid && (
            <button
              onClick={() => onMarkPaid(bill.id)}
              disabled={marking}
              style={{
                padding: '5px 10px', borderRadius: 8,
                fontWeight: 700, fontSize: 12,
                backgroundColor: COLOR, color: '#fff',
                border: 'none', borderBottom: `2px solid ${COLOR_DARK}`,
                cursor: marking ? 'not-allowed' : 'pointer',
                opacity: marking ? 0.6 : 1,
              }}
            >
              {marking ? 'Saving...' : 'Mark paid'}
            </button>
          )}
        </div>
      </div>
    </SlabCard>
  )
}

function BillsTab({ isPremium, isAdmin, currentUserId, onAddBill }: {
  isPremium: boolean
  isAdmin: boolean
  currentUserId: string
  onAddBill: () => void
}) {
  const qc = useQueryClient()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => fetch('/api/money/bills').then(r => r.json()),
    staleTime: 30_000,
    enabled: isPremium,
  })

  function handleDelete(billId: string, billTitle: string) {
    setPendingDelete({ id: billId, title: billTitle })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const { id, title } = pendingDelete
    setDeletingId(id)
    setPendingDelete(null)
    try {
      const res = await fetch(`/api/expenses/recurring/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error('Could not delete bill', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success(`"${title}" removed`)
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleMarkPaid(billId: string) {
    setMarkingId(billId)
    try {
      const res = await fetch(`/api/expenses/recurring/${billId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidBy: currentUserId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error('Could not mark bill as paid', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success('Bill marked as paid')
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
    } finally {
      setMarkingId(null)
    }
  }

  if (!isPremium) {
    return (
      <EmptyState color={COLOR} icon={<ListChecks size={28} />} title="Premium feature"
        body="Track your recurring bills and see which ones are paid, due soon, or overdue. Upgrade to unlock." />
    )
  }

  if (isLoading) return <LoadingRows />

  const { bills = [], summary } = data ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header row with add button */}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>
            {bills.length} bill{bills.length !== 1 ? 's' : ''} tracked
          </p>
          <button
            onClick={onAddBill}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              fontWeight: 700, fontSize: 13,
              backgroundColor: COLOR, color: '#fff',
              border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Add bill
          </button>
        </div>
      )}

      {!bills.length ? (
        <EmptyState
          color={COLOR}
          icon={<ListChecks size={28} />}
          title="No bills tracked."
          body="Add a recurring bill to track what is due each month."
          buttonLabel={isAdmin ? 'Add bill' : undefined}
          onButtonClick={isAdmin ? onAddBill : undefined}
        />
      ) : (
        <>
          {/* Summary */}
          <SlabCard color={COLOR}>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <StatBox label="Total" value={`$${(summary?.total ?? 0).toFixed(2)}`} color="var(--roost-text-primary)" />
              <StatBox label="Paid" value={`$${(summary?.paid ?? 0).toFixed(2)}`} color={COLOR} />
              <StatBox label="Remaining" value={`$${(summary?.remaining ?? 0).toFixed(2)}`} color="#EF4444" />
            </div>
          </SlabCard>

          {/* Bill list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bills.map((bill: Bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                isAdmin={isAdmin}
                onMarkPaid={handleMarkPaid}
                marking={markingId === bill.id}
                onDelete={handleDelete}
                deleting={deletingId === bill.id}
              />
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => { if (!v) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bill?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title} will be removed from your bills list. Past expenses are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setPendingDelete(null)}
              style={{
                padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)',
                border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                backgroundColor: '#EF4444', color: '#fff',
                border: 'none', borderBottom: '3px solid #C93B3B',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────

function BudgetTab({ isPremium, isAdmin, onAddBudget, onEditBudget }: {
  isPremium: boolean
  isAdmin: boolean
  onAddBudget: () => void
  onEditBudget: (b: EditableBudget) => void
}) {
  const qc = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => fetch('/api/expenses/budgets').then(r => r.json()),
    staleTime: 30_000,
    enabled: isPremium,
  })

  async function confirmDelete() {
    if (!pendingDelete) return
    const { id, name } = pendingDelete
    setDeletingId(id)
    setPendingDelete(null)
    try {
      const res = await fetch(`/api/expenses/budgets/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error('Could not delete budget', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success(`${name} budget removed`)
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
    } finally {
      setDeletingId(null)
    }
  }

  if (!isPremium) {
    return (
      <EmptyState color={COLOR} icon={<BarChart3 size={28} />} title="Premium feature"
        body="Set monthly spending caps by category and get warned when you're close to your limit." />
    )
  }

  if (isLoading) return <LoadingRows />

  const { budgets = [], totalCap, totalSpent } = data ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header row with add button */}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} set
          </p>
          <button
            onClick={onAddBudget}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              fontWeight: 700, fontSize: 13,
              backgroundColor: COLOR, color: '#fff',
              border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Add budget
          </button>
        </div>
      )}

      {!budgets.length ? (
        <EmptyState
          color={COLOR}
          icon={<BarChart3 size={28} />}
          title="No budgets set."
          body="Set a monthly spending limit per category to track where your money goes."
          buttonLabel={isAdmin ? 'Add budget' : undefined}
          onButtonClick={isAdmin ? onAddBudget : undefined}
        />
      ) : (
        <>
          {/* Summary */}
          <SlabCard color={COLOR}>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>Monthly total</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontWeight: 900, fontSize: 24, color: 'var(--roost-text-primary)' }}>${(totalSpent ?? 0).toFixed(2)}</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--roost-text-muted)' }}>of ${(totalCap ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </SlabCard>

          {budgets.map((b: any) => {
            const pct = Math.min(100, (b.spent / parseFloat(b.amount)) * 100)
            const isOver = b.status === 'over'
            const isWarn = b.status === 'warning'
            const barColor = isOver ? '#EF4444' : isWarn ? '#F59E0B' : COLOR

            return (
              <SlabCard key={b.id} color={barColor}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>{b.categoryName ?? 'Uncategorized'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--roost-text-muted)' }}>${b.spent.toFixed(2)} / ${parseFloat(b.amount).toFixed(2)}</span>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button
                            onClick={() => onEditBudget({ id: b.id, categoryId: b.categoryId, categoryName: b.categoryName ?? 'Budget', amount: b.amount, warningThreshold: b.warningThreshold })}
                            style={{ padding: 5, borderRadius: 7, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', opacity: 0.6, display: 'flex', alignItems: 'center' }}
                          >
                            <Edit2 size={14} color="var(--roost-text-primary)" />
                          </button>
                          <button
                            onClick={() => setPendingDelete({ id: b.id, name: b.categoryName ?? 'Budget' })}
                            disabled={deletingId === b.id}
                            style={{ padding: 5, borderRadius: 7, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', opacity: deletingId === b.id ? 0.3 : 0.6, display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={14} color="#EF4444" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, backgroundColor: 'var(--roost-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, backgroundColor: barColor, transition: 'width 0.3s' }} />
                  </div>
                  {isOver && <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Over budget</p>}
                  {isWarn && !isOver && <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: '#D97706' }}>{b.warningThreshold}% threshold reached</p>}
                </div>
              </SlabCard>
            )
          })}
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => { if (!v) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove budget?</AlertDialogTitle>
            <AlertDialogDescription>
              The {pendingDelete?.name} budget will be removed. Past expenses are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setPendingDelete(null)}
              style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderBottom: '3px solid #C93B3B', cursor: 'pointer' }}
            >
              Remove
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Goal History ─────────────────────────────────────────────────────────────

function GoalHistory({ goalId }: { goalId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['goal-contributions', goalId],
    queryFn: () => fetch(`/api/money/goals/${goalId}/contributions`).then(r => r.json()),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div style={{ padding: '12px 0' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 40, borderRadius: 10, backgroundColor: 'var(--roost-border)', opacity: 0.4, marginBottom: 8, animation: 'pulse 2s infinite' }} />
        ))}
      </div>
    )
  }

  const { contributions = [], perMember = [] } = data ?? {}

  if (contributions.length === 0) {
    return (
      <p style={{ margin: '12px 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center' }}>
        No contributions yet.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Per-member totals */}
      {perMember.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {perMember.map((m: any) => (
            <div
              key={m.userId}
              style={{
                padding: '4px 10px', borderRadius: 8,
                backgroundColor: COLOR + '18',
                border: `1px solid ${COLOR}40`,
                display: 'flex', gap: 6, alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-primary)' }}>{m.userName}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: COLOR }}>${m.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contribution list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {contributions.map((c: any) => (
          <div
            key={c.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              backgroundColor: 'var(--roost-bg)',
              border: '1.5px solid var(--roost-border)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--roost-text-primary)' }}>
                {c.userName ?? 'Unknown'}
              </p>
              {c.note && (
                <p style={{ margin: '1px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.note}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: COLOR }}>${c.amount.toFixed(2)}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                {format(new Date(c.createdAt), 'MMM d')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ isPremium, isAdmin, onNewGoal, onEditGoal, onContribute }: {
  isPremium: boolean
  isAdmin: boolean
  onNewGoal: () => void
  onEditGoal: (goal: any) => void
  onContribute: (goal: any) => void
}) {
  const qc = useQueryClient()
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function confirmDeleteGoal() {
    if (!pendingDelete) return
    const { id, name } = pendingDelete
    setDeletingId(id)
    setPendingDelete(null)
    try {
      const res = await fetch(`/api/money/goals/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error('Could not delete goal', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success(`"${name}" deleted`)
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
    } finally {
      setDeletingId(null)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => fetch('/api/money/goals').then(r => r.json()),
    staleTime: 30_000,
    enabled: isPremium,
  })

  if (!isPremium) {
    return (
      <EmptyState color={COLOR} icon={<Target size={28} />} title="Premium feature"
        body="Create shared savings goals and track contributions from every household member." />
    )
  }

  if (isLoading) return <LoadingRows />

  const { goals = [] } = data ?? {}

  const active = goals.filter((g: any) => !g.completedAt)
  const completed = goals.filter((g: any) => g.completedAt)

  async function markComplete(id: string) {
    const res = await fetch(`/api/money/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    if (res.ok) {
      toast.success('Goal marked complete!')
      qc.invalidateQueries({ queryKey: ['goals'] })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isAdmin && (
        <button
          onClick={onNewGoal}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', borderRadius: 14, fontWeight: 800, fontSize: 14,
            backgroundColor: COLOR, color: '#fff', border: 'none',
            borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> New goal
        </button>
      )}

      {active.length === 0 && completed.length === 0 && (
        <EmptyState color={COLOR} icon={<Target size={28} />} title="No goals yet."
          body="Create a savings goal to track the household's progress together." />
      )}

      {active.map((goal: any) => {
        const isExpanded = expandedGoalId === goal.id
        return (
          <SlabCard key={goal.id} color={COLOR}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)' }}>{goal.name}</p>
                  {goal.targetDate && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                      Target: {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => onEditGoal(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Edit2 size={15} color="var(--roost-text-muted)" />
                    </button>
                    <button
                      onClick={() => setPendingDelete({ id: goal.id, name: goal.name })}
                      disabled={deletingId === goal.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: deletingId === goal.id ? 0.3 : 0.6 }}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)' }}>${goal.savedAmount.toFixed(2)}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--roost-text-muted)' }}>of ${parseFloat(goal.targetAmount).toFixed(2)}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: COLOR }}>{goal.progressPercent}%</span>
              </div>

              <div style={{ height: 8, borderRadius: 99, backgroundColor: 'var(--roost-border)', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${goal.progressPercent}%`, backgroundColor: COLOR, transition: 'width 0.4s' }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onContribute(goal)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}
                >
                  Log contribution
                </button>
                <button
                  onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                    backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)',
                    border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
                    cursor: 'pointer',
                  }}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  History
                </button>
                {isAdmin && goal.progressPercent >= 100 && (
                  <button
                    onClick={() => markComplete(goal.id)}
                    style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: 'var(--roost-surface)', color: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}
                  >
                    Mark done
                  </button>
                )}
              </div>

              {isExpanded && <GoalHistory goalId={goal.id} />}
            </div>
          </SlabCard>
        )
      })}

      {completed.length > 0 && (
        <div>
          <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--roost-text-muted)', marginBottom: 8 }}>Completed</p>
          {completed.map((goal: any) => {
            const isExpanded = expandedGoalId === goal.id
            return (
              <SlabCard key={goal.id} color="var(--roost-border-bottom)">
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={18} color={COLOR} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>{goal.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--roost-text-muted)' }}>${parseFloat(goal.targetAmount).toFixed(2)} saved</p>
                    </div>

                    <button
                      onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                        backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-muted)',
                        border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      History
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setPendingDelete({ id: goal.id, name: goal.name })}
                        disabled={deletingId === goal.id}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: deletingId === goal.id ? 0.3 : 0.6 }}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </button>
                    )}
                  </div>
                  {isExpanded && <GoalHistory goalId={goal.id} />}
                </div>
              </SlabCard>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => { if (!v) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" and all its contribution history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setPendingDelete(null)}
              style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteGoal}
              style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderBottom: '3px solid #C93B3B', cursor: 'pointer' }}
            >
              Delete
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

const CHART_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#A855F7', '#F97316', '#06B6D4', '#EC4899']

function InsightsTab({ isPremium }: { isPremium: boolean }) {
  const [range, setRange] = useState<'7' | '30' | '90'>('30')

  const from = new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  const { data, isLoading } = useQuery({
    queryKey: ['insights', range],
    queryFn: () => fetch(`/api/money/insights?from=${from}&to=${to}`).then(r => r.json()),
    staleTime: 60_000,
    enabled: isPremium,
  })

  if (!isPremium) {
    return (
      <EmptyState color={COLOR} icon={<TrendingUp size={28} />} title="Premium feature"
        body="See spending trends, category breakdowns, and which members spend the most." />
    )
  }

  if (isLoading) return <LoadingRows />

  const { spendingOverTime = [], byCategory = [], byMember = [], grandTotal = 0 } = data ?? {}

  const rangePills: { label: string; value: '7' | '30' | '90' }[] = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Range selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {rangePills.map(p => (
          <button
            key={p.value}
            onClick={() => setRange(p.value)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12,
              backgroundColor: range === p.value ? COLOR : 'var(--roost-surface)',
              color: range === p.value ? '#fff' : 'var(--roost-text-secondary)',
              border: `1.5px solid ${range === p.value ? COLOR : 'var(--roost-border)'}`,
              borderBottom: `3px solid ${range === p.value ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Total */}
      <SlabCard color={COLOR}>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--roost-text-secondary)' }}>Total spent</p>
          <p style={{ margin: '4px 0 0', fontWeight: 900, fontSize: 28, color: 'var(--roost-text-primary)' }}>${grandTotal.toFixed(2)}</p>
        </div>
      </SlabCard>

      {/* Spending over time chart */}
      {spendingOverTime.length > 1 && (
        <SlabCard color="var(--roost-border-bottom)">
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>Spending over time</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={spendingOverTime} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--roost-text-muted)' as string }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--roost-surface)', border: '1px solid var(--roost-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [typeof v === 'number' ? `$${v.toFixed(2)}` : '$0.00', 'Spent']}
                />
                <Area type="monotone" dataKey="total" stroke={COLOR} strokeWidth={2} fill="url(#greenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SlabCard>
      )}

      {/* By category */}
      {byCategory.length > 0 && (
        <SlabCard color="var(--roost-border-bottom)">
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>By category</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={byCategory} dataKey="total" cx="50%" cy="50%" outerRadius={45} innerRadius={28} strokeWidth={0}>
                    {byCategory.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {byCategory.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.categoryName}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{c.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlabCard>
      )}

      {/* By member */}
      {byMember.length > 0 && (
        <SlabCard color="var(--roost-border-bottom)">
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>By member</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byMember.map((m: any) => (
                <div key={m.userId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--roost-text-primary)' }}>{m.userName}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--roost-text-primary)' }}>${m.total.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, backgroundColor: 'var(--roost-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${m.percent}%`, backgroundColor: COLOR }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlabCard>
      )}

      {grandTotal === 0 && (
        <EmptyState color={COLOR} icon={<TrendingUp size={28} />} title="No data yet."
          body="Add some expenses to see spending insights here." />
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color }}>{value}</p>
    </div>
  )
}

function LoadingRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 64, borderRadius: 16, backgroundColor: 'var(--roost-border)', opacity: 0.5, animation: 'pulse 2s infinite' }} />
      ))}
    </div>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MoneyPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [settleDebt, setSettleDebt] = useState<DebtItem | null>(null)
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any | null>(null)
  const [contributeGoal, setContributeGoal] = useState<any | null>(null)
  const [billSheetOpen, setBillSheetOpen] = useState(false)
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<EditableBudget | null>(null)

  const { isPremium, role } = useHousehold()
  const isAdmin = role === 'admin'

  const membersQuery = useQuery({
    queryKey: ['household-members'],
    queryFn: () => fetch('/api/household/members').then(r => r.json()),
    staleTime: 60_000,
  })

  const sessionQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => fetch('/api/user/profile').then(r => r.json()),
    staleTime: 60_000,
  })

  const members: Member[] = (membersQuery.data?.members ?? []).map((m: any) => ({
    id: m.userId,
    name: m.name,
    avatarColor: m.avatarColor,
  }))

  const currentUserId = sessionQuery.data?.id ?? ''

  return (
    <div style={{ maxWidth: 896, margin: '0 auto', padding: '0 16px 32px' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)' }}>Money</h1>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Expenses, bills, and goals</p>
          </div>
          <button
            onClick={() => setExpenseSheetOpen(true)}
            style={{
              width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: COLOR, color: '#fff', border: 'none',
              borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer',
            }}
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 16 }}>
          {TABS.map(t => (
            <TabPill key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>

        {/* Tab content */}
        {tab === 'dashboard' && (
          <DashboardTab
            currentUserId={currentUserId}
            members={members}
            isPremium={isPremium}
            onOpenExpense={() => setExpenseSheetOpen(true)}
            onOpenSettle={setSettleDebt}
          />
        )}
        {tab === 'expenses' && (
          <ExpensesTab
            currentUserId={currentUserId}
            members={members}
            isPremium={isPremium}
            onOpenExpense={() => setExpenseSheetOpen(true)}
            onOpenSettle={setSettleDebt}
          />
        )}
        {tab === 'bills' && <BillsTab isPremium={isPremium} isAdmin={isAdmin} currentUserId={currentUserId} onAddBill={() => setBillSheetOpen(true)} />}
        {tab === 'budget' && <BudgetTab isPremium={isPremium} isAdmin={isAdmin} onAddBudget={() => setBudgetSheetOpen(true)} onEditBudget={(b) => { setEditingBudget(b); setBudgetSheetOpen(true) }} />}
        {tab === 'goals' && (
          <GoalsTab
            isPremium={isPremium}
            isAdmin={isAdmin}
            onNewGoal={() => { setEditingGoal(null); setGoalSheetOpen(true) }}
            onEditGoal={(g) => { setEditingGoal(g); setGoalSheetOpen(true) }}
            onContribute={setContributeGoal}
          />
        )}
        {tab === 'insights' && <InsightsTab isPremium={isPremium} />}
      </motion.div>

      {/* Sheets — rendered outside motion.div so they aren't clipped */}
      <ExpenseSheet
        open={expenseSheetOpen}
        onClose={() => setExpenseSheetOpen(false)}
        members={members}
        currentUserId={currentUserId}
        isPremium={isPremium}
      />

      <SettleSheet
        open={!!settleDebt}
        onClose={() => setSettleDebt(null)}
        debt={settleDebt}
        currentUserId={currentUserId}
        members={members}
        payeeVenmoHandle={settleDebt?.toVenmoHandle}
        payeeCashappHandle={settleDebt?.toCashappHandle}
      />

      <GoalSheet
        open={goalSheetOpen}
        onClose={() => { setGoalSheetOpen(false); setEditingGoal(null) }}
        goal={editingGoal}
      />

      <ContributeSheet
        open={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        goal={contributeGoal}
      />

      <BillSheet
        open={billSheetOpen}
        onClose={() => setBillSheetOpen(false)}
      />

      <BudgetSheet
        open={budgetSheetOpen}
        onClose={() => { setBudgetSheetOpen(false); setEditingBudget(null) }}
        budget={editingBudget}
      />
    </div>
  )
}
