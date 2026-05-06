'use client'

import { DraggableSheet } from '@/components/shared/DraggableSheet'

interface AddChildSheetProps {
  open: boolean
  onClose: () => void
}

export default function AddChildSheet({ open, onClose }: AddChildSheetProps) {
  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Add Child Account
        </p>
        <p style={{ fontSize: 14, color: 'var(--roost-text-muted)' }}>
          Child account creation coming soon.
        </p>
      </div>
    </DraggableSheet>
  )
}
