'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Gift, Plus, ChevronLeft, Trophy, Users, Zap, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react'
import RewardRuleSheet, { type RewardRule, type RewardMember } from '@/components/chores/RewardRuleSheet'

const COLOR = '#A855F7'
const COLOR_DARK = '#7C28C8'

interface RuleWithProgress extends RewardRule {
  childName: string
  childAvatarColor: string | null
  startsAt: string
  createdAt: string
  periodStart: string
  periodEnd: string
  completionRate: number
  completed: number
  total: number
}

interface RewardsData {
  rules: RuleWithProgress[]
  childMembers: RewardMember[]
  isPremium: boolean
}

function Avatar({ name, color, size = 32 }: { name: string; color?: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const bg = color ?? '#A855F7'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

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

function periodLabel(rule: RuleWithProgress) {
  if (rule.periodType === 'week') return 'Every week'
  if (rule.periodType === 'month') return 'Every month'
  if (rule.periodType === 'year') return 'Every year'
  return `Every ${rule.periodDays ?? '?'} days`
}

function rewardLabel(rule: RuleWithProgress) {
  const typeMap: Record<string, string> = { money: 'Money', gift: 'Gift', activity: 'Activity', other: 'Reward' }
  return `${typeMap[rule.rewardType] ?? 'Reward'}: ${rule.rewardDetail}`
}

function HowItWorks() {
  const steps = [
    { icon: Zap, text: 'Set a completion threshold (e.g. 80% of chores done in a period)' },
    { icon: Trophy, text: 'If the child hits the goal, they earn the reward automatically' },
    { icon: Gift, text: 'Money rewards appear in the settle-up flow. Other rewards are tracked here.' },
  ]
  return (
    <div style={{
      backgroundColor: COLOR + '0D',
      border: `1.5px solid ${COLOR}30`,
      borderBottom: `3px solid ${COLOR_DARK}30`,
      borderRadius: 16,
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: COLOR, marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        How it works
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: COLOR + '20', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon size={14} color={COLOR} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)', lineHeight: 1.4 }}>
              {s.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RuleCard({
  rule,
  onEdit,
  onToggle,
  isToggling,
}: {
  rule: RuleWithProgress
  onEdit: () => void
  onToggle: () => void
  isToggling: boolean
}) {
  const met = rule.completionRate >= rule.thresholdPercent
  const progressColor = met ? '#22C55E' : COLOR

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `3px solid ${rule.enabled ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        opacity: rule.enabled ? 1 : 0.6,
      }}
    >
      {/* Header row */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={rule.childName} color={rule.childAvatarColor} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--roost-text-primary)', lineHeight: 1.2 }}>
            {rule.title}
          </p>
          <p style={{ fontSize: 12, color: 'var(--roost-text-muted)', fontWeight: 600, marginTop: 2 }}>
            {rule.childName} · {periodLabel(rule)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '2px solid var(--roost-border-bottom)',
              backgroundColor: 'var(--roost-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Edit2 size={14} color="var(--roost-text-secondary)" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={isToggling}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1.5px solid ${rule.enabled ? COLOR : 'var(--roost-border)'}`,
              borderBottom: `2px solid ${rule.enabled ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
              backgroundColor: rule.enabled ? COLOR + '15' : 'var(--roost-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isToggling ? 'default' : 'pointer',
              opacity: isToggling ? 0.5 : 1,
            }}
          >
            {rule.enabled
              ? <ToggleRight size={16} color={COLOR} />
              : <ToggleLeft size={16} color="var(--roost-text-muted)" />
            }
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'var(--roost-border)', margin: '0 16px' }} />

      {/* Progress + reward */}
      <div style={{ padding: '12px 16px 14px' }}>
        {/* Reward detail */}
        <p style={{ fontSize: 12, fontWeight: 700, color: COLOR, marginBottom: 10 }}>
          {rewardLabel(rule)}
        </p>

        {/* Progress bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-secondary)' }}>
            This period: {rule.completed} / {rule.total} chores
          </p>
          <span style={{
            fontSize: 12, fontWeight: 800,
            color: met ? '#22C55E' : 'var(--roost-text-muted)',
          }}>
            {rule.completionRate}%
          </span>
        </div>
        <ProgressBar value={rule.completionRate} color={progressColor} />
        <p style={{ fontSize: 11, color: 'var(--roost-text-muted)', fontWeight: 600, marginTop: 6 }}>
          Needs {rule.thresholdPercent}% to earn · {met ? 'On track!' : `${rule.thresholdPercent - rule.completionRate}% to go`}
        </p>
      </div>
    </motion.div>
  )
}

export default function RewardsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RuleWithProgress | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<RewardsData>({
    queryKey: ['rewards'],
    queryFn: async () => {
      const r = await fetch('/api/rewards')
      if (!r.ok) throw new Error('Failed to load rewards')
      return r.json()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const r = await fetch(`/api/rewards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!r.ok) throw new Error('Failed to update rule')
    },
    onMutate: ({ id }) => setTogglingId(id),
    onSettled: () => {
      setTogglingId(null)
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
  })

  const isPremium = data?.isPremium ?? false
  const childMembers: RewardMember[] = data?.childMembers ?? []
  const rules = data?.rules ?? []

  function openAdd() {
    setEditingRule(null)
    setSheetOpen(true)
  }

  function openEdit(rule: RuleWithProgress) {
    setEditingRule(rule)
    setSheetOpen(true)
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ height: 32, width: 160, borderRadius: 8, backgroundColor: 'var(--roost-border)', marginBottom: 24 }} />
        {[1, 2].map(i => (
          <div key={i} style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--roost-border)', marginBottom: 12 }} />
        ))}
      </div>
    )
  }

  if (!isPremium) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ maxWidth: 896, margin: '0 auto', padding: '24px 16px 80px' }}
      >
        <button
          type="button"
          onClick={() => router.push('/chores')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--roost-text-muted)', fontSize: 14, fontWeight: 700,
            marginBottom: 24, padding: 0, fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={16} />
          Back to chores
        </button>

        <div style={{
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: `4px solid ${COLOR_DARK}`,
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            backgroundColor: COLOR + '15',
            border: `1.5px solid ${COLOR}30`,
            borderBottom: `3px solid ${COLOR_DARK}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Gift size={28} color={COLOR} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--roost-text-primary)', marginBottom: 8 }}>
            Rewards is a Premium feature
          </h2>
          <p style={{ fontSize: 14, color: 'var(--roost-text-secondary)', fontWeight: 600, marginBottom: 24, lineHeight: 1.5 }}>
            Upgrade to set chore completion goals and give children money, gifts, or activity rewards when they hit the target.
          </p>
          <button
            type="button"
            onClick={() => router.push('/settings/billing')}
            style={{
              height: 52, paddingLeft: 28, paddingRight: 28,
              borderRadius: 14,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `4px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              fontWeight: 800, fontSize: 16,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Upgrade to Premium
          </button>
        </div>
      </motion.div>
    )
  }

  if (childMembers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ maxWidth: 896, margin: '0 auto', padding: '24px 16px 80px' }}
      >
        <button
          type="button"
          onClick={() => router.push('/chores')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--roost-text-muted)', fontSize: 14, fontWeight: 700,
            marginBottom: 24, padding: 0, fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={16} />
          Back to chores
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--roost-text-primary)', marginBottom: 6 }}>
          Rewards
        </h1>
        <p style={{ fontSize: 14, color: 'var(--roost-text-muted)', fontWeight: 600, marginBottom: 24 }}>
          Motivate kids with chore completion rewards
        </p>

        <div style={{
          backgroundColor: 'var(--roost-surface)',
          border: '2px dashed var(--roost-border)',
          borderBottom: '4px dashed var(--roost-border-bottom)',
          borderRadius: 20,
          padding: 32,
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
            <Users size={24} color={COLOR} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 8 }}>
            No children yet
          </h3>
          <p style={{ fontSize: 13, color: 'var(--roost-text-secondary)', fontWeight: 600, marginBottom: 20, lineHeight: 1.4 }}>
            Add a child account in Settings, then come back here to set up their rewards.
          </p>
          <button
            type="button"
            onClick={() => router.push('/settings')}
            style={{
              height: 44, paddingLeft: 20, paddingRight: 20,
              borderRadius: 12,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Go to Settings
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ maxWidth: 896, margin: '0 auto', padding: '24px 16px 80px' }}
    >
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push('/chores')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--roost-text-muted)', fontSize: 14, fontWeight: 700,
          marginBottom: 20, padding: 0, fontFamily: 'inherit',
        }}
      >
        <ChevronLeft size={16} />
        Back to chores
      </button>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--roost-text-primary)', marginBottom: 4 }}>
            Rewards
          </h1>
          <p style={{ fontSize: 14, color: 'var(--roost-text-muted)', fontWeight: 600 }}>
            {rules.length} {rules.length === 1 ? 'rule' : 'rules'} · {childMembers.length} {childMembers.length === 1 ? 'child' : 'children'}
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ y: 2 }}
          onClick={openAdd}
          style={{
            height: 44, paddingLeft: 16, paddingRight: 16,
            borderRadius: 12,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            backgroundColor: COLOR,
            color: '#fff',
            fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={16} />
          Add rule
        </motion.button>
      </div>

      {/* How it works */}
      <HowItWorks />

      {/* Rules list */}
      {rules.length === 0 ? (
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
            No reward rules yet
          </h3>
          <p style={{ fontSize: 13, color: 'var(--roost-text-secondary)', fontWeight: 600, marginBottom: 20, lineHeight: 1.4 }}>
            Add a rule to start motivating your kids with chore completion goals.
          </p>
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={openAdd}
            style={{
              height: 44, paddingLeft: 20, paddingRight: 20,
              borderRadius: 12,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Plus size={16} />
            Add the first rule
          </motion.button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => openEdit(rule)}
              onToggle={() => toggleMutation.mutate({ id: rule.id!, enabled: !rule.enabled })}
              isToggling={togglingId === rule.id}
            />
          ))}
        </div>
      )}

      {/* Sheet */}
      <RewardRuleSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingRule(null) }}
        rule={editingRule}
        children={childMembers}
      />
    </motion.div>
  )
}
