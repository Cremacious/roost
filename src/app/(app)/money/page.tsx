'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, Wallet, Receipt, BarChart3, Target, TrendingUp,
  CheckCircle, Clock, AlertCircle, ChevronRight, Edit2, Trash2, ChevronDown, ChevronUp,
  LayoutGrid, DollarSign, FileText, Camera, Users, Lock, X, Pause, Play, Download,
} from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { SlabCard } from '@/components/ui/SlabCard'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { ExpenseSheet } from '@/components/money/ExpenseSheet'
import { SettleSheet } from '@/components/money/SettleSheet'
import { SettlePickerSheet } from '@/components/money/SettlePickerSheet'
import { GoalSheet } from '@/components/money/GoalSheet'
import { ContributeSheet } from '@/components/money/ContributeSheet'
import { BillSheet, type EditableBill } from '@/components/money/BillSheet'
import { BudgetSheet, type EditableBudget } from '@/components/money/BudgetSheet'
import { ExportSheet } from '@/components/money/ExportSheet'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
import { usePlatformCapabilities } from '@/lib/hooks/usePlatformCapabilities'
import { useSession } from '@/lib/auth/client'
import PremiumGate from '@/components/shared/PremiumGate'

const CLAIM_BANNER_KEY = 'roost-pending-claim-banner-dismissed'

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
const SPEND_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#A855F7', '#F97316']

type Tab = 'dashboard' | 'expenses' | 'bills' | 'budget' | 'goals' | 'insights'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={14} /> },
  { id: 'expenses', label: 'Expenses', icon: <DollarSign size={14} /> },
  { id: 'bills', label: 'Bills', icon: <FileText size={14} /> },
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

function TabPill({ label, icon, active, onClick }: { id: Tab; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13,
        backgroundColor: active ? COLOR : 'var(--roost-surface)',
        color: active ? '#fff' : 'var(--roost-text-secondary)',
        border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
        borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
        cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
      }}
    >
      {icon}{label}
    </button>
  )
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DebtItem {
  from: string
  to: string
  amount: number
  splitIds: string[]
  iOwe?: boolean
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
  frequency: string
  categoryId?: string | null
  paused: boolean
  status: 'paid' | 'due_soon' | 'overdue' | 'upcoming'
}

interface RecentExpense {
  id: string
  title: string
  amount: string | number
  paidBy: string
  paidByName: string
  createdAt: string
  categoryId?: string | null
  notes?: string | null
}

interface CategoryBreakdown {
  categoryName?: string | null
  total: string | number
  percent?: number | null
}

interface MemberBreakdown {
  userId: string
  userName: string
  total: number
  percent?: number | null
}

interface BudgetRow {
  id: string
  categoryId: string | null
  categoryName?: string | null
  amount: string | number
  warningThreshold: number
  spent: number
  status: 'over' | 'warning' | 'ok' | string
}

interface ContributionMember {
  userId: string
  userName: string
  total: number
}

interface ContributionRow {
  id: string
  userName?: string | null
  note?: string | null
  amount: number
  createdAt: string
}

interface MoneyGoal {
  id: string
  name: string
  targetAmount: string | number
  savedAmount: number
  progressPercent: number
  targetDate?: string | null
  completedAt?: string | null
}

interface MembersApiMember {
  userId: string
  name: string
  avatarColor?: string
  role: string
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ currentUserId, members, isPremium, onOpenExpense, onOpenSettle, onTabChange, onOpenSettlePicker }: {
  currentUserId: string
  members: Member[]
  isPremium: boolean
  onOpenExpense: () => void
  onOpenSettle: (debt: DebtItem) => void
  onTabChange: (tab: Tab) => void
  onOpenSettlePicker: () => void
}) {
  const queryClient = useQueryClient()
  const { canPush } = usePlatformCapabilities()
  const [quickSettleDebt, setQuickSettleDebt] = useState<DebtItem | null>(null)
  const [quickSettling, setQuickSettling] = useState(false)
  const [insightsGateOpen, setInsightsGateOpen] = useState(false)

  async function handleQuickSettle() {
    if (!quickSettleDebt) return
    setQuickSettling(true)
    try {
      const res = await fetch('/api/expenses/settle-all/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditorId: quickSettleDebt.to, splitIds: quickSettleDebt.splitIds }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Claim sent', { description: `They will confirm when received.` })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['money-dashboard'] })
      setQuickSettleDebt(null)
    } catch {
      toast.error('Could not send claim', { description: 'Check your connection and try again.' })
    } finally {
      setQuickSettling(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['money-dashboard'],
    queryFn: () => fetch('/api/money/dashboard').then(r => r.json()),
    staleTime: 10_000,
  })

  const from30d = subDays(new Date(), 30).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['dashboard-spending', from30d],
    queryFn: () => fetch(`/api/money/insights?from=${from30d}&to=${to}`).then(r => r.json()),
    staleTime: 60_000,
    enabled: isPremium,
  })

  if (isLoading) return <LoadingRows />

  const { balances, bills, budgetSummary, activeGoal, recentExpenses, myDebts: myDebtsRaw = [] } = data ?? {}
  const { byCategory = [], spendingOverTime = [] } = insightsData ?? {}

  const netBalance = balances?.netBalance ?? 0
  const netPositive = netBalance >= 0

  const myDebts: DebtItem[] = myDebtsRaw

  return (
    <div>
      {/* ── Balance Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        borderRadius: 20,
        padding: '28px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Three-column desktop / stacked mobile */}
        <div className="relative z-10 flex flex-col gap-5 md:grid md:items-center md:gap-x-10" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          {/* Net balance */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Net balance</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: 'white', letterSpacing: -2, lineHeight: 1 }}>
              {netPositive ? '+' : ''}{netBalance < 0 ? '-' : ''}${Math.abs(netBalance).toFixed(2)}
            </div>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:gap-3">
            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>You&apos;re owed</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#BBF7D0' }}>${(balances?.totalOwed ?? 0).toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>You owe</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#FECACA' }}>${(balances?.totalOwe ?? 0).toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Spent this month</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>${(balances?.totalSpentThisMonth ?? 0).toFixed(2)}</div>
            </div>
            {isPremium && budgetSummary && (
              <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '14px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Budget remaining</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#BBF7D0' }}>${Math.max(0, (budgetSummary.totalCap ?? 0) - (budgetSummary.totalSpent ?? 0)).toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-row gap-2 md:flex-col md:gap-2">
            {myDebts.length > 0 && (
              <button
                onClick={() => onOpenSettlePicker()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <CheckCircle size={15} color="white" /> Settle up
              </button>
            )}
            <button
              onClick={() => isPremium ? onTabChange('insights') : setInsightsGateOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer', whiteSpace: 'nowrap',
                opacity: isPremium ? 1 : 0.65,
              }}
            >
              {isPremium ? <TrendingUp size={15} color="white" /> : <Lock size={15} color="white" />}
              View insights
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid gap-4 md:grid-cols-[1fr_360px] items-start">

        {/* ── Main column ── */}
        <div>
          {/* Spending this month */}
          <div style={{ background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${COLOR_DARK}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Spending this month</span>
              {isPremium && (
                <button onClick={() => onTabChange('insights')} style={{ fontSize: 12, fontWeight: 700, color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Details</button>
              )}
            </div>
            <div style={{ padding: '14px 18px 16px' }}>
              {!isPremium ? (
                <div>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--roost-text-primary)' }}>${(balances?.totalSpentThisMonth ?? 0).toFixed(2)}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Upgrade to see category breakdown and spending trends.</p>
                </div>
              ) : insightsLoading ? (
                <div style={{ height: 120, borderRadius: 10, backgroundColor: 'var(--roost-border)', opacity: 0.5, animation: 'pulse 2s infinite' }} />
              ) : byCategory.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {/* Donut ring */}
                    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                      <PieChart width={120} height={120}>
                        <Pie
                          data={byCategory.slice(0, 5)}
                          dataKey="total"
                          cx={60} cy={60}
                          outerRadius={54} innerRadius={34}
                          strokeWidth={0}
                        >
                          {byCategory.slice(0, 5).map((_: unknown, i: number) => (
                            <Cell key={i} fill={SPEND_COLORS[i % SPEND_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--roost-text-primary)', lineHeight: 1 }}>${(balances?.totalSpentThisMonth ?? 0).toFixed(0)}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--roost-text-muted)' }}>spent</div>
                      </div>
                    </div>
                    {/* Breakdown */}
                    <div style={{ flex: 1 }}>
                      {byCategory.slice(0, 5).map((cat: CategoryBreakdown, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 4 ? 9 : 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: SPEND_COLORS[i % SPEND_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-secondary)', flex: 1 }}>{cat.categoryName ?? 'Other'}</span>
                          <div style={{ width: 80, height: 6, backgroundColor: 'var(--roost-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${cat.percent ?? 0}%`, backgroundColor: SPEND_COLORS[i % SPEND_COLORS.length] }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--roost-text-secondary)', minWidth: 44, textAlign: 'right' }}>${parseFloat(String(cat.total ?? 0)).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Spending trend mini chart */}
                  {spendingOverTime.length > 1 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-secondary)' }}>Spending trend</span>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, backgroundColor: `${COLOR}20`, color: COLOR }}>30d</span>
                      </div>
                      <ResponsiveContainer width="100%" height={80}>
                        <AreaChart data={spendingOverTime} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="dbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLOR} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={COLOR} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <Area type="monotone" dataKey="total" stroke={COLOR} strokeWidth={2.5} fill="url(#dbAreaGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', padding: '12px 0' }}>No spending data for this period.</p>
              )}
            </div>
          </div>

          {/* Recent expenses */}
          <div style={{ background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${COLOR_DARK}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Recent expenses</span>
              <button onClick={() => onTabChange('expenses')} style={{ fontSize: 12, fontWeight: 700, color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>See all</button>
            </div>
            <div style={{ padding: '4px 18px 16px' }}>
              {recentExpenses?.length > 0 ? recentExpenses.map((e: RecentExpense, i: number) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < recentExpenses.length - 1 ? '1px solid var(--roost-border)' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${COLOR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Receipt size={16} color={COLOR} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Paid by {e.paidByName} · {format(new Date(e.createdAt), 'MMM d')}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--roost-text-primary)' }}>${parseFloat(String(e.amount)).toFixed(2)}</div>
                  </div>
                </div>
              )) : (
                <p style={{ margin: '16px 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center' }}>No expenses yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar column ── */}
        <div>
          {/* Who owes who */}
          <div style={{ background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid #B91C1C', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Who owes who</span>
              <button onClick={() => onTabChange('expenses')} style={{ fontSize: 12, fontWeight: 700, color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>See all</button>
            </div>
            <div style={{ padding: '14px 18px 16px' }}>
              {myDebts.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center', padding: '8px 0' }}>All settled up.</p>
              ) : myDebts.slice(0, 3).map((debt: DebtItem, i: number) => {
                const iOwe = debt.iOwe ?? debt.from === currentUserId
                const iClaimed = iOwe && !!debt.pendingClaim?.settledByPayer
                const other = members.find(m => m.id === (iOwe ? debt.to : debt.from))
                const otherName = other?.name ?? 'Unknown'
                const initial = otherName.charAt(0).toUpperCase()
                const avatarColors = ['#3B82F6', '#EC4899', '#F59E0B', '#A855F7', '#06B6D4']
                const avatarBg = avatarColors[i % avatarColors.length]
                // A claimed debt routes to the full settle sheet (waiting/cancel view), never
                // the quick "I paid" dialog, so the debtor cannot re-send the same claim.
                const handleOpen = () => iClaimed ? onOpenSettle(debt) : iOwe ? setQuickSettleDebt(debt) : onOpenSettle(debt)
                return (
                  <div
                    key={i}
                    onClick={handleOpen}
                    style={{
                      background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)',
                      borderBottom: `4px solid ${iClaimed ? '#F59E0B' : iOwe ? '#EF4444' : COLOR}`,
                      borderRadius: 14, padding: '14px 16px', cursor: 'pointer', marginBottom: i < Math.min(myDebts.length, 3) - 1 ? 10 : 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white', flexShrink: 0 }}>
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>{otherName}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: iClaimed ? '#D97706' : 'var(--roost-text-muted)' }}>{iClaimed ? 'Awaiting confirmation' : iOwe ? 'You owe' : 'Owes you'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: iOwe ? '#EF4444' : COLOR }}>
                        ${debt.amount.toFixed(2)}
                      </div>
                    </div>
                    {/* "Remind" (creditor view) is push-only and not delivered on web, so it
                        is hidden until the mobile app ships. "Settle up" stays for the debtor. */}
                    {(iOwe || canPush) && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpen() }}
                          style={{
                            padding: '5px 12px', borderRadius: 8, border: '1.5px solid var(--roost-border)',
                            borderBottom: '2px solid var(--roost-border-bottom)', background: 'var(--roost-surface)',
                            fontFamily: 'inherit', fontSize: 11, fontWeight: 800, color: iClaimed ? '#D97706' : 'var(--roost-text-secondary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          {iClaimed && <Clock size={12} />}
                          {iClaimed ? 'Awaiting confirmation' : iOwe ? 'Settle up' : 'Remind'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Active goal (premium) */}
          {isPremium && activeGoal ? (
            <div style={{ background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid #7C3AED', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Active goal</span>
                <button onClick={() => onTabChange('goals')} style={{ fontSize: 12, fontWeight: 700, color: '#A855F7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>All goals</button>
              </div>
              <div style={{ padding: '14px 18px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                  <PieChart width={60} height={60}>
                    <Pie data={[{ value: activeGoal.progressPercent }, { value: 100 - activeGoal.progressPercent }]} dataKey="value" cx={30} cy={30} outerRadius={28} innerRadius={20} strokeWidth={0} startAngle={90} endAngle={-270}>
                      <Cell fill="#A855F7" />
                      <Cell fill="var(--roost-border)" />
                    </Pie>
                  </PieChart>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 11, fontWeight: 900, color: 'var(--roost-text-primary)' }}>
                    {activeGoal.progressPercent}%
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 2 }}>{activeGoal.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                    <span style={{ color: COLOR, fontWeight: 900 }}>${activeGoal.savedAmount.toFixed(2)}</span> of ${parseFloat(activeGoal.targetAmount).toFixed(2)}
                  </div>
                  <div style={{ height: 6, backgroundColor: 'var(--roost-border)', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${activeGoal.progressPercent}%`, backgroundColor: '#A855F7' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : isPremium ? null : (
            <div style={{ background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid #7C3AED', borderRadius: 16, marginBottom: 16, padding: '16px 18px', opacity: 0.5 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 4 }}>Active goal</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Upgrade to track shared savings goals.</div>
            </div>
          )}

          {/* Bills this month (premium) */}
          {isPremium && bills?.length > 0 ? (
            <div style={{ background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid #D97706', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Bills this month</span>
                <button onClick={() => onTabChange('bills')} style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Manage</button>
              </div>
              <div style={{ padding: '4px 18px 16px' }}>
                {bills.slice(0, 4).map((bill: Bill, i: number) => {
                  const cfg = STATUS_CONFIG[bill.status]
                  return (
                    <div key={bill.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < Math.min(bills.length, 4) - 1 ? '1px solid var(--roost-border)' : 'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${cfg.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {cfg.icon ?? <Clock size={16} color={cfg.color} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.title}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{bill.dueDay ? `Due on the ${bill.dueDay}${ordinal(bill.dueDay)}` : 'No due date'}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--roost-text-primary)' }}>${parseFloat(String(bill.amount)).toFixed(2)}</div>
                        <div style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginTop: 2, backgroundColor: `${cfg.color}1A`, color: cfg.color }}>{cfg.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : !isPremium ? (
            <div style={{ background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid #D97706', borderRadius: 16, padding: '16px 18px', opacity: 0.5 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 4 }}>Bills this month</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Upgrade to track recurring bills.</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick settle dialog */}
      {(() => {
        const debt = quickSettleDebt
        if (!debt) return null
        const creditor = members.find(m => m.id === debt.to)
        const creditorName = creditor?.name ?? 'them'
        return (
          <AlertDialog open={!!quickSettleDebt} onOpenChange={open => { if (!open) setQuickSettleDebt(null) }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Settle up with {creditorName}</AlertDialogTitle>
                <AlertDialogDescription>
                  You owe <strong style={{ color: '#EF4444' }}>${debt.amount.toFixed(2)}</strong> to {creditorName}. Tap below to send a claim that you have paid. They will confirm when received.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <button
                  onClick={() => setQuickSettleDebt(null)}
                  style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', background: 'var(--roost-surface)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--roost-text-secondary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickSettle}
                  disabled={quickSettling}
                  style={{ padding: '9px 18px', borderRadius: 10, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: '#fff', cursor: quickSettling ? 'default' : 'pointer', opacity: quickSettling ? 0.7 : 1 }}
                >
                  {quickSettling ? 'Sending...' : `I paid ${creditorName}`}
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}

      {insightsGateOpen && (
        <PremiumGate feature="stats" trigger="sheet" onClose={() => setInsightsGateOpen(false)} />
      )}
    </div>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

interface ExpenseGroup {
  year: number
  month: number          // 0-indexed (JS Date)
  label: string          // e.g. "April 2026"
  expenses: RecentExpense[]
  total: number
}

function groupExpenses(expenseList: RecentExpense[]): { currentGroup: ExpenseGroup | null; olderGroups: ExpenseGroup[] } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const map = new Map<string, ExpenseGroup>()

  for (const e of expenseList) {
    const d = new Date(e.createdAt)
    const year = d.getFullYear()
    const month = d.getMonth()
    const key = `${year}-${month}`
    if (!map.has(key)) {
      map.set(key, {
        year,
        month,
        label: format(d, 'MMMM yyyy'),
        expenses: [],
        total: 0,
      })
    }
    const group = map.get(key)!
    group.expenses.push(e)
    group.total += parseFloat(String(e.amount)) || 0
  }

  // Sort groups: newest first
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  const currentGroup = sorted.find(g => g.year === currentYear && g.month === currentMonth) ?? null
  const olderGroups = sorted.filter(g => !(g.year === currentYear && g.month === currentMonth))

  return { currentGroup, olderGroups }
}

interface ExpenseManage {
  currentUserId: string
  isAdmin: boolean
  onEdit: (e: RecentExpense) => void
  onDelete: (e: RecentExpense) => void
  deletingId: string | null
}

function ExpenseRow({ e, index, canManage, onEdit, onDelete, deleting }: {
  e: RecentExpense
  index: number
  canManage?: boolean
  onEdit?: (e: RecentExpense) => void
  onDelete?: (e: RecentExpense) => void
  deleting?: boolean
}) {
  return (
    <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.15) }}>
      <SlabCard color="var(--roost-border-bottom)" pressable={!!(canManage && onEdit)} onClick={canManage && onEdit ? () => onEdit(e) : undefined}>
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
              Paid by {e.paidByName ?? 'Unknown'} &bull; {format(new Date(e.createdAt), 'MMM d')}
            </p>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)', flexShrink: 0 }}>${parseFloat(String(e.amount)).toFixed(2)}</span>
          {canManage && onDelete && (
            <button
              aria-label="Delete expense"
              onClick={(ev) => { ev.stopPropagation(); onDelete(e) }}
              disabled={deleting}
              style={{ padding: 6, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.4 : 0.6, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <Trash2 size={15} color="#EF4444" />
            </button>
          )}
        </div>
      </SlabCard>
    </motion.div>
  )
}

function MonthAccordion({ group, defaultOpen = false, manage }: { group: ExpenseGroup; defaultOpen?: boolean; manage?: ExpenseManage }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
          borderTop: '1px solid var(--roost-border)',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 800, fontSize: 13, color: 'var(--roost-text-primary)' }}>
          {group.label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)', marginRight: 6 }}>
          {group.expenses.length} {group.expenses.length === 1 ? 'expense' : 'expenses'} &bull; ${group.total.toFixed(2)}
        </span>
        {open ? <ChevronUp size={15} color="var(--roost-text-muted)" /> : <ChevronDown size={15} color="var(--roost-text-muted)" />}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
          {group.expenses.map((e, i) => (
            <ExpenseRow
              key={e.id} e={e} index={i}
              canManage={!!manage && (manage.isAdmin || e.paidBy === manage.currentUserId)}
              onEdit={manage?.onEdit}
              onDelete={manage?.onDelete}
              deleting={manage?.deletingId === e.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function YearAccordion({ year, groups, manage }: { year: number; groups: ExpenseGroup[]; manage?: ExpenseManage }) {
  const [open, setOpen] = useState(false)
  const totalExpenses = groups.reduce((sum, g) => sum + g.expenses.length, 0)
  const totalAmount = groups.reduce((sum, g) => sum + g.total, 0)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
          borderTop: '1px solid var(--roost-border)',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 800, fontSize: 13, color: 'var(--roost-text-primary)' }}>
          {year}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)', marginRight: 6 }}>
          {totalExpenses} {totalExpenses === 1 ? 'expense' : 'expenses'} &bull; ${totalAmount.toFixed(2)}
        </span>
        {open ? <ChevronUp size={15} color="var(--roost-text-muted)" /> : <ChevronDown size={15} color="var(--roost-text-muted)" />}
      </button>
      {open && (
        <div style={{ paddingLeft: 12 }}>
          {groups.map(g => <MonthAccordion key={`${g.year}-${g.month}`} group={g} manage={manage} />)}
        </div>
      )}
    </div>
  )
}

function ExpensesTab({ currentUserId, members, isAdmin, onOpenExpense, onOpenSettle, onEditExpense, onUpgradeRequired }: {
  currentUserId: string
  members: Member[]
  isAdmin: boolean
  onOpenExpense: () => void
  onOpenSettle: (debt: DebtItem) => void
  onEditExpense: (e: RecentExpense) => void
  onUpgradeRequired?: (code: string) => void
}) {
  const qc = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => fetch('/api/expenses').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() }),
    staleTime: 10_000,
  })

  function handleDelete(e: RecentExpense) {
    setPendingDelete({ id: e.id, title: e.title })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const { id, title } = pendingDelete
    setPendingDelete(null)
    setDeletingId(id)

    // Optimistic removal from the cached list; revert on failure.
    const prev = qc.getQueryData<{ expenses?: RecentExpense[] }>(['expenses'])
    qc.setQueryData<{ expenses?: RecentExpense[] }>(['expenses'], (old) =>
      old ? { ...old, expenses: (old.expenses ?? []).filter((x) => x.id !== id) } : old
    )

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        if (prev) qc.setQueryData(['expenses'], prev)
        const err = await res.json().catch(() => ({}))
        toast.error('Could not delete expense', { description: err.error ?? 'Something went wrong.' })
        return
      }
      toast.success(`"${title}" removed`)
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
    } catch {
      if (prev) qc.setQueryData(['expenses'], prev)
      toast.error('Could not delete expense', { description: 'Network error. Try again.' })
    } finally {
      setDeletingId(null)
      qc.invalidateQueries({ queryKey: ['expenses'] })
    }
  }

  const manage: ExpenseManage = { currentUserId, isAdmin, onEdit: onEditExpense, onDelete: handleDelete, deletingId }

  if (isLoading) return <LoadingRows />

  const { myDebts: myDebtsRaw = [], expenses: expenseList = [], myBalance } = data ?? {}

  const myDebts: DebtItem[] = myDebtsRaw

  const { currentGroup, olderGroups } = groupExpenses(expenseList)

  // Split older groups by year
  const currentYear = new Date().getFullYear()
  const sameYearOlder = olderGroups.filter(g => g.year === currentYear)
  const priorYearGroups = olderGroups.filter(g => g.year < currentYear)

  // Group prior year groups by year
  const byYear = new Map<number, ExpenseGroup[]>()
  for (const g of priorYearGroups) {
    if (!byYear.has(g.year)) byYear.set(g.year, [])
    byYear.get(g.year)!.push(g)
  }
  const priorYears = Array.from(byYear.entries()).sort((a, b) => b[0] - a[0])

  const hasAnyExpenses = expenseList.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {myDebts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)', marginBottom: 0 }}>Who owes who</p>
          {myDebts.map((debt: DebtItem, i: number) => {
            const iOwe = debt.iOwe ?? debt.from === currentUserId
            const otherName = members.find(m => m.id === (iOwe ? debt.to : debt.from))?.name ?? 'Unknown'
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

      {hasAnyExpenses ? (
        <div>
          {/* Current month — flat list */}
          {currentGroup && (
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)', marginBottom: 8 }}>
                {currentGroup.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentGroup.expenses.map((e, i) => (
                  <ExpenseRow
                    key={e.id} e={e} index={i}
                    canManage={isAdmin || e.paidBy === currentUserId}
                    onEdit={onEditExpense}
                    onDelete={handleDelete}
                    deleting={deletingId === e.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Older months this year — month accordions */}
          {sameYearOlder.length > 0 && (
            <div style={{ marginTop: currentGroup ? 12 : 0 }}>
              {sameYearOlder.map(g => (
                <MonthAccordion key={`${g.year}-${g.month}`} group={g} manage={manage} />
              ))}
            </div>
          )}

          {/* Previous years — year accordions with month sub-accordions */}
          {priorYears.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {priorYears.map(([year, groups]) => (
                <YearAccordion key={year} year={year} groups={groups} manage={manage} />
              ))}
            </div>
          )}
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

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => { if (!v) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title} will be removed along with its splits. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button onClick={() => setPendingDelete(null)} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={confirmDelete} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderBottom: '3px solid #C93B3B', cursor: 'pointer' }}>Delete</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Bills Tab ────────────────────────────────────────────────────────────────

function BillRow({ bill, isAdmin = false, onMarkPaid, marking = false, onEdit, onDelete, deleting = false, onTogglePause, pausing = false }: {
  bill: Bill
  isAdmin?: boolean
  onMarkPaid?: (id: string) => void
  marking?: boolean
  onEdit?: (bill: Bill) => void
  onDelete?: (id: string, title: string) => void
  deleting?: boolean
  onTogglePause?: (bill: Bill) => void
  pausing?: boolean
}) {
  const paused = bill.paused
  const cfg = STATUS_CONFIG[bill.status]
  const isPaid = bill.status === 'paid'
  const rowColor = paused ? 'var(--roost-text-muted)' : cfg.color

  return (
    <SlabCard color={rowColor}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, opacity: paused ? 0.6 : 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>{bill.title}</p>
            {paused && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, backgroundColor: 'var(--roost-bg)', color: 'var(--roost-text-muted)', border: '1px solid var(--roost-border)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Paused
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
            {bill.dueDay ? `Due on the ${bill.dueDay}${ordinal(bill.dueDay)}` : 'No due date set'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)', marginRight: 4 }}>${parseFloat(String(bill.amount)).toFixed(2)}</span>
            {isAdmin && onTogglePause && (
              <button
                onClick={() => onTogglePause(bill)}
                disabled={pausing}
                aria-label={paused ? 'Resume bill' : 'Pause bill'}
                title={paused ? 'Resume' : 'Pause'}
                style={{ padding: 6, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: pausing ? 'not-allowed' : 'pointer', opacity: pausing ? 0.4 : 0.6, display: 'flex', alignItems: 'center' }}
              >
                {paused ? <Play size={15} color={COLOR} /> : <Pause size={15} color="var(--roost-text-secondary)" />}
              </button>
            )}
            {isAdmin && onEdit && (
              <button
                onClick={() => onEdit(bill)}
                aria-label="Edit bill"
                title="Edit"
                style={{ padding: 6, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', opacity: 0.6, display: 'flex', alignItems: 'center' }}
              >
                <Edit2 size={15} color="var(--roost-text-secondary)" />
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={() => onDelete(bill.id, bill.title)}
                disabled={deleting}
                aria-label="Delete bill"
                title="Delete"
                style={{ padding: 6, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.4 : 0.6, display: 'flex', alignItems: 'center' }}
              >
                <Trash2 size={15} color="#EF4444" />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {!paused && cfg.icon}
            <span style={{ fontSize: 12, fontWeight: 700, color: rowColor }}>{paused ? 'Paused' : cfg.label}</span>
          </div>
          {isAdmin && !isPaid && !paused && onMarkPaid && (
            <button
              onClick={() => onMarkPaid(bill.id)}
              disabled={marking}
              style={{ padding: '5px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `2px solid ${COLOR_DARK}`, cursor: marking ? 'not-allowed' : 'pointer', opacity: marking ? 0.6 : 1 }}
            >
              {marking ? 'Saving...' : 'Mark paid'}
            </button>
          )}
        </div>
      </div>
    </SlabCard>
  )
}

function BillsTab({ isPremium, isAdmin, currentUserId, onAddBill, onEditBill }: {
  isPremium: boolean
  isAdmin: boolean
  currentUserId: string
  onAddBill: () => void
  onEditBill: (bill: EditableBill) => void
}) {
  const qc = useQueryClient()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pausingId, setPausingId] = useState<string | null>(null)
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

  async function handleTogglePause(bill: Bill) {
    const next = !bill.paused
    setPausingId(bill.id)

    // Optimistic update on the bills cache
    const prev = qc.getQueryData(['bills'])
    qc.setQueryData(['bills'], (old: { bills?: Bill[] } | undefined) => {
      if (!old?.bills) return old
      return { ...old, bills: old.bills.map(b => b.id === bill.id ? { ...b, paused: next } : b) }
    })

    try {
      const res = await fetch(`/api/expenses/recurring/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (prev) qc.setQueryData(['bills'], prev)
        toast.error(next ? 'Could not pause bill' : 'Could not resume bill', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success(next ? `"${bill.title}" paused` : `"${bill.title}" resumed`)
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
    } catch {
      if (prev) qc.setQueryData(['bills'], prev)
      toast.error(next ? 'Could not pause bill' : 'Could not resume bill', { description: 'Network error. Try again.' })
    } finally {
      setPausingId(null)
      qc.invalidateQueries({ queryKey: ['bills'] })
    }
  }

  if (!isPremium) {
    return (
      <EmptyState color={COLOR} icon={<FileText size={28} />} title="Premium feature"
        body="Track your recurring bills and see which ones are paid, due soon, or overdue. Upgrade to unlock." />
    )
  }

  if (isLoading) return <LoadingRows />

  const { bills = [], summary } = data ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>
            {bills.length} bill{bills.length !== 1 ? 's' : ''} tracked
          </p>
          <button
            onClick={onAddBill}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}
          >
            <Plus size={14} /> Add bill
          </button>
        </div>
      )}

      {!bills.length ? (
        <EmptyState color={COLOR} icon={<FileText size={28} />} title="No bills tracked."
          body="Add a recurring bill to track what is due each month."
          buttonLabel={isAdmin ? 'Add bill' : undefined}
          onButtonClick={isAdmin ? onAddBill : undefined}
        />
      ) : (
        <>
          <SlabCard color={COLOR}>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <StatBox label="Total" value={`$${(summary?.total ?? 0).toFixed(2)}`} color="var(--roost-text-primary)" />
              <StatBox label="Paid" value={`$${(summary?.paid ?? 0).toFixed(2)}`} color={COLOR} />
              <StatBox label="Remaining" value={`$${(summary?.remaining ?? 0).toFixed(2)}`} color="#EF4444" />
            </div>
          </SlabCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bills.map((bill: Bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                isAdmin={isAdmin}
                onMarkPaid={handleMarkPaid}
                marking={markingId === bill.id}
                onEdit={(b) => onEditBill({ id: b.id, title: b.title, amount: b.amount, frequency: b.frequency, dueDay: b.dueDay, categoryId: b.categoryId })}
                onDelete={handleDelete}
                deleting={deletingId === bill.id}
                onTogglePause={handleTogglePause}
                pausing={pausingId === bill.id}
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
            <button onClick={() => setPendingDelete(null)} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={confirmDelete} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderBottom: '3px solid #C93B3B', cursor: 'pointer' }}>Remove</button>
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
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} set
          </p>
          <button onClick={onAddBudget} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}>
            <Plus size={14} /> Add budget
          </button>
        </div>
      )}

      {!budgets.length ? (
        <EmptyState color={COLOR} icon={<BarChart3 size={28} />} title="No budgets set."
          body="Set a monthly spending limit per category to track where your money goes."
          buttonLabel={isAdmin ? 'Add budget' : undefined}
          onButtonClick={isAdmin ? onAddBudget : undefined}
        />
      ) : (
        <>
          <SlabCard color={COLOR}>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>Monthly total</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontWeight: 900, fontSize: 24, color: 'var(--roost-text-primary)' }}>${(totalSpent ?? 0).toFixed(2)}</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--roost-text-muted)' }}>of ${(totalCap ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </SlabCard>

          {budgets.map((b: BudgetRow) => {
            const pct = Math.min(100, (b.spent / parseFloat(String(b.amount))) * 100)
            const isOver = b.status === 'over'
            const isWarn = b.status === 'warning'
            const barColor = isOver ? '#EF4444' : isWarn ? '#F59E0B' : COLOR

            return (
              <SlabCard key={b.id} color={barColor}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>{b.categoryName ?? 'Uncategorized'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--roost-text-muted)' }}>${b.spent.toFixed(2)} / ${parseFloat(String(b.amount)).toFixed(2)}</span>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={() => onEditBudget({ id: b.id, categoryId: b.categoryId ?? '', categoryName: b.categoryName ?? 'Budget', amount: String(b.amount), warningThreshold: b.warningThreshold })} style={{ padding: 5, borderRadius: 7, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', opacity: 0.6, display: 'flex', alignItems: 'center' }}>
                            <Edit2 size={14} color="var(--roost-text-primary)" />
                          </button>
                          <button onClick={() => setPendingDelete({ id: b.id, name: b.categoryName ?? 'Budget' })} disabled={deletingId === b.id} style={{ padding: 5, borderRadius: 7, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', opacity: deletingId === b.id ? 0.3 : 0.6, display: 'flex', alignItems: 'center' }}>
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
            <AlertDialogDescription>The {pendingDelete?.name} budget will be removed. Past expenses are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button onClick={() => setPendingDelete(null)} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={confirmDelete} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderBottom: '3px solid #C93B3B', cursor: 'pointer' }}>Remove</button>
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
    return <p style={{ margin: '12px 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center' }}>No contributions yet.</p>
  }

  return (
    <div style={{ marginTop: 12 }}>
      {perMember.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {perMember.map((m: ContributionMember) => (
            <div key={m.userId} style={{ padding: '4px 10px', borderRadius: 8, backgroundColor: COLOR + '18', border: `1px solid ${COLOR}40`, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-primary)' }}>{m.userName}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: COLOR }}>${m.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {contributions.map((c: ContributionRow) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--roost-bg)', border: '1.5px solid var(--roost-border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--roost-text-primary)' }}>{c.userName ?? 'Unknown'}</p>
              {c.note && <p style={{ margin: '1px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.note}</p>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: COLOR }}>${c.amount.toFixed(2)}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{format(new Date(c.createdAt), 'MMM d')}</p>
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
  onEditGoal: (goal: MoneyGoal) => void
  onContribute: (goal: MoneyGoal) => void
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
  const active = (goals as MoneyGoal[]).filter((g: MoneyGoal) => !g.completedAt)
  const completed = (goals as MoneyGoal[]).filter((g: MoneyGoal) => g.completedAt)

  async function markComplete(id: string) {
    const res = await fetch(`/api/money/goals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: true }) })
    if (res.ok) {
      toast.success('Goal marked complete!')
      qc.invalidateQueries({ queryKey: ['goals'] })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isAdmin && (
        <button onClick={onNewGoal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 14, fontWeight: 800, fontSize: 14, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}>
          <Plus size={16} /> New goal
        </button>
      )}

      {active.length === 0 && completed.length === 0 && (
        <EmptyState color={COLOR} icon={<Target size={28} />} title="No goals yet." body="Create a savings goal to track the household's progress together." />
      )}

      {active.map((goal: MoneyGoal) => {
        const isExpanded = expandedGoalId === goal.id
        return (
          <SlabCard key={goal.id} color={COLOR}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)' }}>{goal.name}</p>
                  {goal.targetDate && <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Target: {format(parseISO(goal.targetDate), 'MMM d, yyyy')}</p>}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => onEditGoal(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Edit2 size={15} color="var(--roost-text-muted)" /></button>
                    <button onClick={() => setPendingDelete({ id: goal.id, name: goal.name })} disabled={deletingId === goal.id} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: deletingId === goal.id ? 0.3 : 0.6 }}><Trash2 size={15} color="#EF4444" /></button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)' }}>${goal.savedAmount.toFixed(2)}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--roost-text-muted)' }}>of ${parseFloat(String(goal.targetAmount)).toFixed(2)}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: COLOR }}>{goal.progressPercent}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, backgroundColor: 'var(--roost-border)', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${goal.progressPercent}%`, backgroundColor: COLOR, transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onContribute(goal)} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}>Log contribution</button>
                <button onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} History
                </button>
                {isAdmin && goal.progressPercent >= 100 && (
                  <button onClick={() => markComplete(goal.id)} style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: 'var(--roost-surface)', color: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}>Mark done</button>
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
          {completed.map((goal: MoneyGoal) => {
            const isExpanded = expandedGoalId === goal.id
            return (
              <SlabCard key={goal.id} color="var(--roost-border-bottom)">
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={18} color={COLOR} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>{goal.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--roost-text-muted)' }}>${parseFloat(String(goal.targetAmount)).toFixed(2)} saved</p>
                    </div>
                    <button onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-muted)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} History
                    </button>
                    {isAdmin && (
                      <button onClick={() => setPendingDelete({ id: goal.id, name: goal.name })} disabled={deletingId === goal.id} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: deletingId === goal.id ? 0.3 : 0.6 }}>
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
            <AlertDialogDescription>&ldquo;{pendingDelete?.name}&rdquo; and all its contribution history will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button onClick={() => setPendingDelete(null)} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={confirmDeleteGoal} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderBottom: '3px solid #C93B3B', cursor: 'pointer' }}>Delete</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

const CHART_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#A855F7', '#F97316', '#06B6D4', '#EC4899']

function InsightsTab({ isPremium, onExport }: { isPremium: boolean; onExport: () => void }) {
  const [range, setRange] = useState<'7' | '30' | '90'>('30')

  const { data, isLoading } = useQuery({
    queryKey: ['insights', range],
    queryFn: () => {
      const to = new Date().toISOString().split('T')[0]
      const from = new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      return fetch(`/api/money/insights?from=${from}&to=${to}`).then(r => r.json())
    },
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {rangePills.map(p => (
          <button key={p.value} onClick={() => setRange(p.value)} style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, backgroundColor: range === p.value ? COLOR : 'var(--roost-surface)', color: range === p.value ? '#fff' : 'var(--roost-text-secondary)', border: `1.5px solid ${range === p.value ? COLOR : 'var(--roost-border)'}`, borderBottom: `3px solid ${range === p.value ? COLOR_DARK : 'var(--roost-border-bottom)'}`, cursor: 'pointer' }}>
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onExport}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)',
            border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Download size={14} color={COLOR} /> Export
        </button>
      </div>

      <SlabCard color={COLOR}>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--roost-text-secondary)' }}>Total spent</p>
          <p style={{ margin: '4px 0 0', fontWeight: 900, fontSize: 28, color: 'var(--roost-text-primary)' }}>${grandTotal.toFixed(2)}</p>
        </div>
      </SlabCard>

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
                <Tooltip contentStyle={{ backgroundColor: 'var(--roost-surface)', border: '1px solid var(--roost-border)', borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => [typeof v === 'number' ? `$${v.toFixed(2)}` : '$0.00', 'Spent']} />
                <Area type="monotone" dataKey="total" stroke={COLOR} strokeWidth={2} fill="url(#greenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SlabCard>
      )}

      {byCategory.length > 0 && (
        <SlabCard color="var(--roost-border-bottom)">
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>By category</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={byCategory} dataKey="total" cx="50%" cy="50%" outerRadius={45} innerRadius={28} strokeWidth={0}>
                    {byCategory.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {byCategory.slice(0, 5).map((c: CategoryBreakdown, i: number) => (
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

      {byMember.length > 0 && (
        <SlabCard color="var(--roost-border-bottom)">
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 13, color: 'var(--roost-text-secondary)' }}>By member</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byMember.map((m: MemberBreakdown) => (
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
        <EmptyState color={COLOR} icon={<TrendingUp size={28} />} title="No data yet." body="Add some expenses to see spending insights here." />
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MoneyPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecentExpense | null>(null)
  const [settleDebt, setSettleDebt] = useState<DebtItem | null>(null)
  const [settlePickerOpen, setSettlePickerOpen] = useState(false)
  const [settlePickerDebts, setSettlePickerDebts] = useState<DebtItem[]>([])
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<MoneyGoal | null>(null)
  const [contributeGoal, setContributeGoal] = useState<MoneyGoal | null>(null)
  const [billSheetOpen, setBillSheetOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<EditableBill | null>(null)
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<EditableBudget | null>(null)
  const [exportSheetOpen, setExportSheetOpen] = useState(false)
  const [claimBannerDismissed, setClaimBannerDismissed] = useState(false)

  const { isPremium, role } = useHousehold()
  const isAdmin = role === 'admin'
  const { allowed: canViewExpenses } = usePermissionGate('expenses.view')
  const { allowed: canAddExpense, onBlocked: onBlockedAddExpense } = usePermissionGate('expenses.add')

  // All hooks must run before any conditional early returns (Rules of Hooks).
  const membersQuery = useQuery({
    queryKey: ['household-members'],
    queryFn: () => fetch('/api/household/members').then(r => r.json()),
    staleTime: 60_000,
  })

  const { data: sessionData } = useSession()

  const { data: dashboardData } = useQuery({
    queryKey: ['money-dashboard'],
    queryFn: () => fetch('/api/money/dashboard').then(r => r.json()),
    staleTime: 10_000,
  })

  if (role === 'child') {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1.5px solid #BBF7D0', borderBottom: '4px solid #15803D' }}>
          <Wallet size={28} color="#15803D" strokeWidth={2} />
        </div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>Money stuff is for grown-ups</p>
        <p style={{ margin: '10px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--roost-text-secondary)', lineHeight: 1.5, maxWidth: 300 }}>
          Expenses and bill splitting are managed by the adults in your household.
        </p>
      </div>
    )
  }

  if (!canViewExpenses) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1.5px solid var(--roost-border)', borderBottom: '4px solid var(--roost-border-bottom)' }}>
          <Lock size={28} color="var(--roost-text-muted)" strokeWidth={2} />
        </div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>You do not have permission to view expenses.</p>
        <p style={{ margin: '10px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--roost-text-secondary)', lineHeight: 1.5, maxWidth: 320 }}>
          Ask an admin to enable it in member settings.
        </p>
      </div>
    )
  }

  // Children are blocked from every finance endpoint by design, so they should
  // never appear in expense pickers, split selectors, or "Who owes who" cards.
  // Filtering them out at the source keeps the expense flow's defaults sensible
  // (no preselected children) and removes the "ghost" rows from every consumer.
  const members: Member[] = ((membersQuery.data?.members ?? []) as MembersApiMember[])
    .filter((m) => m.role !== 'child')
    .map((m) => ({
      id: m.userId,
      name: m.name,
      avatarColor: m.avatarColor,
    }))

  const currentUserId = sessionData?.user?.id ?? ''

  // Always clear any in-progress edit before opening the sheet to add a new expense.
  const openCreateExpense = () => { setEditingExpense(null); setExpenseSheetOpen(true) }

  const myDebtsRaw: DebtItem[] = dashboardData?.myDebts ?? []

  const pendingInboundClaims = myDebtsRaw.filter(
    (d: DebtItem) => !d.iOwe && d.pendingClaim?.settledByPayer === true
  )

  const showClaimBanner =
    pendingInboundClaims.length > 0 &&
    !claimBannerDismissed &&
    (typeof window === 'undefined' ||
      sessionStorage.getItem(CLAIM_BANNER_KEY) !== String(pendingInboundClaims.length))

  function dismissClaimBanner() {
    setClaimBannerDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CLAIM_BANNER_KEY, String(pendingInboundClaims.length))
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* ── Page title (non-sticky, flows naturally below TopBar) ── */}
      <div
        className="px-6 md:px-7"
        style={{ backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 10px' }}
      >
        <div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>Money</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>Expenses, bills and goals</p>
        </div>
        <button
          onClick={canAddExpense ? openCreateExpense : onBlockedAddExpense}
          aria-disabled={!canAddExpense}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 10,
            backgroundColor: COLOR, color: '#fff',
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: canAddExpense ? 'pointer' : 'not-allowed',
            opacity: canAddExpense ? 1 : 0.55,
          }}
        >
          {canAddExpense ? <Plus size={15} /> : <Lock size={15} />} Add expense
        </button>
      </div>

      {/* ── Tab strip (sticky — sticks below TopBar when title scrolls away) ── */}
      <div
        className="sticky top-14 z-10 px-6 md:px-7"
        style={{ backgroundColor: '#F9FAFB', borderBottom: '1.5px solid var(--roost-border)' }}
      >
        <div style={{ display: 'flex', gap: 6, padding: '8px 0 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <TabPill key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="px-6 md:px-7" style={{ paddingTop: 24, paddingBottom: 40 }}>
          {showClaimBanner && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              margin: '0 0 12px 0', padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #FDE68A',
              borderBottom: '3px solid #F59E0B',
            }}>
              <Clock size={16} color="#D97706" style={{ flexShrink: 0 }} />
              <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                {pendingInboundClaims.length === 1
                  ? (() => {
                      const debt = pendingInboundClaims[0]
                      const name = members.find((m: { id: string }) => m.id === debt.from)?.name ?? 'Someone'
                      return `${name} says they paid you $${debt.amount.toFixed(2)}.`
                    })()
                  : `${pendingInboundClaims.length} people say they paid you.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (pendingInboundClaims.length === 1) {
                    setSettleDebt(pendingInboundClaims[0])
                  } else {
                    setSettlePickerDebts(pendingInboundClaims)
                    setSettlePickerOpen(true)
                  }
                }}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                  backgroundColor: '#F59E0B', color: '#fff',
                  border: 'none', borderBottom: '2px solid #D97706',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                Review
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismissClaimBanner}
                style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  backgroundColor: 'transparent', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#92400E',
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {tab === 'dashboard' && (
            <DashboardTab
              currentUserId={currentUserId}
              members={members}
              isPremium={isPremium}
              onOpenExpense={openCreateExpense}
              onOpenSettle={setSettleDebt}
              onTabChange={setTab}
              onOpenSettlePicker={() => {
                setSettlePickerDebts(myDebtsRaw)
                setSettlePickerOpen(true)
              }}
            />
          )}
          {tab === 'expenses' && (
            <ExpensesTab
              currentUserId={currentUserId}
              members={members}
              isAdmin={isAdmin}
              onOpenExpense={openCreateExpense}
              onOpenSettle={setSettleDebt}
              onEditExpense={(e) => { setEditingExpense(e); setExpenseSheetOpen(true) }}
            />
          )}
          {tab === 'bills' && <BillsTab isPremium={isPremium} isAdmin={isAdmin} currentUserId={currentUserId} onAddBill={() => { setEditingBill(null); setBillSheetOpen(true) }} onEditBill={(b) => { setEditingBill(b); setBillSheetOpen(true) }} />}
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
          {tab === 'insights' && <InsightsTab isPremium={isPremium} onExport={() => setExportSheetOpen(true)} />}
        </div>
      </motion.div>

      {/* ── Sheets ── */}
      <ExpenseSheet
        open={expenseSheetOpen}
        onClose={() => { setExpenseSheetOpen(false); setEditingExpense(null) }}
        members={members}
        currentUserId={currentUserId}
        isPremium={isPremium}
        expense={editingExpense}
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

      <SettlePickerSheet
        open={settlePickerOpen}
        onClose={() => setSettlePickerOpen(false)}
        debts={settlePickerDebts}
        members={members}
        onSelect={(debt) => {
          setSettlePickerOpen(false)
          setSettleDebt(debt)
        }}
      />

      <GoalSheet
        open={goalSheetOpen}
        onClose={() => { setGoalSheetOpen(false); setEditingGoal(null) }}
        goal={editingGoal}
      />

      <ContributeSheet
        open={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        goal={contributeGoal ? {
          id: contributeGoal.id,
          name: contributeGoal.name,
          targetAmount: typeof contributeGoal.targetAmount === 'string' ? parseFloat(contributeGoal.targetAmount) : contributeGoal.targetAmount,
          savedAmount: contributeGoal.savedAmount,
        } : null}
      />

      <BillSheet
        open={billSheetOpen}
        onClose={() => { setBillSheetOpen(false); setEditingBill(null) }}
        bill={editingBill}
      />

      <BudgetSheet
        open={budgetSheetOpen}
        onClose={() => { setBudgetSheetOpen(false); setEditingBudget(null) }}
        budget={editingBudget}
      />

      <ExportSheet
        open={exportSheetOpen}
        onClose={() => setExportSheetOpen(false)}
      />
    </div>
  )
}
