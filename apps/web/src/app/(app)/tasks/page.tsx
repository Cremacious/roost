'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronDown, ChevronUp, Trash2, Pencil, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { SlabCard } from '@/components/ui/SlabCard'
import TaskSheet, { type TaskData } from '@/components/tasks/TaskSheet'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  description: string | null
  assignedTo: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  completedBy: string | null
  completedAt: string | null
  createdBy: string
  createdAt: string
  assigneeName: string | null
  assigneeAvatar: string | null
}

interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

type Filter = 'all' | 'mine' | 'assigned'

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: 'var(--roost-text-muted)',
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

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < todayStart()
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false
  const d = new Date(dueDate)
  return d >= todayStart() && d < tomorrowStart()
}

function dueDateLabel(dueDate: string | null): string {
  if (!dueDate) return ''
  const d = new Date(dueDate)
  const now = todayStart()
  const tom = tomorrowStart()
  if (d < now) return 'Overdue'
  if (d < tom) return 'Due today'
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000)
  if (days === 1) return 'Tomorrow'
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 24 }: { name: string; color: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color ?? '#6B7280',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.4 }}>{initials}</span>
    </div>
  )
}

function SectionHeader({
  label, count, color, collapsed, onToggle,
}: {
  label: string; count: number; color: string; collapsed?: boolean; onToggle?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: onToggle ? 'pointer' : 'default',
        padding: '4px 0', width: '100%',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 800, color: '#fff',
        backgroundColor: color, borderRadius: 20, padding: '1px 7px',
      }}>
        {count}
      </span>
      {onToggle && (
        <span style={{ marginLeft: 'auto', color }}>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      )}
    </button>
  )
}

function TaskRow({
  task,
  currentUserId,
  isAdmin,
  isChild,
  onComplete,
  onUncheck,
  onEdit,
  onDelete,
}: {
  task: Task
  currentUserId: string
  isAdmin: boolean
  isChild: boolean
  onComplete: (id: string) => void
  onUncheck: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const canModify = isAdmin || task.createdBy === currentUserId
  const overdue = isOverdue(task.dueDate)
  const dueLabel = dueDateLabel(task.dueDate)
  const dueLabelColor = overdue
    ? '#EF4444'
    : isDueToday(task.dueDate)
    ? '#F97316'
    : 'var(--roost-text-muted)'

  return (
    <SlabCard
      color={task.completed ? 'var(--roost-border-bottom)' : COLOR}
      style={{ opacity: task.completed ? 0.65 : 1 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 64 }}>
        {/* Complete toggle */}
        {!isChild && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            onClick={() => task.completed ? onUncheck(task.id) : onComplete(task.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            aria-label={task.completed ? 'Uncheck task' : 'Complete task'}
          >
            {task.completed
              ? <CheckCircle2 size={22} color={COLOR} />
              : <Circle size={22} color={`${COLOR}66`} />
            }
          </motion.button>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 15, fontWeight: 700,
            color: task.completed ? 'var(--roost-text-muted)' : 'var(--roost-text-primary)',
            textDecoration: task.completed ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {task.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            {/* Priority badge */}
            <span style={{
              fontSize: 11, fontWeight: 800, color: PRIORITY_COLORS[task.priority],
              textTransform: 'capitalize',
            }}>
              {task.priority}
            </span>
            {/* Due date */}
            {dueLabel && (
              <span style={{ fontSize: 11, fontWeight: 700, color: dueLabelColor }}>
                {dueLabel}
              </span>
            )}
            {/* Assignee */}
            {task.assigneeName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Avatar name={task.assigneeName} color={task.assigneeAvatar} size={16} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                  {task.assigneeName.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {canModify && !isChild && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <motion.button
              whileTap={{ y: 1 }}
              type="button"
              onClick={() => onEdit(task)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                backgroundColor: 'var(--roost-bg)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Edit task"
            >
              <Pencil size={14} color="var(--roost-text-secondary)" />
            </motion.button>
            <motion.button
              whileTap={{ y: 1 }}
              type="button"
              onClick={() => onDelete(task.id)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                backgroundColor: 'var(--roost-bg)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Delete task"
            >
              <Trash2 size={14} color="#EF4444" />
            </motion.button>
          </div>
        )}
      </div>
    </SlabCard>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const qc = useQueryClient()

  const [filter, setFilter] = useState<Filter>('all')
  const [completedCollapsed, setCompletedCollapsed] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: tasksData, isLoading: tasksLoading, isError: tasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const r = await fetch('/api/tasks')
      if (!r.ok) throw new Error('Failed to load tasks')
      return r.json() as Promise<{ tasks: Task[] }>
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  })

  const { data: householdData } = useQuery({
    queryKey: ['household-me'],
    queryFn: async () => {
      const r = await fetch('/api/household/me')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 60_000,
  })

  const members: Member[] = householdData?.members ?? []
  const myRole: string = householdData?.role ?? 'member'
  const isAdmin = myRole === 'admin'
  const isChild = myRole === 'child'

  // ── Mutations ──────────────────────────────────────────────────────────────

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (!r.ok) throw new Error('Failed to complete task')
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData<{ tasks: Task[] }>(['tasks'])
      qc.setQueryData<{ tasks: Task[] }>(['tasks'], old => ({
        tasks: (old?.tasks ?? []).map(t =>
          t.id === id ? { ...t, completed: true, completedBy: currentUserId, completedAt: new Date().toISOString() } : t
        ),
      }))
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev)
      toast.error('Could not complete task', { description: 'Please try again.' })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const uncheckMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: false }),
      })
      if (!r.ok) throw new Error('Failed to uncheck task')
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData<{ tasks: Task[] }>(['tasks'])
      qc.setQueryData<{ tasks: Task[] }>(['tasks'], old => ({
        tasks: (old?.tasks ?? []).map(t =>
          t.id === id ? { ...t, completed: false, completedBy: null, completedAt: null } : t
        ),
      }))
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev)
      toast.error('Could not uncheck task', { description: 'Please try again.' })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete task')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Could not delete task', { description: 'Please try again.' }),
  })

  // ── Filtering + Grouping ───────────────────────────────────────────────────

  const allTasks = tasksData?.tasks ?? []

  const filtered = useMemo(() => {
    if (filter === 'mine') return allTasks.filter(t => !t.completed && (t.createdBy === currentUserId || t.assignedTo === currentUserId))
    if (filter === 'assigned') return allTasks.filter(t => !t.completed && t.assignedTo === currentUserId)
    return allTasks
  }, [allTasks, filter, currentUserId])

  const incomplete = filtered.filter(t => !t.completed)
  const completed = filtered.filter(t => t.completed)

  const overdue = incomplete.filter(t => isOverdue(t.dueDate))
  const dueToday = incomplete.filter(t => !isOverdue(t.dueDate) && isDueToday(t.dueDate))
  const upcoming = incomplete.filter(t => t.dueDate && !isOverdue(t.dueDate) && !isDueToday(t.dueDate))
  const noDueDate = incomplete.filter(t => !t.dueDate)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openNew() {
    setEditTask(null)
    setSheetOpen(true)
  }

  function openEdit(task: Task) {
    setEditTask(task)
    setSheetOpen(true)
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id)
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const filterPills: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'Mine' },
    { key: 'assigned', label: 'Assigned to me' },
  ]

  function renderGroup(tasks: Task[], label: string, color: string, opts?: { collapsed?: boolean; onToggle?: () => void }) {
    if (tasks.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader label={label} count={tasks.length} color={color} {...opts} />
        {!opts?.collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
              >
                <TaskRow
                  task={task}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isChild={isChild}
                  onComplete={id => completeMutation.mutate(id)}
                  onUncheck={id => uncheckMutation.mutate(id)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const hasAny = overdue.length + dueToday.length + upcoming.length + noDueDate.length + completed.length > 0

  // ── Skeleton ───────────────────────────────────────────────────────────────

  if (tasksLoading) {
    return (
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 64, borderRadius: 16,
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: '4px solid var(--roost-border)',
          }} />
        ))}
      </div>
    )
  }

  if (tasksError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, padding: 24 }}>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)', margin: 0 }}>Something went wrong.</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', margin: 0 }}>Could not load tasks. Please refresh.</p>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ padding: '20px 16px 100px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>
              Tasks
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
              {allTasks.filter(t => !t.completed).length} active
            </p>
          </div>
          {!isChild && (
            <motion.button
              whileTap={{ y: 2 }}
              type="button"
              onClick={openNew}
              style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: COLOR, border: 'none',
                borderBottom: `3px solid ${COLOR_DARK}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
              aria-label="Add task"
            >
              <Plus size={20} color="#fff" />
            </motion.button>
          )}
        </div>

        {/* Filter pills */}
        {!isChild && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filterPills.map(p => {
              const active = filter === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setFilter(p.key)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
                    backgroundColor: active ? COLOR : 'var(--roost-surface)',
                    color: active ? '#fff' : 'var(--roost-text-secondary)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Task groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!hasAny && (
            <div style={{
              backgroundColor: 'var(--roost-surface)',
              border: '2px dashed var(--roost-border)',
              borderBottom: '4px dashed var(--roost-border-bottom)',
              borderRadius: 16,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                backgroundColor: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: `4px solid ${COLOR}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={24} color={COLOR} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>Nothing to do.</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
                Either you are incredibly productive, or you just found this screen. Either way, good job.
              </p>
              {!isChild && (
                <motion.button
                  whileTap={{ y: 2 }}
                  type="button"
                  onClick={openNew}
                  style={{
                    marginTop: 8,
                    padding: '11px 20px',
                    borderRadius: 12,
                    border: 'none',
                    borderBottom: `3px solid ${COLOR_DARK}`,
                    backgroundColor: COLOR,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Add a task
                </motion.button>
              )}
            </div>
          )}

          {renderGroup(overdue, 'Overdue', '#EF4444')}
          {renderGroup(dueToday, 'Due today', '#F97316')}
          {renderGroup(upcoming, 'Upcoming', COLOR)}
          {renderGroup(noDueDate, 'No due date', 'var(--roost-text-secondary)')}
          {renderGroup(completed, 'Completed', 'var(--roost-text-muted)', {
            collapsed: completedCollapsed,
            onToggle: () => setCompletedCollapsed(v => !v),
          })}
        </div>
      </motion.div>

      {/* FAB (mobile) */}
      {!isChild && (
        <motion.button
          whileTap={{ y: 2 }}
          type="button"
          onClick={openNew}
          className="md:hidden"
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: COLOR,
            border: 'none',
            borderBottom: `4px solid ${COLOR_DARK}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 40,
          }}
          aria-label="Add task"
        >
          <Plus size={24} color="#fff" />
        </motion.button>
      )}

      {/* Task Sheet */}
      <TaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTask(null) }}
        task={editTask ? {
          id: editTask.id,
          title: editTask.title,
          description: editTask.description,
          assignedTo: editTask.assignedTo,
          dueDate: editTask.dueDate,
          priority: editTask.priority,
        } : null}
        members={members}
        isAdmin={isAdmin}
      />
    </>
  )
}
