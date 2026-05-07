'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

interface Comment {
  id: string
  taskId: string
  userId: string
  body: string
  createdAt: string
  userName: string | null
  userAvatar: string | null
}

interface TaskCommentSheetProps {
  open: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
  currentUserId: string
  isAdmin: boolean
}

function Avatar({ name, color, size = 28 }: { name: string; color: string | null; size?: number }) {
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

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function TaskCommentSheet({
  open, onClose, taskId, taskTitle, currentUserId, isAdmin,
}: TaskCommentSheetProps) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const r = await fetch(`/api/tasks/${taskId}/comments`)
      if (!r.ok) throw new Error('Failed to load comments')
      return r.json() as Promise<{ comments: Comment[] }>
    },
    enabled: open && !!taskId,
    staleTime: 5_000,
    refetchInterval: open ? 10_000 : false,
  })

  const comments = [...(data?.comments ?? [])].reverse()

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, comments.length])

  const addMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to add comment')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-comments', taskId] })
      setBody('')
    },
    onError: (err: Error) => toast.error('Could not send comment', { description: err.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/tasks/comments/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete comment')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-comments', taskId] }),
    onError: () => toast.error('Could not delete comment', { description: 'Please try again.' }),
  })

  function handleSend() {
    if (!body.trim() || addMutation.isPending) return
    addMutation.mutate()
  }

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Comments
        </p>
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
          {taskTitle}
        </p>

        {/* Comment list */}
        <div style={{ minHeight: 120, maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
          {isLoading && (
            <p style={{ textAlign: 'center', color: 'var(--roost-text-muted)', fontSize: 13, fontWeight: 600, padding: '20px 0' }}>
              Loading...
            </p>
          )}
          {!isLoading && comments.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--roost-text-muted)', fontSize: 13, fontWeight: 600, padding: '20px 0' }}>
              No comments yet. Be the first.
            </p>
          )}
          <AnimatePresence initial={false}>
            {comments.map(c => {
              const isOwn = c.userId === currentUserId
              const canDelete = isOwn || isAdmin
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}
                >
                  <Avatar name={c.userName ?? '?'} color={c.userAvatar} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--roost-text-primary)' }}>
                        {c.userName?.split(' ')[0] ?? 'Unknown'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                        {relativeTime(c.createdAt)}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--roost-text-primary)',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      backgroundColor: `${COLOR}10`,
                      borderRadius: '0 10px 10px 10px',
                      padding: '8px 10px',
                    }}>
                      {c.body}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, marginTop: 22 }}
                      aria-label="Delete comment"
                    >
                      <Trash2 size={12} color="var(--roost-text-muted)" />
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        {/* Compose */}
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          backgroundColor: 'var(--roost-bg)',
          borderRadius: 14,
          padding: '8px 12px',
          border: '1.5px solid var(--roost-border)',
        }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Write a comment..."
            rows={2}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--roost-text-primary)',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <motion.button
            whileTap={{ y: 1 }}
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || addMutation.isPending}
            style={{
              width: 32, height: 32, borderRadius: 10,
              border: 'none', borderBottom: `2px solid ${COLOR_DARK}`,
              backgroundColor: body.trim() ? COLOR : 'var(--roost-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: body.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
            aria-label="Send"
          >
            <Send size={14} color="#fff" />
          </motion.button>
        </div>
      </div>
    </DraggableSheet>
  )
}
