'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'
import { HeroCard } from '@/components/today/HeroCard'
import { ChoreRow } from '@/components/today/ChoreRow'
import { ReminderRow } from '@/components/today/ReminderRow'
import { SnapshotStrip } from '@/components/today/SnapshotStrip'
import { SkeletonCard, Skeleton } from '@/components/ui/skeleton'
import WelcomeModal from '@/components/shared/WelcomeModal'
import { UpgradeAccountBanner } from '@/components/account/UpgradeAccountBanner'
import RewardsWidget from '@/components/shared/RewardsWidget'

interface ChoreItem { id: string; title: string; nextDueAt: string | null; frequency?: string; overdue: boolean }
interface HeroReminderItem { id: string; title: string; nextRemindAt: string; ownedByUser?: boolean }
interface ReminderItem { id: string; title: string; nextRemindAt: string; frequency: string; notifyType: string; ownedByUser: boolean }
type HeroType = 'overdue_chore' | 'due_chore' | 'reminder' | 'all_clear'
interface TodayData {
  hero: { type: HeroType; item: ChoreItem | HeroReminderItem | null }
  chores: ChoreItem[]
  reminders: ReminderItem[]
  attentionCount: number
  snapshot: {
    meal: { name: string; slotDate: string; slotType: 'breakfast' | 'lunch' | 'dinner' | 'snack' } | null
    money: { balance: number; label: 'owed' | 'owing' | 'clear' }
    event: { title: string; startsAt: string } | null
    grocery: { count: number }
  }
}

export default function TodayPage() {
  const queryClient = useQueryClient()
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [dismissedReminderIds, setDismissedReminderIds] = useState<Set<string>>(new Set())

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
      toast.error('Could not complete chore', {
        description: 'Something went wrong. Please try again.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] })
      // Keep the rewards widget's progress in sync when a chore is completed here.
      queryClient.invalidateQueries({ queryKey: ['rewards-child'] })
    },
  })

  // Reminder hero actions. Both optimistically dismiss the reminder from the
  // hero, then let the refetch reconcile (surfacing the next reminder or the
  // all-clear state).
  const reminderDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}/complete`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to complete reminder')
    },
    onMutate: (id) => {
      setDismissedReminderIds(prev => new Set(prev).add(id))
    },
    onError: (_err, id) => {
      setDismissedReminderIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.error('Could not complete reminder', {
        description: 'Something went wrong. Please try again.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] })
    },
  })

  const reminderSnoozeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}/snooze`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to snooze reminder')
    },
    onMutate: (id) => {
      setDismissedReminderIds(prev => new Set(prev).add(id))
    },
    onError: (_err, id) => {
      setDismissedReminderIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.error('Could not snooze reminder', {
        description: 'Something went wrong. Please try again.',
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
  const visibleReminders = (data.reminders ?? []).filter(r => !dismissedReminderIds.has(r.id))

  // Compute the hero client-side from the same optimistic state that drives the
  // unified list, so completing/dismissing the hero item advances it instantly
  // (to the next chore, the next reminder, or all-clear) instead of waiting on
  // the 30s refetch. This also closes the double-submit window: once the hero
  // chore is optimistically completed it is no longer the hero, so its button
  // is gone. The reminder source is the full visible-reminder set (not just the
  // single server hero item), so a reminder still promotes to the hero after all
  // chores are cleared.
  const overdueVisible = visibleChores.filter(c => c.overdue)
  const dueVisible = visibleChores.filter(c => !c.overdue)
  const primaryReminder = visibleReminders[0] ?? null

  let heroType: HeroType
  let heroItem: ChoreItem | HeroReminderItem | null
  if (overdueVisible.length > 0) {
    heroType = 'overdue_chore'
    heroItem = overdueVisible[0]
  } else if (dueVisible.length > 0) {
    heroType = 'due_chore'
    heroItem = dueVisible[0]
  } else if (primaryReminder) {
    heroType = 'reminder'
    heroItem = {
      id: primaryReminder.id,
      title: primaryReminder.title,
      nextRemindAt: primaryReminder.nextRemindAt,
      ownedByUser: primaryReminder.ownedByUser,
    }
  } else {
    heroType = 'all_clear'
    heroItem = null
  }

  // Total still needing attention (chores + reminders), recomputed from the
  // optimistic sets so the count drops the instant an item is actioned.
  const attentionCount = visibleChores.length + visibleReminders.length
  const moreCount = attentionCount > 1 ? attentionCount - 1 : 0

  const heroActionPending =
    completeMutation.isPending ||
    reminderDoneMutation.isPending ||
    reminderSnoozeMutation.isPending

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
          type={heroType}
          item={heroItem}
          onCompleteChore={id => completeMutation.mutate(id)}
          onReminderDone={id => reminderDoneMutation.mutate(id)}
          onReminderSnooze={id => reminderSnoozeMutation.mutate(id)}
          actionDisabled={heroActionPending}
          moreCount={moreCount}
        />

        {/* Unified "Needs attention" list: overdue + due-today chores and due
            reminders together, each with its own inline action. The hero item
            is also shown here (same include-the-primary convention the chore
            list used before), so completing it from either place works. */}
        {attentionCount > 0 && (
          <div style={{
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: `4px solid ${
              visibleChores.some(c => c.overdue)
                ? '#B91C1C'
                : visibleChores.length > 0
                  ? '#F59E0B'
                  : '#06B6D4'
            }`,
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {/* Slab header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Needs attention</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>{attentionCount} to do</span>
            </div>
            {/* Rows: chores first (overdue then due today), then reminders */}
            <div style={{ padding: '6px 16px 14px' }}>
              {visibleChores.map((chore, i) => (
                <motion.div
                  key={`chore-${chore.id}`}
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
                    isLast={i === visibleChores.length - 1 && visibleReminders.length === 0}
                    onComplete={id => completeMutation.mutate(id)}
                  />
                </motion.div>
              ))}
              {visibleReminders.map((reminder, i) => (
                <motion.div
                  key={`reminder-${reminder.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min((visibleChores.length + i) * 0.04, 0.2), duration: 0.15 }}
                >
                  <ReminderRow
                    id={reminder.id}
                    title={reminder.title}
                    frequency={reminder.frequency}
                    ownedByUser={reminder.ownedByUser}
                    completed={dismissedReminderIds.has(reminder.id)}
                    isLast={i === visibleReminders.length - 1}
                    onComplete={id => reminderDoneMutation.mutate(id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Child/member rewards — renders nothing for free households or users
            with no reward goals (hidden via the /api/rewards/child response) */}
        <RewardsWidget />

        <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.08em', margin: 0 }}>
          QUICK LOOK
        </p>
        <SnapshotStrip data={data.snapshot} />
      </motion.div>
    </>
  )
}
