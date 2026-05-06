'use client'

import { DraggableSheet } from '@/components/shared/DraggableSheet'

interface InviteMemberSheetProps {
  open: boolean
  onClose: () => void
}

export default function InviteMemberSheet({ open, onClose }: InviteMemberSheetProps) {
  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Invite Member
        </p>
        <p style={{ fontSize: 14, color: 'var(--roost-text-muted)' }}>
          Member invite coming soon.
        </p>
      </div>
    </DraggableSheet>
  )
}
