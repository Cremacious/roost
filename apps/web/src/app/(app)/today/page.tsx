'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useState } from 'react'
import { HeroCard } from '@/components/today/HeroCard'
import { ChoreRow } from '@/components/today/ChoreRow'
import { SnapshotStrip } from '@/components/today/SnapshotStrip'
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton'

interface ChoreItem { id: string; title: string; nextDueAt: string | null; overdue: boolean }
interface TodayData {
  hero: { type: 'overdue_chore' | 'due_chore' | 'reminder' | 'all_clear'; item: ChoreItem | null }
  chores: ChoreItem[]
  snapshot: {
    meal: { name: string } | null
    money: { balance: number; label: 'owed' | 'owing' | 'clear' }
    event: { title: string; startsAt: string } | null
    grocery: { count: number }
  }
}

export default function TodayPage() {
  const queryClient = useQueryClient()
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, isError } = useQuery<TodayData>({
    queryKey: ['today'],
    queryFn: async () => {
      const res = await fetch('/api/today')
      if (!res.ok) throw new Error('Failed to load today data')
      return res.json()
    },
    refetchInterval: 10_000,
  })

  const completeMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const res = await fetch(`/api/chores/${choreId}/complete`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to complete chore')
    },
    onMutate: (choreId) => {
      setCompletedIds(prev => new Set(prev).add(choreId))
    },
    onError: (_err, choreId) => {
      setCompletedIds(prev => {
        const next = new Set(prev)
        next.delete(choreId)
        return next
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] })
    },
  })

  const dateLabel = format(new Date(), 'EEEE, MMMM d').toUpperCase()

  if (isLoading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton style={{ height: 16, width: 160 }} />
        <SkeletonCard />
        <Skeleton style={{ height: 12, width: 128 }} />
        <SkeletonCard />
        <SkeletonCard />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}>
          Could not load today&apos;s data. Please refresh.
        </p>
      </div>
    )
  }

  const visibleChores = data.chores.filter(c => !completedIds.has(c.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, margin: '0 auto', width: '100%' }}
    >
      <p style={{ fontSize: 11, fontWeight: 800, color: '#9B9590', letterSpacing: '0.08em', margin: 0 }}>
        {dateLabel}
      </p>

      <HeroCard
        type={data.hero.type}
        item={data.hero.item}
        onCompleteChore={id => completeMutation.mutate(id)}
      />

      {visibleChores.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#EF4444', letterSpacing: '0.08em', margin: 0 }}>
            CHORES &middot; {visibleChores.length} DUE TODAY
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleChores.map((chore, i) => (
              <motion.div
                key={chore.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
              >
                <ChoreRow
                  id={chore.id}
                  title={chore.title}
                  overdue={chore.overdue}
                  completed={completedIds.has(chore.id)}
                  onComplete={id => completeMutation.mutate(id)}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}

      <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.08em', margin: 0 }}>
        SNAPSHOT
      </p>
      <SnapshotStrip data={data.snapshot} />
    </motion.div>
  )
}
