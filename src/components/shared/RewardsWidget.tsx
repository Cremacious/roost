'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Gift, Trophy, Check, X } from 'lucide-react'
import { toast } from 'sonner'

const COLOR = '#A855F7'
const COLOR_DARK = '#7C28C8'
const EARNED = '#22C55E'
const EARNED_DARK = '#15803D'
const MISSED = '#EF4444'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChildRule {
  id: string
  title: string
  periodType: 'week' | 'month' | 'year' | 'custom'
  periodDays: number | null
  thresholdPercent: number
  rewardType: 'money' | 'gift' | 'activity' | 'other'
  rewardDetail: string
  startsAt: string
  periodStart: string
  periodEnd: string
  completionRate: number
  completed: number
  total: number
}

interface ChildPayout {
  id: string
  ruleId: string
  periodStart: string
  periodEnd: string
  earned: boolean
  completionRate: number
  rewardDetail: string
  expenseId: string | null
  acknowledged: boolean
  createdAt: string
}

interface ChildRewardsData {
  rules: ChildRule[]
  payouts: ChildPayout[]
  isPremium: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function periodLabel(rule: ChildRule): string {
  if (rule.periodType === 'week') return 'this week'
  if (rule.periodType === 'month') return 'this month'
  if (rule.periodType === 'year') return 'this year'
  return `this period`
}

function payoutDateLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function rewardTypeLabel(type: ChildRule['rewardType']): string {
  const map: Record<string, string> = { money: 'Money', gift: 'Gift', activity: 'Activity', other: 'Reward' }
  return map[type] ?? 'Reward'
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div style={{ height: 8, borderRadius: 4, backgroundColor: color + '20', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 4, backgroundColor: color }}
      />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 800, color: COLOR, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
      {children}
    </p>
  )
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function ClaimCard({ payout, onClaim, claiming }: { payout: ChildPayout; onClaim: () => void; claiming: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        backgroundColor: EARNED + '0D',
        border: `1.5px solid ${EARNED}40`,
        borderBottom: `4px solid ${EARNED_DARK}`,
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        backgroundColor: EARNED + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Trophy size={20} color={EARNED_DARK} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)', lineHeight: 1.2 }}>
          You earned a reward!
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-secondary)', marginTop: 2 }}>
          {payout.rewardDetail}
          {payout.expenseId ? ' · added to settle up' : ''}
        </p>
      </div>
      <motion.button
        type="button"
        whileTap={{ y: 2 }}
        onClick={onClaim}
        disabled={claiming}
        style={{
          height: 40, paddingInline: 16, borderRadius: 12, flexShrink: 0,
          border: `1.5px solid ${EARNED}`,
          borderBottom: `3px solid ${EARNED_DARK}`,
          backgroundColor: EARNED,
          color: '#fff',
          fontWeight: 800, fontSize: 13,
          cursor: claiming ? 'default' : 'pointer',
          opacity: claiming ? 0.6 : 1,
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <Check size={15} strokeWidth={3} />
        Claim
      </motion.button>
    </motion.div>
  )
}

function RuleCard({ rule }: { rule: ChildRule }) {
  const met = rule.completionRate >= rule.thresholdPercent
  const progressColor = met ? EARNED : COLOR
  const toGo = Math.max(0, rule.thresholdPercent - rule.completionRate)

  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `3px solid ${COLOR_DARK}`,
        borderRadius: 16,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--roost-text-primary)', lineHeight: 1.2 }}>
            {rule.title}
          </p>
          <p style={{ fontSize: 12, fontWeight: 700, color: COLOR, marginTop: 3 }}>
            {rewardTypeLabel(rule.rewardType)}: {rule.rewardDetail}
          </p>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 800, flexShrink: 0,
          color: met ? EARNED_DARK : 'var(--roost-text-muted)',
        }}>
          {rule.completionRate}%
        </span>
      </div>

      <ProgressBar value={rule.completionRate} color={progressColor} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
          {rule.completed} / {rule.total} chores {periodLabel(rule)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: met ? EARNED_DARK : 'var(--roost-text-muted)' }}>
          {met ? 'On track!' : `${toGo}% to go`}
        </span>
      </div>
    </div>
  )
}

function HistoryRow({ payout, isLast }: { payout: ChildPayout; isLast: boolean }) {
  const color = payout.earned ? EARNED_DARK : MISSED
  const Icon = payout.earned ? Check : X
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          backgroundColor: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={color} strokeWidth={3} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: 'var(--roost-text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {payout.rewardDetail}
          </p>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)', marginTop: 1 }}>
            {payoutDateLabel(payout.createdAt)} · {payout.completionRate}% done
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color, flexShrink: 0 }}>
          {payout.earned ? 'Earned' : 'Missed'}
        </span>
      </div>
      {!isLast && <div style={{ height: 1, backgroundColor: 'var(--roost-border)' }} />}
    </div>
  )
}

// ─── Widget ────────────────────────────────────────────────────────────────────

/**
 * Child-facing rewards surface. Fetches GET /api/rewards/child under the
 * ['rewards-child'] query key so the existing invalidations in the chores
 * page (on complete/uncheck) refresh live progress.
 *
 * Renders nothing for free households or when the user has no reward rules or
 * payout history — unless `showWhenEmpty` is set (the dedicated /chores/rewards
 * non-admin view), which shows an empty state instead.
 */
export default function RewardsWidget({ showWhenEmpty = false }: { showWhenEmpty?: boolean }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<ChildRewardsData>({
    queryKey: ['rewards-child'],
    queryFn: async () => {
      const r = await fetch('/api/rewards/child')
      if (!r.ok) throw new Error('Failed to load rewards')
      return r.json()
    },
    staleTime: 10_000,
  })

  const claimMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const r = await fetch(`/api/rewards/payouts/${payoutId}`, { method: 'PATCH' })
      if (!r.ok) throw new Error('Failed to claim reward')
    },
    onMutate: async (payoutId) => {
      await queryClient.cancelQueries({ queryKey: ['rewards-child'] })
      const prev = queryClient.getQueryData<ChildRewardsData>(['rewards-child'])
      queryClient.setQueryData<ChildRewardsData>(['rewards-child'], (old) => {
        if (!old) return old
        return {
          ...old,
          payouts: old.payouts.map(p => p.id === payoutId ? { ...p, acknowledged: true } : p),
        }
      })
      return { prev }
    },
    onError: (_err, _payoutId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['rewards-child'], ctx.prev)
      toast.error('Could not claim reward', { description: 'Something went wrong. Try again.' })
    },
    onSuccess: () => {
      toast.success('Reward claimed!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards-child'] })
    },
  })

  // Loading: only render a placeholder when this is the dedicated page.
  if (isLoading) {
    if (!showWhenEmpty) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ height: 96, borderRadius: 16, backgroundColor: 'var(--roost-border)', opacity: 0.4 }} />
        ))}
      </div>
    )
  }

  // Free household (endpoint returns isPremium:false + empty) → nothing to show.
  if (!data || !data.isPremium) {
    if (!showWhenEmpty) return null
    return <EmptyRewards />
  }

  const rules = data.rules ?? []
  const payouts = data.payouts ?? []
  const claimable = payouts.filter(p => p.earned && !p.acknowledged)
  const history = payouts.filter(p => !(p.earned && !p.acknowledged))

  const hasAnything = rules.length > 0 || payouts.length > 0
  if (!hasAnything) {
    if (!showWhenEmpty) return null
    return <EmptyRewards />
  }

  const historyLimit = showWhenEmpty ? history.length : 4
  const visibleHistory = history.slice(0, historyLimit)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${COLOR_DARK}`,
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          backgroundColor: COLOR + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Gift size={15} color={COLOR} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--roost-text-primary)' }}>
          Rewards
        </span>
      </div>

      {/* Claimable */}
      {claimable.length > 0 && (
        <div>
          <SectionLabel>Ready to claim</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {claimable.map(p => (
              <ClaimCard
                key={p.id}
                payout={p}
                claiming={claimMutation.isPending && claimMutation.variables === p.id}
                onClaim={() => claimMutation.mutate(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active rules */}
      {rules.length > 0 && (
        <div>
          <SectionLabel>Your goals</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rules.map(rule => <RuleCard key={rule.id} rule={rule} />)}
          </div>
        </div>
      )}

      {/* History */}
      {visibleHistory.length > 0 && (
        <div>
          <SectionLabel>Recent</SectionLabel>
          <div>
            {visibleHistory.map((p, i) => (
              <HistoryRow key={p.id} payout={p} isLast={i === visibleHistory.length - 1} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function EmptyRewards() {
  return (
    <div style={{
      backgroundColor: 'var(--roost-surface)',
      border: '2px dashed var(--roost-border)',
      borderBottom: '4px dashed var(--roost-border-bottom)',
      borderRadius: 20,
      padding: 40,
      textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${COLOR}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <Gift size={24} color={COLOR} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 8 }}>
        No rewards yet
      </h3>
      <p style={{ fontSize: 13, color: 'var(--roost-text-secondary)', fontWeight: 600, lineHeight: 1.4, maxWidth: 300, margin: '0 auto' }}>
        When an admin sets up a reward goal for you, your progress and earnings will show up here.
      </p>
    </div>
  )
}
