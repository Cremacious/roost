'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { SlabCard } from '@/components/ui/SlabCard'
import NoteSheet, { type NoteData } from '@/components/notes/NoteSheet'

const COLOR = SECTION_COLORS.notes.base
const COLOR_DARK = SECTION_COLORS.notes.dark

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--roost-border)',
  borderBottom: '3px solid var(--roost-border)',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 15,
  fontWeight: 600,
  backgroundColor: 'var(--roost-surface)',
  color: 'var(--roost-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

interface Note extends NoteData {
  createdAt: string
  updatedAt: string
  creatorName: string | null
  creatorAvatar: string | null
}

function detectHtml(content: string) {
  return /<[a-z][\s\S]*>/i.test(content)
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function NoteCard({
  note, canModify, onEdit, onDelete,
}: {
  note: Note; canModify: boolean; onEdit: (note: Note) => void; onDelete: (id: string) => void
}) {
  const isHtml = note.isRichText || detectHtml(note.content)
  const preview = isHtml ? stripHtml(note.content).slice(0, 180) : note.content.slice(0, 180)

  return (
    <SlabCard color={COLOR} style={{ breakInside: 'avoid', marginBottom: 12 }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: note.title ? 6 : 0 }}>
          {note.title && (
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)', flex: 1 }}>
              {note.title}
            </p>
          )}
          {note.isRichText && (
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              color: COLOR,
              backgroundColor: `${COLOR}18`,
              borderRadius: 20,
              padding: '2px 7px',
              flexShrink: 0,
              alignSelf: 'center',
            }}>
              Rich
            </span>
          )}
        </div>
        {preview && (
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)',
            lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {preview}{(isHtml ? stripHtml(note.content) : note.content).length > 180 ? '...' : ''}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
            {note.creatorName?.split(' ')[0] ?? 'Unknown'}
          </span>
          {canModify && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button" onClick={() => onEdit(note)}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Pencil size={13} color="var(--roost-text-secondary)" />
              </button>
              <button
                type="button" onClick={() => onDelete(note.id)}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={13} color="#EF4444" />
              </button>
            </div>
          )}
        </div>
      </div>
    </SlabCard>
  )
}

export default function NotesPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const qc = useQueryClient()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const r = await fetch('/api/notes')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ notes: Note[] }>
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
  const myRole = householdData?.role ?? 'member'
  const isAdmin = myRole === 'admin'
  const isPremium = householdData?.household?.subscriptionStatus === 'premium'

  function handleUpgradeRequired(code: string) {
    setUpgradeCode(code)
    if (code === 'NOTES_LIMIT') {
      toast.error('Note limit reached', {
        description: 'Free accounts are limited to 10 notes. Upgrade to Premium for unlimited notes.',
      })
    } else if (code === 'RICH_TEXT_NOTES_PREMIUM') {
      toast.error('Rich text is a Premium feature', {
        description: 'Upgrade to Premium to use headings, checklists, and formatting in your notes.',
      })
    } else {
      toast.error('Premium required', {
        description: 'Upgrade to Premium to unlock this feature.',
      })
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); toast.success('Note deleted') },
    onError: () => toast.error('Could not delete note', { description: 'Please try again.' }),
  })

  async function handleQuickAdd() {
    if (!quickTitle.trim()) return
    try {
      const r = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickTitle.trim(), content: '' }),
      })
      const data = await r.json()
      if (!r.ok) {
        if (data.code) { handleUpgradeRequired(data.code); return }
        throw new Error(data.error ?? 'Failed')
      }
      qc.invalidateQueries({ queryKey: ['notes'] })
      setQuickTitle('')
      toast.success('Note added')
    } catch (e) {
      toast.error('Could not add note', { description: (e as Error).message })
    }
  }

  const notes = data?.notes ?? []

  if (isLoading) {
    return (
      <div style={{ padding: '20px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 120, borderRadius: 16, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid var(--roost-border)' }} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, padding: 24 }}>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)', margin: 0 }}>Something went wrong.</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', margin: 0 }}>Could not load notes. Please refresh.</p>
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ padding: '20px 16px 100px', maxWidth: 896, margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>Notes</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
          </div>
          <motion.button
            whileTap={{ y: 2 }} type="button"
            onClick={() => { setEditNote(null); setSheetOpen(true) }}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLOR, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Plus size={20} color="#fff" />
          </motion.button>
        </div>

        {/* Quick add */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            style={{ ...INPUT_STYLE, flex: 1 }}
            placeholder="Quick note..."
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
          />
          <motion.button
            whileTap={{ y: 1 }} type="button" onClick={handleQuickAdd}
            style={{ padding: '0 18px', borderRadius: 12, backgroundColor: COLOR, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
          >
            Add
          </motion.button>
        </div>

        {/* Notes masonry grid */}
        {notes.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--roost-surface)', border: '2px dashed var(--roost-border)',
            borderBottom: '4px dashed var(--roost-border-bottom)', borderRadius: 16,
            padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} color={COLOR} />
            </div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>Blank slate.</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
              No notes yet. Write something down before you forget it.
            </p>
            <motion.button
              whileTap={{ y: 2 }} type="button" onClick={() => { setEditNote(null); setSheetOpen(true) }}
              style={{ marginTop: 8, padding: '11px 20px', borderRadius: 12, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
            >
              New note
            </motion.button>
          </div>
        ) : (
          <div style={{ columns: '260px', gap: 12 }}>
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
              >
                <NoteCard
                  note={note}
                  canModify={isAdmin || note.createdBy === currentUserId}
                  onEdit={n => { setEditNote(n); setSheetOpen(true) }}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* FAB */}
      <motion.button
        whileTap={{ y: 2 }} type="button"
        onClick={() => { setEditNote(null); setSheetOpen(true) }}
        className="md:hidden"
        style={{ position: 'fixed', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: COLOR, border: 'none', borderBottom: `4px solid ${COLOR_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 40 }}
      >
        <Plus size={24} color="#fff" />
      </motion.button>

      <NoteSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditNote(null); setUpgradeCode(null) }}
        note={editNote}
        isPremium={isPremium}
        onUpgradeRequired={handleUpgradeRequired}
      />
    </>
  )
}
