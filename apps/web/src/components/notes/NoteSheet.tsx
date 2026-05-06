'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'
import RichTextEditor from './RichTextEditor'

const COLOR = SECTION_COLORS.notes.base
const COLOR_DARK = SECTION_COLORS.notes.dark

export interface NoteData {
  id: string
  title: string | null
  content: string
  isRichText: boolean
  createdBy: string
}

interface NoteSheetProps {
  open: boolean
  onClose: () => void
  note?: NoteData | null
  isPremium?: boolean
  onUpgradeRequired?: (code: string) => void
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#374151',
  marginBottom: 6,
  display: 'block',
}

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

export default function NoteSheet({
  open, onClose, note, isPremium, onUpgradeRequired,
}: NoteSheetProps) {
  const qc = useQueryClient()
  const isEditing = !!note?.id

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isRichText, setIsRichText] = useState(false)

  // Debounce timer for rich-text auto-save in view mode
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? '')
      setContent(note?.content ?? '')
      setIsRichText(note?.isRichText ?? false)
    }
  }, [open, note])

  const saveMutation = useMutation({
    mutationFn: async (body: { title: string | null; content: string; isRichText: boolean }) => {
      const url = isEditing ? `/api/notes/${note!.id}` : '/api/notes'
      const method = isEditing ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const data = await r.json()
        const err = new Error(data.error ?? 'Failed') as Error & { code?: string }
        err.code = data.code
        throw err
      }
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      toast.success(isEditing ? 'Note updated' : 'Note saved')
      onClose()
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code && onUpgradeRequired) { onUpgradeRequired(err.code); return }
      toast.error(isEditing ? 'Could not update note' : 'Could not save note', {
        description: err.message,
      })
    },
  })

  function handleSave() {
    if (!title.trim() && !content.trim()) {
      toast.error('Empty note', { description: 'Add a title or some content.' })
      return
    }
    saveMutation.mutate({ title: title.trim() || null, content, isRichText })
  }

  // Auto-save for rich text view mode (debounced 800ms)
  const handleRichTextChange = useCallback((html: string) => {
    setContent(html)
    if (!isEditing) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      if (!html.trim() || html === '<p></p>') return
      saveMutation.mutate({ title: title.trim() || null, content: html, isRichText: true })
    }, 800)
  }, [isEditing, title, saveMutation])

  function handleEnableRichText() {
    if (!isPremium) {
      onUpgradeRequired?.('RICH_TEXT_NOTES_PREMIUM')
      return
    }
    setIsRichText(true)
  }

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          {isEditing ? 'Edit note' : 'New note'}
        </p>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Title</label>
          <input
            style={INPUT_STYLE}
            placeholder="Give it a name"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Content */}
        <div style={{ marginBottom: isRichText ? 12 : 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Note</label>
            {!isRichText && (
              <button
                type="button"
                onClick={handleEnableRichText}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  color: isPremium ? COLOR : 'var(--roost-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {!isPremium && <Lock size={10} />}
                Rich text
                {!isPremium && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: COLOR,
                    backgroundColor: `${COLOR}18`,
                    borderRadius: 20,
                    padding: '1px 6px',
                  }}>
                    Premium
                  </span>
                )}
              </button>
            )}
          </div>

          {isRichText ? (
            <RichTextEditor
              content={content}
              onChange={handleRichTextChange}
              editable={true}
              placeholder="Write whatever you want. Nobody is grading this."
            />
          ) : (
            <textarea
              style={{ ...INPUT_STYLE, minHeight: 160, resize: 'vertical' }}
              placeholder="Write whatever you want. Nobody is grading this."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          )}
        </div>

        {isRichText && isEditing && (
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
            Changes save automatically.
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            border: 'none',
            borderBottom: `3px solid ${COLOR_DARK}`,
            backgroundColor: COLOR,
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: saveMutation.isPending ? 0.7 : 1,
          }}
        >
          {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Save note'}
        </button>
      </div>
    </DraggableSheet>
  )
}
