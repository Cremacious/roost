'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  X,
  Crown,
  AlertTriangle,
  ExternalLink,
  CheckSquare,
  ShoppingBag,
  DollarSign,
  CalendarDays,
  FileText,
  Bell,
  UtensilsCrossed,
  Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { SlabCard } from '@/components/ui/SlabCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { PLAN_LIMITS } from '@/lib/constants/planLimits'

const GREEN = '#22C55E'
const GREEN_DARK = '#159040'

function UsageRow({
  label,
  color,
  count,
  limit,
}: {
  label: string
  color: string
  count: number
  limit: number
}) {
  const pct = limit > 0 ? Math.min((count / limit) * 100, 100) : 0
  const atLimit = count >= limit
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--roost-text-primary)', fontWeight: 700 }}>
          {label}
        </span>
        <span
          className="text-xs"
          style={{ color: atLimit ? color : 'var(--roost-text-muted)', fontWeight: 700 }}
        >
          {count} / {limit} used
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--roost-bg)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

const FEATURE_LIST = [
  { icon: DollarSign, label: 'Bill splitting and expense tracking' },
  { icon: CheckSquare, label: 'Recurring chores and chore history' },
  { icon: ShoppingBag, label: 'Multiple grocery lists' },
  { icon: CalendarDays, label: 'Recurring calendar events' },
  { icon: FileText, label: 'Rich text notes' },
  { icon: Bell, label: 'Recurring reminders for the whole household' },
  { icon: UtensilsCrossed, label: 'Unlimited meal bank and suggestions' },
  { icon: Users, label: 'Rewards system for kids' },
]

function BillingBanner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'canceled'
  message: string
  onDismiss: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-start gap-3 rounded-2xl p-4"
      style={{
        backgroundColor: type === 'success' ? '#F0FDF4' : '#FFFBEB',
        border: `1.5px solid ${type === 'success' ? '#86EFAC' : '#FCD34D'}`,
        borderBottom: `4px solid ${type === 'success' ? GREEN_DARK : '#D97706'}`,
      }}
    >
      {type === 'success' ? (
        <CheckCircle2 size={18} style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />
      ) : (
        <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
      )}
      <p className="flex-1 text-sm" style={{ color: type === 'success' ? '#166534' : '#92400E', fontWeight: 600 }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-6 w-6 items-center justify-center rounded-lg"
        style={{ color: type === 'success' ? '#166534' : '#92400E' }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

function PlanSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-32 rounded-2xl" style={{ backgroundColor: 'var(--roost-border)' }} />
      <div className="h-48 rounded-2xl" style={{ backgroundColor: 'var(--roost-border)' }} />
    </div>
  )
}

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { household, role, isPremium, isCancelled, premiumExpiresAt, stripeSubscriptionId, stripeCustomerId, isLoading } = useHousehold()

  const [showSuccess, setShowSuccess] = useState(searchParams.get('success') === 'true')
  const [showCanceled, setShowCanceled] = useState(searchParams.get('canceled') === 'true')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isPortaling, setIsPortaling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const isAdmin = role === 'admin'

  // Free-tier usage bars: only fetch for free households (premium is unlimited).
  const usageEnabled = !isLoading && !isPremium
  const choresUsage = useQuery({
    queryKey: ['billing-usage', 'chores'],
    queryFn: async () => {
      const r = await fetch('/api/chores')
      if (!r.ok) return { chores: [] }
      return r.json()
    },
    enabled: usageEnabled,
    staleTime: 30_000,
  })
  const membersUsage = useQuery({
    queryKey: ['billing-usage', 'members'],
    queryFn: async () => {
      const r = await fetch('/api/household/members')
      if (!r.ok) return { members: [] }
      return r.json()
    },
    enabled: usageEnabled,
    staleTime: 30_000,
  })
  const listsUsage = useQuery({
    queryKey: ['billing-usage', 'grocery-lists'],
    queryFn: async () => {
      const r = await fetch('/api/grocery/lists')
      if (!r.ok) return { lists: [] }
      return r.json()
    },
    enabled: usageEnabled,
    staleTime: 30_000,
  })
  const remindersUsage = useQuery({
    queryKey: ['billing-usage', 'reminders'],
    queryFn: async () => {
      const r = await fetch('/api/reminders')
      if (!r.ok) return { reminders: [] }
      return r.json()
    },
    enabled: usageEnabled,
    staleTime: 30_000,
  })

  const usageItems = [
    { label: 'Chores', color: '#EF4444', count: choresUsage.data?.chores?.length ?? 0, limit: PLAN_LIMITS.free.chores },
    { label: 'Members', color: '#3B82F6', count: membersUsage.data?.members?.length ?? 0, limit: PLAN_LIMITS.free.members },
    { label: 'Grocery lists', color: '#F59E0B', count: listsUsage.data?.lists?.length ?? 0, limit: PLAN_LIMITS.free.groceryLists },
    {
      label: 'Reminders',
      color: '#06B6D4',
      count: (remindersUsage.data?.reminders ?? []).filter((r: { completed?: boolean }) => !r.completed).length,
      limit: PLAN_LIMITS.free.reminders,
    },
  ]

  async function handleCheckout() {
    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to start checkout')
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      toast.error('Could not start checkout', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
      setIsCheckingOut(false)
    }
  }

  async function handleCancel() {
    setIsCanceling(true)
    setShowCancelConfirm(false)
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to cancel subscription')
      }
      await queryClient.invalidateQueries({ queryKey: ['household'] })
      toast.success('Subscription canceled', {
        description: 'Your premium access will continue until the end of the billing period.',
      })
    } catch (err) {
      toast.error('Could not cancel subscription', {
        description: err instanceof Error ? err.message : 'Please try again or use Manage billing.',
      })
    } finally {
      setIsCanceling(false)
    }
  }

  async function handleReactivate() {
    setIsReactivating(true)
    try {
      const res = await fetch('/api/stripe/reactivate', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to reactivate subscription')
      }
      await queryClient.invalidateQueries({ queryKey: ['household'] })
      toast.success('Subscription reactivated', {
        description: 'Your premium plan will continue without interruption.',
      })
    } catch (err) {
      toast.error('Could not reactivate subscription', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setIsReactivating(false)
    }
  }

  async function handlePortal() {
    setIsPortaling(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to open billing portal')
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      toast.error('Could not open billing portal', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
      setIsPortaling(false)
    }
  }

  const expiryDate = premiumExpiresAt
    ? new Date(premiumExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <PageContainer>
      <div
        className="py-6"
        style={{ maxWidth: 560, margin: '0 auto' }}
      >
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="mb-5 flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--roost-text-secondary)', fontWeight: 700 }}
        >
          <ArrowLeft size={16} />
          Settings
        </button>

        {/* Page heading */}
        <div className="mb-5">
          <h1
            className="text-2xl"
            style={{ color: 'var(--roost-text-primary)', fontWeight: 900, letterSpacing: '-0.5px' }}
          >
            Billing
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}>
            Manage your Roost subscription.
          </p>
        </div>

        {/* Success / canceled banners */}
        {showSuccess && (
          <BillingBanner
            type="success"
            message="Welcome to Roost Premium. Your household is now upgraded."
            onDismiss={() => setShowSuccess(false)}
          />
        )}
        {showCanceled && (
          <BillingBanner
            type="canceled"
            message="Checkout was canceled. Your plan has not changed."
            onDismiss={() => setShowCanceled(false)}
          />
        )}

        {isLoading ? (
          <PlanSkeleton />
        ) : (
          <div className="space-y-4">

            {/* ---- Current plan card ---- */}
            <SlabCard color={isPremium ? GREEN_DARK : 'var(--roost-border-bottom)'}>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: isPremium ? '#DCFCE7' : 'var(--roost-bg)' }}
                    >
                      <Crown size={20} style={{ color: isPremium ? GREEN : 'var(--roost-text-muted)' }} />
                    </div>
                    <div>
                      <p className="text-base" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
                        {isPremium ? 'Premium' : 'Free plan'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}>
                        {isPremium
                          ? isCancelled
                            ? `Access until ${expiryDate}`
                            : 'Active, billed monthly'
                          : 'Limited features'}
                      </p>
                    </div>
                  </div>
                  {isPremium && (
                    <span
                      className="rounded-lg px-2.5 py-1 text-xs text-white"
                      style={{ backgroundColor: GREEN, fontWeight: 700 }}
                    >
                      {isCancelled ? 'Canceling' : 'Active'}
                    </span>
                  )}
                </div>

                {/* Canceling amber warning */}
                {isCancelled && (
                  <div
                    className="mt-4 rounded-xl p-3"
                    style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #FCD34D' }}
                  >
                    <p className="text-sm" style={{ color: '#92400E', fontWeight: 600 }}>
                      Your subscription ends on {expiryDate}. After that, your household will return to the free plan.
                    </p>
                  </div>
                )}

                {/* Admin actions */}
                {isAdmin && (
                  <div className="mt-4 space-y-2">
                    {!isPremium && (
                      <motion.button
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
                        style={{
                          backgroundColor: '#EF4444',
                          border: 'none',
                          borderBottom: '3px solid #C93B3B',
                          borderRadius: 14,
                          fontWeight: 800,
                          opacity: isCheckingOut ? 0.7 : 1,
                        }}
                      >
                        {isCheckingOut ? 'Redirecting...' : 'Upgrade to Premium — $4/mo'}
                      </motion.button>
                    )}

                    {isPremium && isCancelled && (
                      <motion.button
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={handleReactivate}
                        disabled={isReactivating}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
                        style={{
                          backgroundColor: GREEN,
                          border: 'none',
                          borderBottom: `3px solid ${GREEN_DARK}`,
                          borderRadius: 14,
                          fontWeight: 800,
                          opacity: isReactivating ? 0.7 : 1,
                        }}
                      >
                        {isReactivating ? 'Reactivating...' : 'Reactivate plan'}
                      </motion.button>
                    )}

                    {isPremium && !isCancelled && stripeSubscriptionId && (
                      <div className="flex gap-2">
                        <motion.button
                          type="button"
                          whileTap={{ y: 1 }}
                          onClick={handlePortal}
                          disabled={isPortaling}
                          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm"
                          style={{
                            backgroundColor: 'var(--roost-bg)',
                            border: '1.5px solid var(--roost-border)',
                            borderBottom: '3px solid var(--roost-border-bottom)',
                            color: 'var(--roost-text-secondary)',
                            fontWeight: 700,
                            opacity: isPortaling ? 0.7 : 1,
                          }}
                        >
                          <ExternalLink size={14} />
                          {isPortaling ? 'Opening...' : 'Manage billing'}
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ y: 1 }}
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={isCanceling}
                          className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                          style={{
                            backgroundColor: 'var(--roost-bg)',
                            border: '1.5px solid var(--roost-border)',
                            borderBottom: '3px solid var(--roost-border-bottom)',
                            color: '#EF4444',
                            fontWeight: 700,
                            opacity: isCanceling ? 0.7 : 1,
                          }}
                        >
                          {isCanceling ? 'Canceling...' : 'Cancel plan'}
                        </motion.button>
                      </div>
                    )}

                    {isPremium && stripeCustomerId && !stripeSubscriptionId && (
                      <motion.button
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={handlePortal}
                        disabled={isPortaling}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm"
                        style={{
                          backgroundColor: 'var(--roost-bg)',
                          border: '1.5px solid var(--roost-border)',
                          borderBottom: '3px solid var(--roost-border-bottom)',
                          color: 'var(--roost-text-secondary)',
                          fontWeight: 700,
                          opacity: isPortaling ? 0.7 : 1,
                        }}
                      >
                        <ExternalLink size={14} />
                        {isPortaling ? 'Opening...' : 'Manage billing'}
                      </motion.button>
                    )}
                  </div>
                )}

                {!isAdmin && !isPremium && (
                  <p
                    className="mt-3 text-xs"
                    style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
                  >
                    Ask your household admin to upgrade to Premium.
                  </p>
                )}
              </div>
            </SlabCard>

            {/* ---- Free-tier usage ---- */}
            {!isPremium && (
              <SlabCard>
                <div className="p-5">
                  <p
                    className="mb-1 text-sm"
                    style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
                  >
                    Your plan usage
                  </p>
                  <p className="mb-4 text-xs" style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}>
                    Upgrade to Premium to remove these limits.
                  </p>
                  <div className="space-y-4">
                    {usageItems.map((item) => (
                      <UsageRow key={item.label} {...item} />
                    ))}
                  </div>
                </div>
              </SlabCard>
            )}

            {/* ---- Premium features list ---- */}
            <SlabCard>
              <div className="p-5">
                <p
                  className="mb-4 text-sm"
                  style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
                >
                  {isPremium ? 'Your Premium plan includes' : 'Everything in Premium'}
                </p>
                <div className="space-y-3">
                  {FEATURE_LIST.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: '#DCFCE7' }}
                      >
                        <Icon size={15} style={{ color: GREEN_DARK }} />
                      </div>
                      <p className="text-sm" style={{ color: 'var(--roost-text-primary)', fontWeight: 600 }}>
                        {label}
                      </p>
                      {isPremium && (
                        <CheckCircle2 size={15} style={{ color: GREEN, marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                    </div>
                  ))}
                </div>

                {!isPremium && isAdmin && (
                  <p
                    className="mt-4 text-xs"
                    style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
                  >
                    $4/month per household. Cancel anytime. Every household member benefits.
                  </p>
                )}
              </div>
            </SlabCard>

          </div>
        )}

        {/* Cancel confirmation dialog */}
        {showCancelConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full rounded-2xl p-6"
              style={{
                backgroundColor: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: '4px solid var(--roost-border-bottom)',
                maxWidth: 400,
              }}
            >
              <h3
                className="mb-2 text-base"
                style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
              >
                Cancel Premium?
              </h3>
              <p
                className="mb-5 text-sm"
                style={{ color: 'var(--roost-text-secondary)', fontWeight: 600 }}
              >
                Your household keeps Premium until{' '}
                {expiryDate ?? 'the end of the current billing period'}.
                After that, features like expense tracking, receipt scanning, and recurring chores will be locked.
              </p>
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                  style={{
                    backgroundColor: 'var(--roost-bg)',
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: '3px solid var(--roost-border-bottom)',
                    color: 'var(--roost-text-primary)',
                    fontWeight: 700,
                  }}
                >
                  Keep Premium
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={handleCancel}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
                  style={{
                    backgroundColor: '#EF4444',
                    border: 'none',
                    borderBottom: '3px solid #C93B3B',
                    borderRadius: 14,
                    fontWeight: 700,
                  }}
                >
                  Cancel plan
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
