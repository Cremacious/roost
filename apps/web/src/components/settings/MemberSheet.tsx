'use client'

import { DraggableSheet } from '@/components/shared/DraggableSheet'

export interface SheetMember {
  id: string
  userId: string
  name: string
  email: string | null
  role: string
  avatarColor: string | null
  joinedAt: string | null
  expiresAt?: string | null
}

interface MemberSheetProps {
  member: SheetMember | null
  householdId: string
  onClose: () => void
  onRefetch: () => void
}

export default function MemberSheet({ member, onClose }: MemberSheetProps) {
  if (!member) return null

  return (
    <DraggableSheet open={!!member} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          {member.name}
        </p>
        <p style={{ fontSize: 14, color: 'var(--roost-text-muted)' }}>
          Role: {member.role}
        </p>
      </div>
    </DraggableSheet>
  )
}
