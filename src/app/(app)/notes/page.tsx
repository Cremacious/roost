'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, FileText, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { SlabCard } from '@/components/ui/SlabCard'
import NoteSheet, { type NoteData } from '@/components/notes/NoteSheet'
import ViewNoteSheet from '@/components/notes/ViewNoteSheet'
import PremiumGate from '@/components/shared/PremiumGate'
import PageIntroModal from '@/components/shared/PageIntroModal'
import { PAGE_INTROS } from '@/lib/constants/pageIntros'

const COLOR = SECTION_COLORS.notes.base
const COLOR_DARK = SECTION_COLORS.notes.dark

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--roost-border)',
  borderBottom: '3px solid var(--roost-border-bottom)',
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
  return html
    // Block-level and line breaks become spaces so text does not run together.
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function NoteCard({
  note, onView,
}: {
  note: Note; onView: (note: Note) => void
}) {
  const isHtml = note.isRichText || detectHtml(note.content)
  const preview = isHtml ? stripHtml(note.content).slice(0, 180) : note.content.slice(0, 180)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(note)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(note) } }}
      style={{ cursor: 'pointer', height: 184 }}
    >
      <SlabCard color={COLOR} style={{ height: '100%' }}>
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: note.title ? 6 : 0 }}>
            {note.title && (
              <p style={{
                margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)', flex: 1,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word',
              }}>
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
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {preview && (
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)',
                lineHeight: 1.5, wordBreak: 'break-word',
                display: '-webkit-box', WebkitLineClamp: note.title ? 3 : 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {preview}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
              {note.creatorName?.split(' ')[0] ?? 'Unknown'}
            </span>
          </div>
        </div>
      </SlabCard>
    </div>
  )
}

export default function NotesPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const qc = useQueryClient()

  const { allowed: canAddNote, onBlocked: onBlockedAddNote } = usePermissionGate('notes.add')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const r = await fetch('/api/notes')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ notes: Note[] }>
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
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
  const isPremium = householdData?.household?.subscription_status === 'premium'

  function handleUpgradeRequired(code: string) {
    setUpgradeCode(code)
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
      <div style={{ padding: '20px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 184, borderRadius: 16, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid var(--roost-border)' }} />
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
      <PageIntroModal {...PAGE_INTROS.notes} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="roost-page"
        style={{ padding: '20px 16px 100px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 className="roost-page-title" style={{ margin: 0, fontWeight: 900, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>Notes</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{notes.length} active</p>
          </div>
          <motion.button
            whileTap={{ y: 2 }} type="button"
            aria-disabled={!canAddNote}
            onClick={canAddNote ? () => { setEditNote(null); setSheetOpen(true) } : onBlockedAddNote}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLOR, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canAddNote ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canAddNote ? 1 : 0.55 }}
          >
            {canAddNote ? <Plus size={20} color="#fff" /> : <Lock size={20} color="#fff" />}
          </motion.button>
        </div>

        {/* Quick add */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            style={{ ...INPUT_STYLE, flex: 1 }}
            placeholder="Quick note..."
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { if (canAddNote) { handleQuickAdd() } else { onBlockedAddNote() } } }}
          />
          <motion.button
            whileTap={{ y: 1 }} type="button"
            aria-disabled={!canAddNote}
            onClick={canAddNote ? handleQuickAdd : onBlockedAddNote}
            style={{ padding: '0 18px', borderRadius: 12, backgroundColor: COLOR, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, color: '#fff', fontWeight: 800, fontSize: 14, cursor: canAddNote ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: canAddNote ? 1 : 0.55, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {canAddNote ? null : <Lock size={14} color="#fff" />}
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
              whileTap={{ y: 2 }} type="button"
              aria-disabled={!canAddNote}
              onClick={canAddNote ? () => { setEditNote(null); setSheetOpen(true) } : onBlockedAddNote}
              style={{ marginTop: 8, padding: '11px 20px', borderRadius: 12, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: canAddNote ? 'pointer' : 'not-allowed', opacity: canAddNote ? 1 : 0.55, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {canAddNote ? null : <Lock size={14} color="#fff" />}
              New Note
            </motion.button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, alignItems: 'start' }}>
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
                whileHover={{ y: -2 }}
                whileTap={{ y: 1 }}
              >
                <NoteCard note={note} onView={n => setViewNote(n)} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <ViewNoteSheet
        open={!!viewNote}
        onClose={() => setViewNote(null)}
        note={viewNote}
        canModify={!!viewNote && (isAdmin || viewNote.createdBy === currentUserId)}
        onEdit={() => { if (viewNote) { setEditNote(viewNote); setViewNote(null); setSheetOpen(true) } }}
        onDelete={id => deleteMutation.mutate(id)}
      />

      <NoteSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditNote(null); setUpgradeCode(null) }}
        note={editNote}
        isPremium={isPremium}
        onUpgradeRequired={handleUpgradeRequired}
      />

      {!!upgradeCode && (
        <PremiumGate feature="notes" trigger="sheet" onClose={() => setUpgradeCode(null)} />
      )}
    </>
  )
}
