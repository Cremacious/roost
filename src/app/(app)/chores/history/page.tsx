'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronLeft, CheckCircle2, Trophy, Star, ListChecks } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { PageContainer } from '@/components/layout/PageContainer'
import PremiumGate from '@/components/shared/PremiumGate'
import { useHousehold } from '@/lib/hooks/useHousehold'

const COLOR = SECTION_COLORS.chores.base
const COLOR_DARK = SECTION_COLORS.chores.dark
const PAGE_SIZE = 20

// ─── Types ────────────────────────────────────────────────────────────────────

interface Completion {
  id: string
  choreId: string
  choreTitle: string
  userId: string
  userName: string
  avatarColor: string | null
  completedAt: string | null
  points: number
}

interface HistoryStats {
  totalCompletions: number
  pointsEarned: number
  mostActiveMember: { name: string; count: number } | null
  mostCompletedChore: { title: string; count: number } | null
}

interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

type RangePreset = '7' | '30' | '90' | 'custom'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return ymdLocal(d)
}

function today(): string {
  return ymdLocal(new Date())
}

// Group key label for a completion date (Today / Yesterday / weekday+date).
function groupLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const diff = Math.round((t.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, color, size = 26 }: { name: string; color: string | null; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color ?? '#6B7280',
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

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Trophy
  label: string
  value: string
  sub?: string
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${COLOR_DARK}`,
        borderRadius: 16,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: COLOR + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={COLOR} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 900,
            color: 'var(--roost-text-primary)',
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
          {label}
        </p>
        {sub && (
          <p
            style={{
              margin: '1px 0 0',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--roost-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChoreHistoryPage() {
  const router = useRouter()
  const { isPremium, isLoading: householdLoading } = useHousehold()

  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [preset, setPreset] = useState<RangePreset>('30')
  const [customFrom, setCustomFrom] = useState<string>(daysAgo(30))
  const [customTo, setCustomTo] = useState<string>(today())
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE)

  // Resolve the active date range from the preset.
  const range = useMemo(() => {
    if (preset === 'custom') return { from: customFrom, to: customTo }
    return { from: daysAgo(Number(preset)), to: today() }
  }, [preset, customFrom, customTo])

  // Members for the filter pills. /api/household/members carries the member
  // list (the /me endpoint does not).
  const { data: membersData } = useQuery({
    queryKey: ['household-members'],
    queryFn: async () => {
      const r = await fetch('/api/household/members')
      if (!r.ok) throw new Error('Failed to load members')
      return r.json() as Promise<{ members: Member[] }>
    },
    staleTime: 60_000,
    enabled: isPremium,
  })
  const members = membersData?.members ?? []

  const historyQuery = useQuery({
    queryKey: ['chore-history', memberFilter, range.from, range.to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (memberFilter !== 'all') params.set('memberId', memberFilter)
      if (range.from) params.set('from', range.from)
      if (range.to) params.set('to', range.to)
      const r = await fetch(`/api/chores/history?${params.toString()}`)
      if (!r.ok) throw new Error('Failed to load history')
      return r.json() as Promise<{ completions: Completion[]; stats: HistoryStats }>
    },
    staleTime: 10_000,
    enabled: isPremium,
  })

  const completions = historyQuery.data?.completions ?? []
  const stats = historyQuery.data?.stats

  // Reset pagination whenever the filters change (query key identity changes).
  const visible = completions.slice(0, visibleCount)
  const hasMore = completions.length > visible.length

  // Group the visible completions by local date.
  const grouped = useMemo(() => {
    const map = new Map<string, Completion[]>()
    for (const c of visible) {
      if (!c.completedAt) continue
      const key = ymdLocal(new Date(c.completedAt))
      const arr = map.get(key) ?? []
      arr.push(c)
      map.set(key, arr)
    }
    return Array.from(map.entries()) // already newest-first (completions sorted desc)
  }, [visible])

  function changePreset(p: RangePreset) {
    setPreset(p)
    setVisibleCount(PAGE_SIZE)
  }

  function changeMember(id: string) {
    setMemberFilter(id)
    setVisibleCount(PAGE_SIZE)
  }

  // ── Gate ─────────────────────────────────────────────────────────────────

  if (householdLoading) {
    return (
      <PageContainer className="py-6">
        <div style={{ height: 28, width: 140, borderRadius: 8, backgroundColor: 'var(--roost-border)', marginBottom: 20 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 64, borderRadius: 16, backgroundColor: 'var(--roost-border)', opacity: 0.4, marginBottom: 10 }} />
        ))}
      </PageContainer>
    )
  }

  if (!isPremium) {
    return (
      <PageContainer>
        <PremiumGate feature="chores" trigger="page" />
      </PageContainer>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <PageContainer className="pt-5 pb-24">
        {/* Back nav */}
        <button
          type="button"
          onClick={() => router.push('/chores')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--roost-text-muted)',
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={16} />
          Back to chores
        </button>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 className="roost-page-title" style={{ margin: 0, fontWeight: 900, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>
            Chore history
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
            {stats ? `${stats.totalCompletions} completions in range` : 'Completed chores over time'}
          </p>
        </div>

        {/* Member filter pills */}
        {members.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 10,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            <FilterPill active={memberFilter === 'all'} onClick={() => changeMember('all')} label="All" />
            {members.map((m) => {
              const active = memberFilter === m.userId
              const bg = m.avatarColor ?? '#6B7280'
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => changeMember(active ? 'all' : m.userId)}
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
                  }}
                >
                  <Avatar name={m.name} color={m.avatarColor} size={22} />
                  {m.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        )}

        {/* Date range pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <FilterPill active={preset === '7'} onClick={() => changePreset('7')} label="7 days" />
          <FilterPill active={preset === '30'} onClick={() => changePreset('30')} label="30 days" />
          <FilterPill active={preset === '90'} onClick={() => changePreset('90')} label="90 days" />
          <FilterPill active={preset === 'custom'} onClick={() => changePreset('custom')} label="Custom" />
        </div>

        {/* Custom range inputs */}
        {preset === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <DateField
              label="From"
              value={customFrom}
              max={customTo}
              onChange={(v) => {
                setCustomFrom(v)
                setVisibleCount(PAGE_SIZE)
              }}
            />
            <DateField
              label="To"
              value={customTo}
              min={customFrom}
              max={today()}
              onChange={(v) => {
                setCustomTo(v)
                setVisibleCount(PAGE_SIZE)
              }}
            />
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}
            className="sm:grid-cols-4"
          >
            <StatTile icon={CheckCircle2} label="Completions" value={String(stats.totalCompletions)} />
            <StatTile icon={Star} label="Points earned" value={String(stats.pointsEarned)} />
            <StatTile
              icon={Trophy}
              label="Most active"
              value={stats.mostActiveMember ? stats.mostActiveMember.name.split(' ')[0] : 'None'}
              sub={stats.mostActiveMember ? `${stats.mostActiveMember.count} done` : undefined}
            />
            <StatTile
              icon={ListChecks}
              label="Top chore"
              value={stats.mostCompletedChore ? stats.mostCompletedChore.title : 'None'}
              sub={stats.mostCompletedChore ? `${stats.mostCompletedChore.count}x` : undefined}
            />
          </div>
        )}

        {/* Loading */}
        {historyQuery.isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: 'var(--roost-border)',
                  opacity: 0.4,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {historyQuery.isError && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              border: '2px dashed var(--roost-border)',
              borderRadius: 16,
              color: 'var(--roost-text-muted)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Could not load history. Try again.
          </div>
        )}

        {/* Empty */}
        {!historyQuery.isLoading && !historyQuery.isError && completions.length === 0 && (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              border: '2px dashed var(--roost-border)',
              borderBottom: '4px dashed var(--roost-border-bottom)',
              borderRadius: 16,
              backgroundColor: 'var(--roost-surface)',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: `4px solid ${COLOR}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <CheckCircle2 size={24} color={COLOR} />
            </div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>
              Nothing logged here.
            </p>
            <p style={{ margin: '6px auto 0', maxWidth: 300, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
              No chores were completed in this range. Adjust the filters or check back after a few get done.
            </p>
          </div>
        )}

        {/* Grouped list */}
        {!historyQuery.isLoading && !historyQuery.isError && completions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {grouped.map(([dateKey, items]) => (
              <div key={dateKey}>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 12,
                    fontWeight: 800,
                    color: 'var(--roost-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {groupLabel(dateKey)}
                </p>
                <div
                  style={{
                    backgroundColor: 'var(--roost-surface)',
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: `4px solid ${COLOR_DARK}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  {items.map((c, i) => (
                    <div key={c.id}>
                      {i > 0 && (
                        <div style={{ height: 1, backgroundColor: 'var(--roost-border)', marginInline: 14 }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            backgroundColor: COLOR,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle2 size={16} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              fontWeight: 800,
                              color: 'var(--roost-text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.choreTitle}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                            {c.userName}
                            {c.completedAt ? ` · ${timeLabel(c.completedAt)}` : ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: COLOR,
                              backgroundColor: COLOR + '15',
                              border: `1px solid ${COLOR}30`,
                              borderRadius: 20,
                              padding: '2px 8px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            +{c.points}
                          </span>
                          <Avatar name={c.userName} color={c.avatarColor} size={26} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 12,
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: `3px solid ${COLOR_DARK}`,
                  backgroundColor: 'var(--roost-surface)',
                  color: COLOR,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Load more ({completions.length - visible.length} left)
              </button>
            )}
          </div>
        )}
      </PageContainer>
    </motion.div>
  )
}

// ─── Shared pill / field ──────────────────────────────────────────────────────

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min?: string
  max?: string
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 40,
          paddingInline: 10,
          borderRadius: 12,
          border: '1.5px solid var(--roost-border)',
          borderBottom: `3px solid ${COLOR_DARK}`,
          backgroundColor: 'var(--roost-surface)',
          color: 'var(--roost-text-primary)',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'inherit',
        }}
      />
    </label>
  )
}
