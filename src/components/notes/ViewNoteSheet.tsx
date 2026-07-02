'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { relativeTime } from '@/lib/utils/time'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import RichTextEditor from './RichTextEditor'
import type { NoteData } from './NoteSheet'

const COLOR = SECTION_COLORS.notes.base

interface ViewNote extends NoteData {
  createdAt?: string
  updatedAt?: string
  creatorName?: string | null
}

interface ViewNoteSheetProps {
  open: boolean
  onClose: () => void
  note?: ViewNote | null
  canModify?: boolean
  onEdit?: () => void
  onDelete?: (id: string) => void
}

function detectHtml(content: string) {
  return /<[a-z][\s\S]*>/i.test(content)
}

const ACTION_BTN: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: 'none',
  backgroundColor: 'var(--roost-bg)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

export default function ViewNoteSheet({
  open, onClose, note, canModify, onEdit, onDelete,
}: ViewNoteSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!note) {
    return <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}><div /></DraggableSheet>
  }

  const isHtml = note.isRichText || detectHtml(note.content)
  const hasContent = note.content.trim().length > 0

  return (
    <>
      <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
        <div className="px-4 pb-8">
          {/* Header: title + corner actions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 20, color: 'var(--roost-text-primary)', wordBreak: 'break-word' }}>
                {note.title || 'Untitled note'}
              </p>
              {note.isRichText && (
                <span style={{
                  display: 'inline-block',
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  color: COLOR,
                  backgroundColor: `${COLOR}18`,
                  borderRadius: 20,
                  padding: '2px 7px',
                }}>
                  Rich
                </span>
              )}
            </div>
            {canModify && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" aria-label="Edit note" onClick={() => onEdit?.()} style={ACTION_BTN}>
                  <Pencil size={15} color="var(--roost-text-secondary)" />
                </button>
                <button type="button" aria-label="Delete note" onClick={() => setConfirmOpen(true)} style={ACTION_BTN}>
                  <Trash2 size={15} color="#EF4444" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {hasContent ? (
            isHtml ? (
              <RichTextEditor content={note.content} editable={false} hideToolbar />
            ) : (
              <p style={{
                margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--roost-text-primary)',
                lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {note.content}
              </p>
            )
          ) : (
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
              No content.
            </p>
          )}

          {/* Footer */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--roost-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
              {note.creatorName?.split(' ')[0] ?? 'Unknown'}
            </span>
            {note.updatedAt && (
              <>
                <span style={{ fontSize: 12, color: 'var(--roost-text-muted)' }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                  {relativeTime(note.updatedAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </DraggableSheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              {note.title ? `"${note.title}" will be removed. This cannot be undone.` : 'This note will be removed. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                onDelete?.(note.id)
                onClose()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
