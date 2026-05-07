'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trophy, Gift, ChevronDown, ChevronUp, Check, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import { SECTION_COLORS } from '@/lib/constants/colors'
import ChoreSheet, { type ChoreData } from '@/components/chores/ChoreSheet'
import LeaderboardSheet from '@/components/chores/LeaderboardSheet'

const COLOR = SECTION_COLORS.chores.base
const COLOR_DARK = SECTION_COLORS.chores.dark
const SNOOZE_COLOR = '#06B6D4'
const SNOOZE_DARK = '#0891B2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChoreItem {
  id: string
  title: string
  description: string | null
  frequency: string
  customDays: string | null
  nextDueAt: string | null
  lastCompletedAt: string | null
  assignedTo: string | null
  assigneeName: string | null
  assigneeAvatar: string | null
  createdBy: string
  householdId: string
  snoozedUntil: string | null
  isSnoozed: boolean
  isCompleteToday: boolean
  completedTodayByMe: boolean
}

interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function tomorrowStart() {
  const d = todayStart()
  d.setDate(d.getDate() + 1)
  return d
}

function freqLabel(freq: string, customDays: string | null): string {
  if (freq === 'daily') return 'Daily'
  if (freq === 'weekly') return 'Weekly'
  if (freq === 'biweekly') return '2 weeks'
  if (freq === 'monthly') return 'Monthly'
  if (freq === 'custom' && customDays) {
    const days = customDays.split(' ').map(Number)
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days.map(d => names[d]).join(', ')
  }
  return freq
}

function dueLabel(nextDueAt: string | null): { text: string; color: string } {
  if (!nextDueAt) return { text: 'No schedule', color: 'var(--roost-text-muted)' }
  const due = new Date(nextDueAt)
  const now = todayStart()
  const tom = tomorrowStart()
  if (due < now) return { text: 'Overdue', color: '#EF4444' }
  if (due < tom) return { text: 'Due today', color: '#F97316' }
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000)
  if (days === 1) return { text: 'Tomorrow', color: 'var(--roost-text-secondary)' }
  return { text: `in ${days} days`, color: 'var(--roost-text-muted)' }
}

function isOverdue(nextDueAt: string | null): boolean {
  if (!nextDueAt) return false
  return new Date(nextDueAt) < todayStart()
}

function isDueToday(nextDueAt: string | null): boolean {
  if (!nextDueAt) return false
  const due = new Date(nextDueAt)
  return due >= todayStart() && due < tomorrowStart()
}

function snoozedUntilLabel(snoozedUntil: string): string {
  const date = new Date(snoozedUntil)
  const today = todayStart()
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000)
  if (diff <= 1) return 'until tomorrow'
  if (diff <= 7) {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return `until ${names[date.getDay()]}`
  }
  return `until ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 28 }: { name: string; color: string | null; size?: number }) {
  const bg = color ?? '#6B7280'
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.38 }}>{initials}</span>
    </div>
  )
}

function SectionHeader({
  label,
  count,
  color,
  collapsed,
  onToggle,
}: {
  label: string
  count: number
  color: string
  collapsed?: boolean
  onToggle?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: 'none',
        cursor: onToggle ? 'pointer' : 'default',
        padding: '4px 0',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#fff',
          backgroundColor: color,
          borderRadius: 20,
          padding: '1px 7px',
          minWidth: 20,
          textAlign: 'center',
        }}
      >
        {count}
      </span>
      {onToggle && (
        <span style={{ marginLeft: 'auto', color: 'var(--roost-text-muted)' }}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      )}
    </button>
  )
}

function ChoreRow({
  chore,
  onComplete,
  onUncheck,
  onEdit,
  completing,
  unchecking,
  onSnooze,
  isSnoozingThis,
  onSnoozeSelect,
  onSnoozeDismiss,
}: {
  chore: ChoreItem
  onComplete: (id: string) => void
  onUncheck: (id: string) => void
  onEdit: (chore: ChoreItem) => void
  completing: boolean
  unchecking: boolean
  onSnooze: (id: string) => void
  isSnoozingThis: boolean
  onSnoozeSelect: (days: number) => void
  onSnoozeDismiss: () => void
}) {
  const due = dueLabel(chore.nextDueAt)
  const done = chore.isCompleteToday

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, margin: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: `1.5px solid ${done ? COLOR + '30' : 'var(--roost-border)'}`,
        borderBottom: `4px solid ${done ? COLOR + '50' : 'var(--roost-border-bottom)'}`,
        borderRadius: 14,
        padding: '12px 14px',
        opacity: done ? 0.7 : 1,
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Completion circle */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => done ? onUncheck(chore.id) : onComplete(chore.id)}
          disabled={completing || unchecking}
          aria-label={done ? 'Uncheck chore' : 'Complete chore'}
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: `2.5px solid ${done ? COLOR : COLOR + '80'}`,
            backgroundColor: done ? COLOR : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s, border-color 0.15s',
          }}
        >
          {done && <Check size={15} color="#fff" strokeWidth={3} />}
        </motion.button>

        {/* Content */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => onEdit(chore)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: done ? 'var(--roost-text-muted)' : 'var(--roost-text-primary)',
                textDecoration: done ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 200,
              }}
            >
              {chore.title}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: COLOR + '18',
                color: COLOR,
                border: `1px solid ${COLOR}30`,
                borderRadius: 20,
                padding: '1px 6px',
                flexShrink: 0,
              }}
            >
              {freqLabel(chore.frequency, chore.customDays)}
            </span>
          </div>
          {!done && (
            <p style={{ fontSize: 12, fontWeight: 600, color: due.color, marginTop: 2 }}>
              {due.text}
            </p>
          )}
          {done && (
            <p style={{ fontSize: 12, fontWeight: 600, color: COLOR, marginTop: 2 }}>
              Done today
            </p>
          )}
        </div>

        {/* Snooze button (only on non-done rows) */}
        {!done && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onSnooze(chore.id) }}
            aria-label="Snooze chore"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1.5px solid ${isSnoozingThis ? SNOOZE_COLOR + '60' : 'var(--roost-border)'}`,
              backgroundColor: isSnoozingThis ? SNOOZE_COLOR + '15' : 'var(--roost-surface)',
              color: isSnoozingThis ? SNOOZE_COLOR : 'var(--roost-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
            }}
          >
            <Clock size={15} />
          </motion.button>
        )}

        {/* Assignee avatar */}
        {chore.assigneeName && (
          <div title={chore.assigneeName}>
            <Avatar name={chore.assigneeName} color={chore.assigneeAvatar} size={28} />
          </div>
        )}
      </div>

      {/* Inline snooze day picker */}
      <AnimatePresence>
        {isSnoozingThis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingTop: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
              Snooze for:
            </span>
            {[
              { days: 1, label: '1 day' },
              { days: 3, label: '3 days' },
              { days: 7, label: '1 week' },
            ].map(({ days, label }) => (
              <motion.button
                key={days}
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => onSnoozeSelect(days)}
                style={{
                  height: 28,
                  paddingInline: 10,
                  borderRadius: 20,
                  border: `1.5px solid ${SNOOZE_COLOR}60`,
                  borderBottom: `3px solid ${SNOOZE_DARK}`,
                  backgroundColor: SNOOZE_COLOR + '15',
                  color: SNOOZE_COLOR,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </motion.button>
            ))}
            <button
              type="button"
              onClick={onSnoozeDismiss}
              style={{
                height: 28,
                paddingInline: 8,
                borderRadius: 8,
                border: '1.5px solid var(--roost-border)',
                backgroundColor: 'transparent',
                color: 'var(--roost-text-muted)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SnoozedChoreRow({
  chore,
  onUnsnooze,
}: {
  chore: ChoreItem
  onUnsnooze: (id: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, margin: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        backgroundColor: 'var(--roost-bg)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${SNOOZE_DARK}`,
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: 0.8,
      }}
    >
      {/* Clock circle */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          backgroundColor: SNOOZE_COLOR + '18',
          border: `2px solid ${SNOOZE_COLOR}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Clock size={14} color={SNOOZE_COLOR} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: 14,
            color: 'var(--roost-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {chore.title}
        </span>
        <p style={{ fontSize: 12, fontWeight: 600, color: SNOOZE_COLOR, marginTop: 2 }}>
          Snoozed {chore.snoozedUntil ? snoozedUntilLabel(chore.snoozedUntil) : ''}
        </p>
      </div>

      {/* Undo button */}
      <button
        type="button"
        onClick={() => onUnsnooze(chore.id)}
        style={{
          height: 32,
          paddingInline: 12,
          borderRadius: 8,
          border: `1.5px solid ${SNOOZE_COLOR}40`,
          backgroundColor: SNOOZE_COLOR + '15',
          color: SNOOZE_COLOR,
          fontWeight: 700,
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >
        Undo
      </button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChoresPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<ChoreData | null>(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [doneExpanded, setDoneExpanded] = useState(false)
  const [snoozedExpanded, setSnoozedExpanded] = useState(false)
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [unchecking, setUnchecking] = useState<Set<string>>(new Set())
  const [snoozingId, setSnoozingId] = useState<string | null>(null)

  const { data: choreData, isLoading, isError } = useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      const r = await fetch('/api/chores')
      if (!r.ok) throw new Error('Failed to load chores')
      return r.json() as Promise<{ chores: ChoreItem[]; householdId: string }>
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  })

  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: async () => {
      const r = await fetch('/api/household/me')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ household: { id: string; name: string }; role: string; members: Member[] }>
    },
    staleTime: 60_000,
  })

  const isAdmin = householdData?.role === 'admin'
  const members = householdData?.members ?? []
  const currentUserId = session?.user?.id ?? ''

  // ── Filter + group ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const all = choreData?.chores ?? []
    if (filter === 'mine') {
      return all.filter(c => !c.assignedTo || c.assignedTo === currentUserId)
    }
    return all
  }, [choreData, filter, currentUserId])

  const groups = useMemo(() => {
    const done: ChoreItem[] = []
    const snoozed: ChoreItem[] = []
    const overdue: ChoreItem[] = []
    const today: ChoreItem[] = []
    const upcoming: ChoreItem[] = []

    for (const c of filtered) {
      if (c.isSnoozed) {
        snoozed.push(c)
      } else if (c.isCompleteToday) {
        done.push(c)
      } else if (isOverdue(c.nextDueAt)) {
        overdue.push(c)
      } else if (isDueToday(c.nextDueAt)) {
        today.push(c)
      } else {
        upcoming.push(c)
      }
    }

    return { done, snoozed, overdue, today, upcoming }
  }, [filtered])

  const totalActive = groups.overdue.length + groups.today.length + groups.upcoming.length

  // ── Mutations ────────────────────────────────────────────────────────────

  const completeMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const r = await fetch(`/api/chores/${choreId}/complete`, { method: 'POST' })
      if (!r.ok) throw new Error('Failed to complete chore')
      return r.json()
    },
    onMutate: async (choreId) => {
      setCompleting(prev => new Set(prev).add(choreId))
      await queryClient.cancelQueries({ queryKey: ['chores'] })
      const prev = queryClient.getQueryData<{ chores: ChoreItem[]; householdId: string }>(['chores'])
      queryClient.setQueryData(['chores'], (old: { chores: ChoreItem[]; householdId: string } | undefined) => {
        if (!old) return old
        return {
          ...old,
          chores: old.chores.map(c =>
            c.id === choreId ? { ...c, isCompleteToday: true, completedTodayByMe: true } : c
          ),
        }
      })
      return { prev }
    },
    onError: (_err, choreId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['chores'], ctx.prev)
      toast.error('Could not complete chore', { description: 'Something went wrong. Try again.' })
    },
    onSettled: (_data, _err, choreId) => {
      setCompleting(prev => { const s = new Set(prev); s.delete(choreId); return s })
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      queryClient.invalidateQueries({ queryKey: ['chores-leaderboard'] })
    },
  })

  const uncheckMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const r = await fetch(`/api/chores/${choreId}/complete`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to uncheck chore')
    },
    onMutate: async (choreId) => {
      setUnchecking(prev => new Set(prev).add(choreId))
      await queryClient.cancelQueries({ queryKey: ['chores'] })
      const prev = queryClient.getQueryData<{ chores: ChoreItem[]; householdId: string }>(['chores'])
      queryClient.setQueryData(['chores'], (old: { chores: ChoreItem[]; householdId: string } | undefined) => {
        if (!old) return old
        return {
          ...old,
          chores: old.chores.map(c =>
            c.id === choreId ? { ...c, isCompleteToday: false, completedTodayByMe: false } : c
          ),
        }
      })
      return { prev }
    },
    onError: (_err, choreId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['chores'], ctx.prev)
      toast.error('Could not undo chore', { description: 'Something went wrong. Try again.' })
    },
    onSettled: (_data, _err, choreId) => {
      setUnchecking(prev => { const s = new Set(prev); s.delete(choreId); return s })
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      queryClient.invalidateQueries({ queryKey: ['chores-leaderboard'] })
    },
    onSuccess: () => {
      toast.success('Chore unchecked')
    },
  })

  const snoozeMutation = useMutation({
    mutationFn: async ({ choreId, days }: { choreId: string; days: number }) => {
      const r = await fetch(`/api/chores/${choreId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })
      if (!r.ok) throw new Error('Failed to snooze')
      return r.json()
    },
    onSuccess: (_data, { days }) => {
      setSnoozingId(null)
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      const label = days === 1 ? '1 day' : days === 7 ? '1 week' : `${days} days`
      toast.success(`Snoozed for ${label}`)
    },
    onError: () => {
      toast.error('Could not snooze chore', { description: 'Something went wrong. Try again.' })
    },
  })

  const unsnoozeMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const r = await fetch(`/api/chores/${choreId}/snooze`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to unsnooze')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      toast.success('Snooze cancelled')
    },
    onError: () => {
      toast.error('Could not cancel snooze', { description: 'Something went wrong. Try again.' })
    },
  })

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingChore(null)
    setSheetOpen(true)
  }

  function openEdit(chore: ChoreItem) {
    setEditingChore({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      frequency: chore.frequency,
      customDays: chore.customDays,
      assignedTo: chore.assignedTo,
    })
    setSheetOpen(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ maxWidth: 896, margin: '0 auto', padding: '0 0 80px' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 16px 8px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--roost-text-primary)', lineHeight: 1 }}>
              Chores
            </h1>
            {totalActive > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#fff',
                  backgroundColor: COLOR,
                  borderRadius: 20,
                  padding: '2px 8px',
                }}
              >
                {totalActive}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Leaderboard */}
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => setLeaderboardOpen(true)}
            title="Leaderboard"
            style={{
              height: 40,
              paddingInline: 12,
              borderRadius: 12,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border-bottom)',
              backgroundColor: 'var(--roost-surface)',
              color: 'var(--roost-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <Trophy size={16} />
            <span className="hidden md:inline">Leaderboard</span>
          </motion.button>

          {/* Rewards */}
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => router.push('/chores/rewards')}
            title="Rewards"
            style={{
              height: 40,
              paddingInline: 12,
              borderRadius: 12,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border-bottom)',
              backgroundColor: 'var(--roost-surface)',
              color: 'var(--roost-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <Gift size={16} />
            <span className="hidden md:inline">Rewards</span>
          </motion.button>

          {/* Add chore */}
          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={openAdd}
            aria-label="Add chore"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} />
          </motion.button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {(['all', 'mine'] as const).map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                height: 34,
                paddingInline: 14,
                borderRadius: 20,
                border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
                borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                backgroundColor: active ? COLOR : 'var(--roost-surface)',
                color: active ? '#fff' : 'var(--roost-text-secondary)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {f === 'all' ? 'Everyone' : 'Mine'}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: 68,
                  borderRadius: 14,
                  backgroundColor: 'var(--roost-border)',
                  opacity: 0.4,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        )}

        {isError && (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              border: '2px dashed var(--roost-border)',
              borderRadius: 14,
              color: 'var(--roost-text-muted)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Could not load chores. Pull down to retry.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              border: '2px dashed var(--roost-border)',
              borderRadius: 16,
            }}
          >
            {filter === 'mine' ? (
              <>
                <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>
                  All clear.
                </p>
                <p style={{ fontSize: 13, color: 'var(--roost-text-muted)', marginTop: 6 }}>
                  Nothing here. Enjoy it while it lasts.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>
                  Suspiciously clean.
                </p>
                <p style={{ fontSize: 13, color: 'var(--roost-text-muted)', marginTop: 6, maxWidth: 280, margin: '6px auto 0' }}>
                  No chores yet. Either you are very on top of things, or someone is avoiding this screen.
                </p>
                <motion.button
                  type="button"
                  whileTap={{ y: 2 }}
                  onClick={openAdd}
                  style={{
                    marginTop: 16,
                    height: 44,
                    paddingInline: 20,
                    borderRadius: 12,
                    border: `1.5px solid ${COLOR}`,
                    borderBottom: `3px solid ${COLOR_DARK}`,
                    backgroundColor: COLOR,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Add the first chore
                </motion.button>
              </>
            )}
          </div>
        )}

        {!isLoading && !isError && (
          <AnimatePresence mode="popLayout">
            {/* Overdue */}
            {groups.overdue.length > 0 && (
              <motion.div key="overdue" layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionHeader label="Overdue" count={groups.overdue.length} color="#EF4444" />
                {groups.overdue.map((chore, i) => (
                  <motion.div
                    key={chore.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.04, 0.2) }}
                  >
                    <ChoreRow
                      chore={chore}
                      onComplete={id => completeMutation.mutate(id)}
                      onUncheck={id => uncheckMutation.mutate(id)}
                      onEdit={openEdit}
                      completing={completing.has(chore.id)}
                      unchecking={unchecking.has(chore.id)}
                      onSnooze={id => setSnoozingId(id === snoozingId ? null : id)}
                      isSnoozingThis={snoozingId === chore.id}
                      onSnoozeSelect={days => snoozeMutation.mutate({ choreId: chore.id, days })}
                      onSnoozeDismiss={() => setSnoozingId(null)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Due today */}
            {groups.today.length > 0 && (
              <motion.div key="today" layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionHeader label="Due today" count={groups.today.length} color={COLOR} />
                {groups.today.map((chore, i) => (
                  <motion.div
                    key={chore.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.04, 0.2) }}
                  >
                    <ChoreRow
                      chore={chore}
                      onComplete={id => completeMutation.mutate(id)}
                      onUncheck={id => uncheckMutation.mutate(id)}
                      onEdit={openEdit}
                      completing={completing.has(chore.id)}
                      unchecking={unchecking.has(chore.id)}
                      onSnooze={id => setSnoozingId(id === snoozingId ? null : id)}
                      isSnoozingThis={snoozingId === chore.id}
                      onSnoozeSelect={days => snoozeMutation.mutate({ choreId: chore.id, days })}
                      onSnoozeDismiss={() => setSnoozingId(null)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Upcoming */}
            {groups.upcoming.length > 0 && (
              <motion.div key="upcoming" layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionHeader label="Upcoming" count={groups.upcoming.length} color="var(--roost-text-secondary)" />
                {groups.upcoming.map((chore, i) => (
                  <motion.div
                    key={chore.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.04, 0.2) }}
                  >
                    <ChoreRow
                      chore={chore}
                      onComplete={id => completeMutation.mutate(id)}
                      onUncheck={id => uncheckMutation.mutate(id)}
                      onEdit={openEdit}
                      completing={completing.has(chore.id)}
                      unchecking={unchecking.has(chore.id)}
                      onSnooze={id => setSnoozingId(id === snoozingId ? null : id)}
                      isSnoozingThis={snoozingId === chore.id}
                      onSnoozeSelect={days => snoozeMutation.mutate({ choreId: chore.id, days })}
                      onSnoozeDismiss={() => setSnoozingId(null)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Snoozed */}
            {groups.snoozed.length > 0 && (
              <motion.div key="snoozed" layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionHeader
                  label="Snoozed"
                  count={groups.snoozed.length}
                  color={SNOOZE_COLOR}
                  collapsed={!snoozedExpanded}
                  onToggle={() => setSnoozedExpanded(v => !v)}
                />
                <AnimatePresence>
                  {snoozedExpanded && groups.snoozed.map((chore, i) => (
                    <motion.div
                      key={chore.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.15) }}
                    >
                      <SnoozedChoreRow
                        chore={chore}
                        onUnsnooze={id => unsnoozeMutation.mutate(id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Done today */}
            {groups.done.length > 0 && (
              <motion.div key="done" layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionHeader
                  label="Done today"
                  count={groups.done.length}
                  color="#22C55E"
                  collapsed={!doneExpanded}
                  onToggle={() => setDoneExpanded(v => !v)}
                />
                <AnimatePresence>
                  {doneExpanded && groups.done.map((chore, i) => (
                    <motion.div
                      key={chore.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.15) }}
                    >
                      <ChoreRow
                        chore={chore}
                        onComplete={id => completeMutation.mutate(id)}
                        onUncheck={id => uncheckMutation.mutate(id)}
                        onEdit={openEdit}
                        completing={completing.has(chore.id)}
                        unchecking={unchecking.has(chore.id)}
                        onSnooze={() => {}}
                        isSnoozingThis={false}
                        onSnoozeSelect={() => {}}
                        onSnoozeDismiss={() => {}}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Sheets */}
      <ChoreSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditingChore(null)
        }}
        chore={editingChore}
        members={members}
        isAdmin={isAdmin}
      />

      <LeaderboardSheet
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />
    </motion.div>
  )
}
