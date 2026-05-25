'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useState } from 'react'
import { HeroCard } from '@/components/today/HeroCard'
import { ChoreRow } from '@/components/today/ChoreRow'
import { SnapshotStrip } from '@/components/today/SnapshotStrip'
import { SkeletonCard, Skeleton } from '@/components/ui/skeleton'
import WelcomeModal from '@/components/shared/WelcomeModal'
import { UpgradeAccountBanner } from '@/components/account/UpgradeAccountBanner'

interface ChoreItem { id: string; title: string; nextDueAt: string | null; frequency?: string; overdue: boolean }
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

  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  const { data: profile } = useQuery<{ hasSeenWelcome: boolean; isChildAccount: boolean }>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const r = await fetch('/api/user/profile')
      if (!r.ok) throw new Error('Failed to load profile')
      const json = await r.json()
      // API returns { user: {...}, hasSeenWelcome, isChildAccount } — pick the flat fields
      return {
        hasSeenWelcome: json.hasSeenWelcome as boolean,
        isChildAccount: json.isChildAccount as boolean,
      }
    },
    staleTime: 5 * 60_000,
  })

  const showWelcome =
    !welcomeDismissed &&
    profile !== undefined &&
    profile.hasSeenWelcome === false &&
    profile.isChildAccount === false

  const { data, isLoading, isError } = useQuery<TodayData>({
    queryKey: ['today'],
    queryFn: async () => {
      const res = await fetch('/api/today')
      if (!res.ok) throw new Error('Failed to load today data')
      return res.json()
    },
    refetchInterval: 30_000,
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

  // Render WelcomeModal regardless of today-data loading state so it is
  // never blocked by a slow or failed /api/today fetch.
  const welcomeModal = (
    <WelcomeModal
      open={showWelcome}
      onDismiss={() => setWelcomeDismissed(true)}
    />
  )

  if (isLoading) {
    return (
      <>
        {welcomeModal}
        <div style={{ padding: 16, maxWidth: 768, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        {welcomeModal}
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}>
            Could not load today&apos;s data. Please refresh.
          </p>
        </div>
      </>
    )
  }

  const visibleChores = data.chores.filter(c => !completedIds.has(c.id))

  return (
    <>
      {welcomeModal}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 768, margin: '0 auto', width: '100%' }}
      >
        <p style={{ fontSize: 11, fontWeight: 800, color: '#9B9590', letterSpacing: '0.08em', margin: 0 }}>
          {dateLabel}
        </p>

        <UpgradeAccountBanner />

        <HeroCard
          type={data.hero.type}
          item={data.hero.item}
          onCompleteChore={id => completeMutation.mutate(id)}
        />

        {visibleChores.length > 0 && (
          <div style={{
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: `4px solid ${visibleChores.some(c => c.overdue) ? '#B91C1C' : '#F59E0B'}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {/* Slab header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Your chores</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>{visibleChores.length} to do</span>
            </div>
            {/* Rows */}
            <div style={{ padding: '6px 16px 14px' }}>
              {visibleChores.map((chore, i) => (
                <motion.div
                  key={chore.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
                >
                  <ChoreRow
                    id={chore.id}
                    title={chore.title}
                    overdue={chore.overdue}
                    frequency={chore.frequency}
                    nextDueAt={chore.nextDueAt}
                    completed={completedIds.has(chore.id)}
                    isLast={i === visibleChores.length - 1}
                    onComplete={id => completeMutation.mutate(id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.08em', margin: 0 }}>
          QUICK LOOK
        </p>
        <SnapshotStrip data={data.snapshot} />
      </motion.div>
    </>
  )
}
