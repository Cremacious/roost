'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trophy, Gift, ChevronDown, ChevronUp, Check, Clock, AlertCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
import { useRouter } from 'next/navigation'
import { SECTION_COLORS } from '@/lib/constants/colors'
import ChoreSheet, { type ChoreData } from '@/components/chores/ChoreSheet'
import LeaderboardSheet from '@/components/chores/LeaderboardSheet'
import { SectionGroup } from '@/components/shared/SectionGroup'

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
  if (due < now) {
    const days = Math.round((now.getTime() - due.getTime()) / 86_400_000)
    return { text: days === 1 ? '1 day late' : `${days} days late`, color: '#EF4444' }
  }
  if (due < tom) return { text: 'Due today', color: '#F97316' }
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000)
  if (days === 1) return { text: 'Tomorrow', color: 'var(--roost-text-secondary)' }
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (days <= 6) return { text: names[due.getDay()], color: 'var(--roost-text-muted)' }
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

function firstName(fullName: string | null): string {
  if (!fullName) return 'Someone'
  return fullName.split(' ')[0]
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

function ChoreRow({
  chore,
  onComplete,
  onUncheck,
  onEdit,
  completing,
  unchecking,
  canEditChore,
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
  canEditChore: boolean
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
      style={{ opacity: done ? 0.65 : 1 }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
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
            border: `2.5px solid ${COLOR}`,
            backgroundColor: done ? COLOR : COLOR + '28',
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
          aria-disabled={!canEditChore}
          style={{ flex: 1, minWidth: 0, cursor: canEditChore ? 'pointer' : 'not-allowed' }}
          onClick={() => onEdit(chore)}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: 14,
              color: done ? 'var(--roost-text-muted)' : 'var(--roost-text-primary)',
              textDecoration: done ? 'line-through' : 'none',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chore.title}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
            {freqLabel(chore.frequency, chore.customDays)}
            {chore.assigneeName ? ` · ${firstName(chore.assigneeName)}'s turn` : ''}
          </span>
        </div>

        {/* Right side: due badge + avatar + snooze */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!done && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: due.color,
                backgroundColor: due.color + '14',
                border: `1px solid ${due.color}30`,
                borderRadius: 20,
                padding: '2px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {due.text}
            </span>
          )}
          {done && (
            <span style={{ fontSize: 11, fontWeight: 700, color: COLOR }}>Done</span>
          )}
          {chore.assigneeName && (
            <Avatar name={chore.assigneeName} color={chore.assigneeAvatar} size={26} />
          )}
          {!done && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onSnooze(chore.id) }}
              aria-label="Snooze chore"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: `1.5px solid ${isSnoozingThis ? SNOOZE_COLOR + '60' : 'var(--roost-border)'}`,
                backgroundColor: isSnoozingThis ? SNOOZE_COLOR + '15' : 'transparent',
                color: isSnoozingThis ? SNOOZE_COLOR : 'var(--roost-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
              }}
            >
              <Clock size={14} />
            </motion.button>
          )}
        </div>
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
              padding: '0 14px 12px',
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        opacity: 0.75,
      }}
    >
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: 14,
            color: 'var(--roost-text-muted)',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {chore.title}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: SNOOZE_COLOR }}>
          Snoozed {chore.snoozedUntil ? snoozedUntilLabel(chore.snoozedUntil) : ''}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onUnsnooze(chore.id)}
        style={{
          height: 30,
          paddingInline: 10,
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
    </div>
  )
}

// Section slab card wrapping a group of chore rows

// Row divider between chores inside a card
function RowDivider() {
  return <div style={{ height: 1, backgroundColor: 'var(--roost-border)', marginInline: 14 }} />
}

// ─── Sidebar widgets ──────────────────────────────────────────────────────────

function ThisWeekCard({
  done,
  overdue,
  total,
}: {
  done: number
  overdue: number
  total: number
}) {
  const rate = total > 0 ? Math.round((done / total) * 100) : 0
  const onTime = Math.max(0, done - overdue)

  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${COLOR_DARK}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--roost-border)' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--roost-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Today
        </span>
      </div>
      <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <StatRow label="Completed" value={`${done} / ${total}`} valueColor={COLOR} />
        <StatRow label="On time" value={String(onTime)} />
        <StatRow label="Overdue" value={String(overdue)} valueColor={overdue > 0 ? '#EF4444' : undefined} />
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>Rate</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--roost-text-primary)' }}>{rate}%</span>
          </div>
          <div style={{ height: 5, backgroundColor: 'var(--roost-border)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${rate}%`,
                backgroundColor: rate >= 80 ? COLOR : rate >= 50 ? '#F97316' : '#EF4444',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: valueColor ?? 'var(--roost-text-primary)' }}>{value}</span>
    </div>
  )
}

function NextChoresCard({
  chores,
  currentUserId,
}: {
  chores: ChoreItem[]
  currentUserId: string
}) {
  const myNext = chores
    .filter(c => !c.assignedTo || c.assignedTo === currentUserId)
    .slice(0, 3)

  if (myNext.length === 0) return null

  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '4px solid var(--roost-border-bottom)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--roost-border)' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--roost-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Your next chores
        </span>
      </div>
      <div>
        {myNext.map((chore, i) => {
          const due = dueLabel(chore.nextDueAt)
          return (
            <div key={chore.id}>
              {i > 0 && <div style={{ height: 1, backgroundColor: 'var(--roost-border)', marginInline: 14 }} />}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chore.title}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                    {freqLabel(chore.frequency, chore.customDays)}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: due.color, backgroundColor: due.color + '14', border: `1px solid ${due.color}25`, borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
                  {due.text}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChoresPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const [memberFilter, setMemberFilter] = useState<string>('all')
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
      return r.json() as Promise<{ household: { id: string; name: string }; role: string }>
    },
    staleTime: 60_000,
  })

  // /api/household/me does not return the member list, so fetch members
  // separately from /api/household/members. Distinct query key to avoid
  // colliding with the ['household'] (/me shape) cache used elsewhere.
  const { data: membersData } = useQuery({
    queryKey: ['household-members'],
    queryFn: async () => {
      const r = await fetch('/api/household/members')
      if (!r.ok) throw new Error('Failed to load members')
      return r.json() as Promise<{ members: Member[] }>
    },
    staleTime: 60_000,
  })

  const isAdmin = householdData?.role === 'admin'
  const members = membersData?.members ?? []
  const currentUserId = session?.user?.id ?? ''

  const { allowed: canAddChore, onBlocked: onBlockedAddChore } = usePermissionGate('chores.add')
  const { allowed: canEditChore, onBlocked: onBlockedEditChore } = usePermissionGate('chores.edit')

  // ── Filter + group ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const all = choreData?.chores ?? []
    if (memberFilter === 'all') return all
    return all.filter(c => c.assignedTo === memberFilter)
  }, [choreData, memberFilter])

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

  // Overdue banner: chore names with assignee first names
  const overdueSummary = useMemo(() => {
    const items = groups.overdue.slice(0, 3).map(c => {
      const name = c.assigneeName ? firstName(c.assigneeName) : null
      return name ? `${c.title} (${name})` : c.title
    })
    const rest = groups.overdue.length - items.length
    return { text: items.join(', ') + (rest > 0 ? ` and ${rest} more` : ''), count: groups.overdue.length }
  }, [groups.overdue])

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
      queryClient.invalidateQueries({ queryKey: ['rewards-child'] })
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
      queryClient.invalidateQueries({ queryKey: ['rewards-child'] })
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

  function makeChoreRowProps(chore: ChoreItem) {
    return {
      chore,
      onComplete: (id: string) => completeMutation.mutate(id),
      onUncheck: (id: string) => uncheckMutation.mutate(id),
      onEdit: canEditChore ? openEdit : () => onBlockedEditChore(),
      completing: completing.has(chore.id),
      unchecking: unchecking.has(chore.id),
      canEditChore,
      onSnooze: (id: string) => setSnoozingId(id === snoozingId ? null : id),
      isSnoozingThis: snoozingId === chore.id,
      onSnoozeSelect: (days: number) => snoozeMutation.mutate({ choreId: chore.id, days }),
      onSnoozeDismiss: () => setSnoozingId(null),
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const choreListContent = (
    <AnimatePresence mode="popLayout">
      {/* Overdue */}
      {groups.overdue.length > 0 && (
        <motion.div key="overdue" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <SectionGroup label="Overdue" count={groups.overdue.length} color="#EF4444" slabColor="#C93B3B">
            {groups.overdue.map((chore, i) => (
              <div key={chore.id}>
                {i > 0 && <RowDivider />}
                <ChoreRow {...makeChoreRowProps(chore)} />
              </div>
            ))}
          </SectionGroup>
        </motion.div>
      )}

      {/* Due today */}
      {groups.today.length > 0 && (
        <motion.div key="today" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.04 }}>
          <SectionGroup label="Due today" count={groups.today.length} color={COLOR} slabColor={COLOR_DARK}>
            {groups.today.map((chore, i) => (
              <div key={chore.id}>
                {i > 0 && <RowDivider />}
                <ChoreRow {...makeChoreRowProps(chore)} />
              </div>
            ))}
          </SectionGroup>
        </motion.div>
      )}

      {/* Upcoming */}
      {groups.upcoming.length > 0 && (
        <motion.div key="upcoming" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.08 }}>
          <SectionGroup label="Upcoming" count={groups.upcoming.length} color="var(--roost-text-secondary)" slabColor="var(--roost-border-bottom)">
            {groups.upcoming.map((chore, i) => (
              <div key={chore.id}>
                {i > 0 && <RowDivider />}
                <ChoreRow {...makeChoreRowProps(chore)} />
              </div>
            ))}
          </SectionGroup>
        </motion.div>
      )}

      {/* Snoozed */}
      {groups.snoozed.length > 0 && (
        <motion.div key="snoozed" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.12 }}>
          <SectionGroup
            label="Snoozed"
            count={groups.snoozed.length}
            color={SNOOZE_COLOR}
            slabColor={SNOOZE_DARK}
            collapsed={!snoozedExpanded}
            onToggle={() => setSnoozedExpanded(v => !v)}
          >
            <AnimatePresence>
              {snoozedExpanded && groups.snoozed.map((chore, i) => (
                <motion.div
                  key={chore.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.15) }}
                >
                  {i > 0 && <RowDivider />}
                  <SnoozedChoreRow chore={chore} onUnsnooze={id => unsnoozeMutation.mutate(id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </SectionGroup>
        </motion.div>
      )}

      {/* Done today */}
      {groups.done.length > 0 && (
        <motion.div key="done" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: 0.16 }}>
          <SectionGroup
            label="Done today"
            count={groups.done.length}
            color="#22C55E"
            slabColor="#15803D"
            collapsed={!doneExpanded}
            onToggle={() => setDoneExpanded(v => !v)}
          >
            <AnimatePresence>
              {doneExpanded && groups.done.map((chore, i) => (
                <motion.div
                  key={chore.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.15) }}
                >
                  {i > 0 && <RowDivider />}
                  <ChoreRow
                    {...makeChoreRowProps(chore)}
                    onSnooze={() => {}}
                    isSnoozingThis={false}
                    onSnoozeSelect={() => {}}
                    onSnoozeDismiss={() => {}}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SectionGroup>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ maxWidth: 768, margin: '0 auto', padding: '0 0 80px' }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 16px 10px',
        }}
      >
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>
            Chores
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
            {totalActive} active
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={canAddChore ? openAdd : onBlockedAddChore}
            aria-label="Add chore"
            aria-disabled={!canAddChore}
            style={{
              height: 40,
              paddingInline: 14,
              borderRadius: 12,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              cursor: canAddChore ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 13,
              opacity: canAddChore ? 1 : 0.55,
            }}
          >
            {canAddChore ? <Plus size={16} /> : <Lock size={16} />}
            <span className="hidden md:inline">Add chore</span>
          </motion.button>
        </div>
      </div>

      {/* ── Overdue banner ── */}
      <AnimatePresence>
        {overdueSummary.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              margin: '0 16px 10px',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FECACA',
              borderBottom: '3px solid #EF4444',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', lineHeight: 1.4, margin: 0 }}>
              {overdueSummary.count === 1 ? '1 chore overdue' : `${overdueSummary.count} chores overdue`}
              {': '}{overdueSummary.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Member filter pills ── */}
      {members.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '0 16px 12px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {/* All pill */}
          <button
            type="button"
            onClick={() => setMemberFilter('all')}
            style={{
              height: 34,
              paddingInline: 14,
              borderRadius: 20,
              border: `1.5px solid ${memberFilter === 'all' ? COLOR : 'var(--roost-border)'}`,
              borderBottom: `3px solid ${memberFilter === 'all' ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
              backgroundColor: memberFilter === 'all' ? COLOR : 'var(--roost-surface)',
              color: memberFilter === 'all' ? '#fff' : 'var(--roost-text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            All
          </button>

          {/* Member pills */}
          {members.map(m => {
            const active = memberFilter === m.userId
            const bg = m.avatarColor ?? '#6B7280'
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => setMemberFilter(active ? 'all' : m.userId)}
                style={{
                  height: 34,
                  paddingInline: 10,
                  paddingLeft: 6,
                  borderRadius: 20,
                  border: `1.5px solid ${active ? bg : 'var(--roost-border)'}`,
                  borderBottom: `3px solid ${active ? bg : 'var(--roost-border-bottom)'}`,
                  backgroundColor: active ? bg + '18' : 'var(--roost-surface)',
                  color: active ? bg : 'var(--roost-text-secondary)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <Avatar name={m.name} color={m.avatarColor} size={22} />
                {m.name.split(' ')[0]}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                height: 68,
                borderRadius: 16,
                backgroundColor: 'var(--roost-border)',
                opacity: 0.4,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div
          style={{
            margin: '0 16px',
            padding: '24px',
            textAlign: 'center',
            border: '2px dashed var(--roost-border)',
            borderRadius: 16,
            color: 'var(--roost-text-muted)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Could not load chores. Pull down to retry.
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div
          style={{
            margin: '0 16px',
            padding: '40px 16px',
            textAlign: 'center',
            border: '2px dashed var(--roost-border)',
            borderRadius: 16,
          }}
        >
          {memberFilter !== 'all' ? (
            <>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>All clear.</p>
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

      {/* ── Main content: two-column on desktop ── */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div
          className="md:grid md:grid-cols-[1fr_210px]"
          style={{
            padding: '0 16px',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* Left: chore list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {choreListContent}
          </div>

          {/* Right: sidebar (desktop only) */}
          <div className="hidden md:flex" style={{ flexDirection: 'column', gap: 12 }}>
            <ThisWeekCard
              done={groups.done.length}
              overdue={groups.overdue.length}
              total={filtered.length}
            />
            <NextChoresCard chores={groups.upcoming} currentUserId={currentUserId} />
          </div>
        </div>
      )}

      {/* ── Sheets ── */}
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
