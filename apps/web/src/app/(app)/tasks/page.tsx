'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings2, MessageSquare, UserPlus, CheckCircle2, Circle, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { SlabCard } from '@/components/ui/SlabCard'
import TaskSheet, { type TaskData } from '@/components/tasks/TaskSheet'
import TaskQuickCapture from '@/components/tasks/TaskQuickCapture'
import TaskTabRow, { type TaskTab, type Project } from '@/components/tasks/TaskTabRow'
import ProjectCreateInline from '@/components/tasks/ProjectCreateInline'
import DelegationBanner, { type PendingDelegation } from '@/components/tasks/DelegationBanner'
import SubtaskList, { type Subtask } from '@/components/tasks/SubtaskList'
import DelegationSheet from '@/components/tasks/DelegationSheet'
import TaskCommentSheet from '@/components/tasks/TaskCommentSheet'
import ProjectSettingsSheet from '@/components/tasks/ProjectSettingsSheet'
import { type ParsedTask } from '@/lib/utils/parseTaskInput'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  description: string | null
  assignedTo: string | null
  dueDate: string | null
  dueTime: string | null
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  completedBy: string | null
  completedAt: string | null
  createdBy: string
  createdAt: string
  assigneeName: string | null
  assigneeAvatar: string | null
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  parentTaskId: string | null
  recurring: boolean
  frequency: string | null
  commentCount: number
  subtasks: Subtask[]
}

interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: 'var(--roost-text-muted)',
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function tomorrowStart() {
  const d = todayStart(); d.setDate(d.getDate() + 1); return d
}
function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(`${dueDate.slice(0, 10)}T00:00:00`) < todayStart()
}
function isDueToday(dueDate: string | null) {
  if (!dueDate) return false
  const d = new Date(`${dueDate.slice(0, 10)}T00:00:00`)
  return d >= todayStart() && d < tomorrowStart()
}
function dueDateLabel(dueDate: string | null, dueTime: string | null): string {
  if (!dueDate) return ''
  const d = new Date(`${dueDate.slice(0, 10)}T00:00:00`)
  const now = todayStart()
  const tom = tomorrowStart()
  let base = ''
  if (d < now) base = 'Overdue'
  else if (d < tom) base = 'Today'
  else {
    const days = Math.round((d.getTime() - now.getTime()) / 86_400_000)
    if (days === 1) base = 'Tomorrow'
    else if (days < 7) base = d.toLocaleDateString('en-US', { weekday: 'short' })
    else base = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return dueTime ? `${base} at ${dueTime}` : base
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, color, size = 24 }: { name: string; color: string | null; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
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
}: { label: string; count: number; color: string; collapsed?: boolean; onToggle?: () => void }) {
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
      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', backgroundColor: color, borderRadius: 20, padding: '1px 7px' }}>
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
  task, currentUserId, isAdmin, isChild,
  onComplete, onUncheck, onEdit, onDelete, onDelegate, onComment,
}: {
  task: Task
  currentUserId: string
  isAdmin: boolean
  isChild: boolean
  onComplete: (id: string) => void
  onUncheck: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onDelegate: (task: Task) => void
  onComment: (task: Task) => void
}) {
  const canModify = isAdmin || task.createdBy === currentUserId
  const overdue = isOverdue(task.dueDate)
  const dueLabel = dueDateLabel(task.dueDate, task.dueTime)
  const dueLabelColor = overdue ? '#EF4444' : isDueToday(task.dueDate) ? '#F97316' : 'var(--roost-text-muted)'
  const [expanded, setExpanded] = useState(false)
  const hasSubtasks = task.subtasks.length > 0

  const projectColor = task.projectColor ?? COLOR

  return (
    <SlabCard color={task.completed ? 'var(--roost-border-bottom)' : projectColor} style={{ opacity: task.completed ? 0.65 : 1 }}>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {task.projectName && !task.completed && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: projectColor, flexShrink: 0,
                }} />
              )}
              {task.recurring && !task.completed && (
                <span style={{ fontSize: 10, color: 'var(--roost-text-muted)', flexShrink: 0 }}>
                  ↻
                </span>
              )}
              <p style={{
                margin: 0, fontSize: 15, fontWeight: 700,
                color: task.completed ? 'var(--roost-text-muted)' : 'var(--roost-text-primary)',
                textDecoration: task.completed ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {task.title}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: PRIORITY_COLORS[task.priority], textTransform: 'capitalize' }}>
                {task.priority}
              </span>
              {dueLabel && (
                <span style={{ fontSize: 11, fontWeight: 700, color: dueLabelColor }}>{dueLabel}</span>
              )}
              {task.assigneeName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Avatar name={task.assigneeName} color={task.assigneeAvatar} size={14} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                    {task.assigneeName.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isChild && (
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {/* Comments */}
              <motion.button
                whileTap={{ y: 1 }}
                type="button"
                onClick={() => onComment(task)}
                style={{
                  minWidth: 32, height: 32, borderRadius: 9, border: 'none',
                  backgroundColor: 'var(--roost-bg)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, paddingInline: 6,
                }}
                aria-label="Comments"
              >
                <MessageSquare size={13} color="var(--roost-text-secondary)" />
                {task.commentCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--roost-text-muted)' }}>
                    {task.commentCount}
                  </span>
                )}
              </motion.button>

              {/* Delegate (non-children, non-completed) */}
              {canModify && !task.completed && (
                <motion.button
                  whileTap={{ y: 1 }}
                  type="button"
                  onClick={() => onDelegate(task)}
                  style={{
                    width: 32, height: 32, borderRadius: 9, border: 'none',
                    backgroundColor: 'var(--roost-bg)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  aria-label="Delegate task"
                >
                  <UserPlus size={13} color="var(--roost-text-secondary)" />
                </motion.button>
              )}

              {canModify && (
                <>
                  <motion.button
                    whileTap={{ y: 1 }}
                    type="button"
                    onClick={() => onEdit(task)}
                    style={{
                      width: 32, height: 32, borderRadius: 9, border: 'none',
                      backgroundColor: 'var(--roost-bg)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label="Edit task"
                  >
                    <Pencil size={13} color="var(--roost-text-secondary)" />
                  </motion.button>
                  <motion.button
                    whileTap={{ y: 1 }}
                    type="button"
                    onClick={() => onDelete(task.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 9, border: 'none',
                      backgroundColor: 'var(--roost-bg)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label="Delete task"
                  >
                    <Trash2 size={13} color="#EF4444" />
                  </motion.button>
                </>
              )}

              {/* Subtasks toggle */}
              {(hasSubtasks || !task.completed) && (
                <motion.button
                  whileTap={{ y: 1 }}
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  style={{
                    width: 32, height: 32, borderRadius: 9, border: 'none',
                    backgroundColor: 'var(--roost-bg)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  aria-label="Subtasks"
                >
                  {expanded ? <ChevronUp size={13} color={COLOR} /> : <ChevronDown size={13} color="var(--roost-text-secondary)" />}
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              style={{ marginTop: 8 }}
            >
              <SubtaskList
                parentTaskId={task.id}
                subtasks={task.subtasks}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isChild={isChild}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SlabCard>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<TaskTab>('all')
  const [completedCollapsed, setCompletedCollapsed] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [delegateTask, setDelegateTask] = useState<Task | null>(null)
  const [commentTask, setCommentTask] = useState<Task | null>(null)
  const [projectSettingsTarget, setProjectSettingsTarget] = useState<Project | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: tasksData, isLoading: tasksLoading, isError: tasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const r = await fetch('/api/tasks')
      if (!r.ok) throw new Error('Failed to load tasks')
      return r.json() as Promise<{ tasks: Task[]; pendingDelegations: PendingDelegation[] }>
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const r = await fetch('/api/tasks/projects')
      if (!r.ok) throw new Error('Failed to load projects')
      return r.json() as Promise<{ projects: Project[] }>
    },
    staleTime: 30_000,
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
  const isPremium: boolean = householdData?.household?.subscriptionStatus === 'premium'

  const allTasks = (tasksData?.tasks ?? []).filter(t => !t.parentTaskId)
  const pendingDelegations: PendingDelegation[] = tasksData?.pendingDelegations ?? []
  const projects: Project[] = projectsData?.projects ?? []

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
      const prev = qc.getQueryData(['tasks'])
      qc.setQueryData<{ tasks: Task[]; pendingDelegations: PendingDelegation[] }>(['tasks'], old => ({
        ...old!,
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
      const prev = qc.getQueryData(['tasks'])
      qc.setQueryData<{ tasks: Task[]; pendingDelegations: PendingDelegation[] }>(['tasks'], old => ({
        ...old!,
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

  // ── Quick capture ──────────────────────────────────────────────────────────

  async function handleQuickCapture(parsed: ParsedTask) {
    const body: Record<string, unknown> = {
      title: parsed.title,
      priority: parsed.priority ?? 'medium',
      dueDate: parsed.dueDate ?? null,
      dueTime: parsed.dueTime ?? null,
    }
    if (activeTab !== 'all' && activeTab !== 'today' && activeTab !== 'new') {
      body.projectId = activeTab
    }
    const r = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const data = await r.json()
      throw new Error(data.error ?? 'Failed to create task')
    }
    qc.invalidateQueries({ queryKey: ['tasks'] })
  }

  // ── Tab management ─────────────────────────────────────────────────────────

  function handleTabChange(tab: TaskTab) {
    if (tab === 'new') return
    setActiveTab(tab)
  }

  function handleTabNew() {
    setActiveTab('new')
  }

  // ── Filtering + Grouping ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let tasks = allTasks
    if (activeTab === 'today') {
      tasks = tasks.filter(t => isDueToday(t.dueDate) || (isOverdue(t.dueDate) && !t.completed))
    } else if (activeTab !== 'all') {
      tasks = tasks.filter(t => t.projectId === activeTab)
    }
    return tasks
  }, [allTasks, activeTab])

  const todayCount = allTasks.filter(t => !t.completed && (isDueToday(t.dueDate) || isOverdue(t.dueDate))).length

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

  const hasAny = overdue.length + dueToday.length + upcoming.length + noDueDate.length + completed.length > 0

  // ── Active project ─────────────────────────────────────────────────────────

  const activeProject = projects.find(p => p.id === activeTab) ?? null

  // ── Render ─────────────────────────────────────────────────────────────────

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
                  onDelete={id => deleteMutation.mutate(id)}
                  onDelegate={t => setDelegateTask(t)}
                  onComment={t => setCommentTask(t)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ padding: '20px 16px 100px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>
                Tasks
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                {allTasks.filter(t => !t.completed).length} active
              </p>
            </div>
          </div>

          {/* Project settings button */}
          {activeProject && isAdmin && (
            <motion.button
              whileTap={{ y: 1 }}
              type="button"
              onClick={() => setProjectSettingsTarget(activeProject)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--roost-border)',
                backgroundColor: 'var(--roost-surface)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Project settings"
            >
              <Settings2 size={16} color={activeProject.color} />
            </motion.button>
          )}
        </div>

        {/* Tab row */}
        {!isChild && (
          <TaskTabRow
            activeTab={activeTab === 'new' ? 'new' : activeTab}
            onTabChange={(tab) => {
              if (tab === 'new') handleTabNew()
              else handleTabChange(tab)
            }}
            projects={projects}
            todayCount={todayCount}
          />
        )}

        {/* Project create inline */}
        <AnimatePresence>
          {activeTab === 'new' && !isChild && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ProjectCreateInline
                onCreated={(project) => setActiveTab(project.id)}
                onCancel={() => setActiveTab('all')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delegation banner */}
        {pendingDelegations.length > 0 && (
          <DelegationBanner delegations={pendingDelegations} />
        )}

        {/* Quick capture */}
        {!isChild && activeTab !== 'new' && (
          <TaskQuickCapture
            onAdd={handleQuickCapture}
            color={COLOR}
            colorDark={COLOR_DARK}
          />
        )}

        {/* Task groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!hasAny && activeTab !== 'new' && (
            <div style={{
              backgroundColor: 'var(--roost-surface)',
              border: '2px dashed var(--roost-border)',
              borderBottom: '4px dashed var(--roost-border-bottom)',
              borderRadius: 16,
              padding: '32px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
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
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>
                {activeTab === 'today' ? 'All clear for today.' : 'Nothing to do.'}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
                {activeTab === 'today'
                  ? 'No tasks due today. Enjoy the peace.'
                  : 'Either you are incredibly productive, or you just found this screen. Either way, good job.'}
              </p>
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

      {/* Sheets */}
      <TaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTask(null) }}
        task={editTask ? {
          id: editTask.id,
          title: editTask.title,
          description: editTask.description,
          assignedTo: editTask.assignedTo,
          dueDate: editTask.dueDate,
          dueTime: editTask.dueTime,
          priority: editTask.priority,
          projectId: editTask.projectId,
          recurring: editTask.recurring,
          frequency: editTask.frequency,
          repeatEndType: null,
          repeatUntil: null,
          repeatOccurrences: null,
        } : null}
        members={members}
        projects={projects}
        isAdmin={isAdmin}
        isPremium={isPremium}
      />

      <DelegationSheet
        open={!!delegateTask}
        onClose={() => setDelegateTask(null)}
        taskId={delegateTask?.id ?? ''}
        taskTitle={delegateTask?.title ?? ''}
        currentUserId={currentUserId}
        members={members}
      />

      <TaskCommentSheet
        open={!!commentTask}
        onClose={() => setCommentTask(null)}
        taskId={commentTask?.id ?? ''}
        taskTitle={commentTask?.title ?? ''}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />

      {projectSettingsTarget && (
        <ProjectSettingsSheet
          open={!!projectSettingsTarget}
          onClose={() => setProjectSettingsTarget(null)}
          project={projectSettingsTarget}
          isAdmin={isAdmin}
          onDeleted={() => setActiveTab('all')}
        />
      )}
    </>
  )
}
