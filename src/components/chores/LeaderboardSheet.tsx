'use client'

import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, Star } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.chores.base
const COLOR_DARK = SECTION_COLORS.chores.dark

interface LeaderboardEntry {
  userId: string
  name: string
  avatarColor: string | null
  role: string
  points: number
  completions: number
}

function Avatar({ name, color, size = 36 }: { name: string; color: string | null; size?: number }) {
  const bg = color ?? '#EF4444'
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

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={18} style={{ color: '#F59E0B' }} />
  if (rank === 2) return <Medal size={18} style={{ color: '#9CA3AF' }} />
  if (rank === 3) return <Star size={18} style={{ color: '#CD7C2F' }} />
  return (
    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-muted)', minWidth: 18, textAlign: 'center' }}>
      {rank}
    </span>
  )
}

interface LeaderboardSheetProps {
  open: boolean
  onClose: () => void
}

export default function LeaderboardSheet({ open, onClose }: LeaderboardSheetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['chores-leaderboard'],
    queryFn: async () => {
      const r = await fetch('/api/chores/leaderboard')
      if (!r.ok) throw new Error('Failed to load leaderboard')
      return r.json() as Promise<{ leaderboard: LeaderboardEntry[]; weekStart: string }>
    },
    enabled: open,
    staleTime: 30_000,
  })

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div style={{ padding: '4px 16px 32px' }}>
        <div style={{ marginBottom: 4 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--roost-text-primary)' }}>
            Weekly Leaderboard
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', marginTop: 2 }}>
            Points reset every Monday
          </p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: 64,
                  borderRadius: 14,
                  backgroundColor: 'var(--roost-border)',
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div
            style={{
              marginTop: 20,
              padding: '32px 16px',
              textAlign: 'center',
              border: '2px dashed var(--roost-border)',
              borderRadius: 16,
            }}
          >
            <Trophy size={32} style={{ color: 'var(--roost-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 800, color: 'var(--roost-text-primary)', fontSize: 15 }}>
              No activity this week yet.
            </p>
            <p style={{ fontSize: 13, color: 'var(--roost-text-muted)', marginTop: 4 }}>
              Complete chores to earn points and claim your spot.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {data.leaderboard.map((entry, i) => {
              const rank = i + 1
              const isFirst = rank === 1 && entry.points > 0
              return (
                <div
                  key={entry.userId}
                  style={{
                    backgroundColor: 'var(--roost-surface)',
                    border: `1.5px solid ${isFirst ? COLOR + '40' : 'var(--roost-border)'}`,
                    borderBottom: `4px solid ${isFirst ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                    <RankIcon rank={entry.points > 0 ? rank : 99} />
                  </div>

                  <Avatar name={entry.name} color={entry.avatarColor} size={36} />

                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                      {entry.name}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--roost-text-muted)', marginTop: 1 }}>
                      {entry.completions} chore{entry.completions !== 1 ? 's' : ''} completed
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: isFirst ? COLOR : 'var(--roost-text-primary)',
                        lineHeight: 1,
                      }}
                    >
                      {entry.points}
                    </p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>pts</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DraggableSheet>
  )
}
