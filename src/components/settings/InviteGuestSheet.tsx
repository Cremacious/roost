'use client'

import { DraggableSheet } from '@/components/shared/DraggableSheet'

interface InviteGuestSheetProps {
  open: boolean
  onClose: () => void
}

export default function InviteGuestSheet({ open, onClose }: InviteGuestSheetProps) {
  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }} featureColor="#F59E0B">
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Invite Guest
        </p>
        <p style={{ fontSize: 14, color: 'var(--roost-text-muted)' }}>
          Guest invite coming soon.
        </p>
      </div>
    </DraggableSheet>
  )
}
