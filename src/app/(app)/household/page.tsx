'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Copy, Check, Users } from 'lucide-react'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

const SECTION_COLOR = '#3B82F6'
const SECTION_DARK = '#1A5CB5'

interface Member {
  userId: string
  name: string
  avatarColor: string
  role: 'admin' | 'member' | 'guest' | 'child'
  joinedAt: string
}

interface HouseholdData {
  household: { id: string; name: string; code: string }
  role: string
  members: Member[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
  child: 'Child',
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:  { bg: '#FEE2E2', text: '#B91C1C' },
  member: { bg: '#F3F4F6', text: '#374151' },
  guest:  { bg: '#FEF3C7', text: '#92400E' },
  child:  { bg: '#DBEAFE', text: '#1E40AF' },
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{initials}</span>
    </div>
  )
}

function MemberRow({ member, index }: { member: Member; index: number }) {
  const roleStyle = ROLE_COLORS[member.role] ?? ROLE_COLORS.member

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '3px solid var(--roost-border-bottom)',
        borderRadius: 14,
        minHeight: 64,
      }}
    >
      <Avatar name={member.name} color={member.avatarColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.name}
        </p>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: 6,
          backgroundColor: roleStyle.bg,
          color: roleStyle.text,
          flexShrink: 0,
        }}
      >
        {ROLE_LABELS[member.role] ?? member.role}
      </span>
    </motion.div>
  )
}

function InviteCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${SECTION_DARK}`,
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: SECTION_COLOR, letterSpacing: '0.07em', margin: '0 0 4px' }}>
          INVITE CODE
        </p>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 22, color: 'var(--roost-text-primary)', margin: 0, letterSpacing: '0.2em' }}>
          {code}
        </p>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)', margin: '4px 0 0' }}>
          Share this code to invite someone to your household
        </p>
      </div>
      <button
        onClick={handleCopy}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: copied ? '#22C55E' : SECTION_COLOR,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.15s',
        }}
        aria-label="Copy invite code"
      >
        {copied ? <Check size={18} color="#fff" /> : <Copy size={18} color="#fff" />}
      </button>
    </div>
  )
}

export default function HouseholdPage() {
  const { data, isLoading, isError } = useQuery<HouseholdData>({
    queryKey: ['household-members'],
    queryFn: async () => {
      const res = await fetch('/api/household/members')
      if (!res.ok) throw new Error('Failed to load household')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <Skeleton style={{ height: 28, width: 200 }} />
        <SkeletonCard />
        <Skeleton style={{ height: 14, width: 120, marginTop: 8 }} />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}>
          Could not load household. Please refresh.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, margin: '0 auto', width: '100%' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${SECTION_COLOR}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Users size={18} color={SECTION_COLOR} />
        </div>
        <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
          {data.household.name}
        </h1>
      </div>

      {/* Invite code */}
      <InviteCodeCard code={data.household.code} />

      {/* Members */}
      <p style={{ fontSize: 10, fontWeight: 800, color: SECTION_COLOR, letterSpacing: '0.08em', margin: '8px 0 0' }}>
        MEMBERS &middot; {data.members.length}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.members.map((member, i) => (
          <MemberRow key={member.userId} member={member} index={i} />
        ))}
      </div>
    </motion.div>
  )
}
