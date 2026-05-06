'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#A855F7'  // purple for rewards
const COLOR_DARK = '#7C28C8'

export interface RewardMember {
  userId: string
  name: string
  avatarColor: string | null
}

export interface RewardRule {
  id?: string
  userId: string
  title: string
  periodType: 'week' | 'month' | 'year' | 'custom'
  periodDays: number | null
  thresholdPercent: number
  rewardType: 'money' | 'gift' | 'activity' | 'other'
  rewardDetail: string
  enabled?: boolean
}

interface RewardRuleSheetProps {
  open: boolean
  onClose: () => void
  rule?: RewardRule | null
  children: RewardMember[]
}

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Every week' },
  { value: 'month', label: 'Every month' },
  { value: 'year', label: 'Every year' },
  { value: 'custom', label: 'Custom' },
]

const REWARD_TYPES = [
  { value: 'money', label: 'Money', placeholder: 'e.g. $5 allowance' },
  { value: 'activity', label: 'Activity', placeholder: 'e.g. Trip to the zoo' },
  { value: 'gift', label: 'Gift', placeholder: 'e.g. New book of their choice' },
  { value: 'other', label: 'Other', placeholder: 'Describe the reward' },
]

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: '#374151',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1.5px solid var(--roost-border)',
  borderBottom: '3px solid var(--roost-border-bottom)',
  backgroundColor: 'var(--roost-surface)',
  color: 'var(--roost-text-primary)',
  fontSize: 15,
  fontWeight: 600,
  outline: 'none',
  fontFamily: 'inherit',
}

export default function RewardRuleSheet({ open, onClose, rule, children }: RewardRuleSheetProps) {
  const queryClient = useQueryClient()
  const isEditing = !!rule?.id

  const [childId, setChildId] = useState('')
  const [title, setTitle] = useState('')
  const [periodType, setPeriodType] = useState<'week' | 'month' | 'year' | 'custom'>('week')
  const [periodDays, setPeriodDays] = useState(30)
  const [threshold, setThreshold] = useState(80)
  const [rewardType, setRewardType] = useState<'money' | 'gift' | 'activity' | 'other'>('money')
  const [rewardDetail, setRewardDetail] = useState('')

  useEffect(() => {
    if (open) {
      setChildId(rule?.userId ?? children[0]?.userId ?? '')
      setTitle(rule?.title ?? '')
      setPeriodType(rule?.periodType ?? 'week')
      setPeriodDays(rule?.periodDays ?? 30)
      setThreshold(rule?.thresholdPercent ?? 80)
      setRewardType(rule?.rewardType ?? 'money')
      setRewardDetail(rule?.rewardDetail ?? '')
    }
  }, [open, rule, children])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        userId: childId,
        title: title.trim(),
        periodType,
        periodDays: periodType === 'custom' ? periodDays : null,
        thresholdPercent: threshold,
        rewardType,
        rewardDetail: rewardDetail.trim(),
      }
      const url = isEditing ? `/api/rewards/${rule!.id}` : '/api/rewards'
      const method = isEditing ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to save reward rule')
      }
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      toast.success(isEditing ? 'Reward updated' : 'Reward rule added')
      onClose()
    },
    onError: (err: Error) => {
      toast.error('Could not save reward', { description: err.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/rewards/${rule!.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete reward rule')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      toast.success('Reward rule removed')
      onClose()
    },
    onError: () => {
      toast.error('Could not delete reward', { description: 'Something went wrong. Try again.' })
    },
  })

  function handleSave() {
    if (!childId) {
      toast.error('Select a child', { description: 'Choose who this reward is for.' })
      return
    }
    if (!title.trim()) {
      toast.error('Name required', { description: 'Give this reward a name.' })
      return
    }
    if (!rewardDetail.trim()) {
      toast.error('Reward required', { description: 'Describe what the reward is.' })
      return
    }
    saveMutation.mutate()
  }

  const currentRewardType = REWARD_TYPES.find(t => t.value === rewardType)

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div style={{ padding: '4px 16px 32px' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 20 }}>
          {isEditing ? 'Edit reward' : 'Add reward rule'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Child selector */}
          {!isEditing && children.length > 0 && (
            <div>
              <label style={labelStyle}>For</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={childId}
                onChange={e => setChildId(e.target.value)}
              >
                {children.map(c => (
                  <option key={c.userId} value={c.userId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rule name */}
          <div>
            <label style={labelStyle}>Rule name</label>
            <input
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekly allowance"
            />
          </div>

          {/* Period */}
          <div>
            <label style={labelStyle}>Period</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PERIOD_OPTIONS.map(p => {
                const active = periodType === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPeriodType(p.value as RewardRule['periodType'])}
                    style={{
                      height: 44,
                      borderRadius: 12,
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
                    {p.label}
                  </button>
                )
              })}
            </div>
            {periodType === 'custom' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Every N days</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  style={{ ...inputStyle, width: 120 }}
                  value={periodDays}
                  onChange={e => setPeriodDays(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            )}
          </div>

          {/* Threshold */}
          <div>
            <label style={labelStyle}>
              Completion threshold: <span style={{ color: COLOR }}>{threshold}%</span>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: COLOR }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--roost-text-muted)', fontWeight: 600 }}>10%</span>
              <span style={{ fontSize: 11, color: 'var(--roost-text-muted)', fontWeight: 600 }}>50%</span>
              <span style={{ fontSize: 11, color: 'var(--roost-text-muted)', fontWeight: 600 }}>100%</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--roost-text-muted)', marginTop: 4, fontWeight: 600 }}>
              Complete {threshold}% of assigned chores to earn the reward
            </p>
          </div>

          {/* Reward type */}
          <div>
            <label style={labelStyle}>Reward type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {REWARD_TYPES.map(t => {
                const active = rewardType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setRewardType(t.value as RewardRule['rewardType'])}
                    style={{
                      height: 44,
                      borderRadius: 12,
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
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reward detail */}
          <div>
            <label style={labelStyle}>Reward description</label>
            <input
              style={inputStyle}
              value={rewardDetail}
              onChange={e => setRewardDetail(e.target.value)}
              placeholder={currentRewardType?.placeholder ?? 'Describe the reward'}
            />
          </div>

          {/* Save */}
          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={handleSave}
            disabled={saveMutation.isPending}
            style={{
              height: 52,
              borderRadius: 14,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `4px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: saveMutation.isPending ? 0.7 : 1,
            }}
          >
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Add reward rule'}
          </motion.button>

          {/* Delete */}
          {isEditing && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{
                height: 44,
                borderRadius: 12,
                border: '1.5px solid #FCA5A5',
                borderBottom: '3px solid #FCA5A5',
                backgroundColor: 'transparent',
                color: '#EF4444',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={15} />
              {deleteMutation.isPending ? 'Removing...' : 'Remove reward rule'}
            </button>
          )}
        </div>
      </div>
    </DraggableSheet>
  )
}
