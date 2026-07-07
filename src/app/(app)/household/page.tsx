'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Baby, Settings2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
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
import MemberSheet, { type SheetMember } from '@/components/settings/MemberSheet'
import InviteMemberSheet from '@/components/settings/InviteMemberSheet'
import AddChildSheet from '@/components/settings/AddChildSheet'
import MemberAvatar from '@/components/shared/MemberAvatar'
import { PageContainer } from '@/components/layout/PageContainer'

// ─── Design tokens ────────────────────────────────────────────────────────────

const HERO_BG   = '#EF4444'
const HERO_DARK = '#C93B3B'
const SLAB_BOTTOM = '#1A5CB5'

const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  admin:  { bg: '#FEE2E2', text: '#B91C1C', label: 'Admin' },
  member: { bg: '#DBEAFE', text: '#1E40AF', label: 'Member' },
  guest:  { bg: '#FEF3C7', text: '#92400E', label: 'Guest' },
  child:  { bg: '#EDE9FE', text: '#6D28D9', label: 'Child' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface HouseholdData {
  household: { id: string; name: string; code: string }
  role: string
  members: SheetMember[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guestExpiryLabel(expiresAt?: string | null): string | null {
  if (!expiresAt) return null
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Access expired'
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.member
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 800,
      padding: '2px 8px',
      borderRadius: 6,
      backgroundColor: s.bg,
      color: s.text,
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ─── Member row ─────────────────────────────────────────────────────────────
// Defined at module scope (not inside HouseholdPage) so its component identity
// is stable across page re-renders. A component defined inside the page would
// get a new identity every render, forcing React to remount every row and
// replay the enter animation, which looked like the members list "reloading".

function MemberRow({
  member,
  index,
  currentUserId,
  isAdmin,
  onGear,
  onRemove,
}: {
  member: SheetMember
  index: number
  currentUserId: string
  isAdmin: boolean
  onGear: (m: SheetMember) => void
  onRemove: (m: SheetMember) => void
}) {
  const isSelf     = member.userId === currentUserId
  const isAdminRow = member.role === 'admin'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid var(--roost-border)',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <MemberAvatar name={member.name} avatarColor={member.avatarColor} size="md" />
        {isAdminRow && (
          <div style={{
            position: 'absolute',
            top: -5,
            right: -3,
            width: 14,
            height: 14,
            background: '#F59E0B',
            borderRadius: '50%',
            border: '2px solid var(--roost-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="white" stroke="none" width={7} height={7}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.name}
          </span>
          {isSelf && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
              You
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--roost-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.email ?? (member.role === 'child' ? 'No account, child profile' : '')}
        </div>
        {member.role === 'guest' && guestExpiryLabel(member.expiresAt) && (
          <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', marginTop: 1 }}>
            {guestExpiryLabel(member.expiresAt)}
          </div>
        )}
      </div>

      {/* Right: badge + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <RoleBadge role={member.role} />

        {/* Gear button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => onGear(member)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '2px solid var(--roost-border-bottom)',
              background: 'var(--roost-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label={`Edit ${member.name}`}
          >
            <Settings2 size={13} color="var(--roost-text-muted)" />
          </button>
        )}

        {/* Remove button (admin only, not self, not other admins) */}
        {isAdmin && !isSelf && !isAdminRow && (
          <button
            onClick={() => onRemove(member)}
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              border: '1.5px solid #FEE2E2',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label={`Remove ${member.name}`}
          >
            <X size={11} color="#B91C1C" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HouseholdPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentUserId = session?.user?.id ?? ''

  const [inviteOpen, setInviteOpen]         = useState(false)
  const [addChildOpen, setAddChildOpen]     = useState(false)
  const [removeTarget, setRemoveTarget]     = useState<SheetMember | null>(null)
  const [removing, setRemoving]         = useState(false)
  const [gearMember, setGearMember]     = useState<SheetMember | null>(null)
  const [codeCopied, setCodeCopied]     = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<HouseholdData>({
    queryKey: ['household-members'],
    queryFn: async () => {
      const r = await fetch('/api/household/members')
      if (!r.ok) throw new Error('Failed to load household')
      return r.json()
    },
    staleTime: 10_000,
  })

  const isAdmin  = data?.role === 'admin'
  const members  = data?.members ?? []
  const household = data?.household

  // Counts for the overview card
  const counts = members.reduce(
    (acc, m) => {
      if (m.role === 'admin')  acc.admins++
      else if (m.role === 'member') acc.members++
      else if (m.role === 'child')  acc.children++
      else if (m.role === 'guest')  acc.guests++
      return acc
    },
    { admins: 0, members: 0, children: 0, guests: 0 }
  )

  async function handleCopyCode() {
    if (!household?.code) return
    try {
      await navigator.clipboard.writeText(household.code)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
      toast.success('Code copied')
    } catch {
      toast.error('Could not copy code', { description: 'Try copying it manually.' })
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/household/members/${removeTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to remove member')
      }
      toast.success(`${removeTarget.name} removed from household`)
      queryClient.invalidateQueries({ queryKey: ['household-members'] })
      setRemoveTarget(null)
    } catch (err) {
      toast.error('Could not remove member', { description: (err as Error).message })
    } finally {
      setRemoving(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="roost-page" style={{ padding: 16 }}>
        <div style={{ height: 120, background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${HERO_DARK}`, borderRadius: 16, marginBottom: 14, opacity: 0.5 }} />
        <div style={{ height: 200, background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${SLAB_BOTTOM}`, borderRadius: 16, opacity: 0.4 }} />
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

  // ── Hero card ──────────────────────────────────────────────────────────────

  const HeroCard = (
    <div style={{
      background: HERO_BG,
      border: `1.5px solid ${HERO_DARK}`,
      borderBottom: `4px solid ${HERO_DARK}`,
      borderRadius: 16,
      padding: '18px 16px',
      marginBottom: 14,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, position: 'relative' }}>
        Your household
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 10, position: 'relative' }}>
        {household?.name}
      </div>
      {/* Code row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <button
          type="button"
          onClick={handleCopyCode}
          aria-label="Copy household code"
          style={{
            fontFamily: "ui-monospace,'JetBrains Mono',monospace",
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '0.18em',
            background: codeCopied ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: 10,
            padding: '8px 14px',
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {household?.code}
        </button>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', marginTop: 8, position: 'relative' }}>
        {codeCopied ? 'Copied to clipboard' : 'Tap the code to copy, then share it to invite someone'}
      </div>
    </div>
  )

  // ── Desktop hero (horizontal layout) ──────────────────────────────────────

  const HeroCardDesktop = (
    <div style={{
      background: HERO_BG,
      border: `1.5px solid ${HERO_DARK}`,
      borderBottom: `4px solid ${HERO_DARK}`,
      borderRadius: 16,
      padding: '20px 20px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Left: name + meta */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          Your household
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 2 }}>
          {household?.name}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </div>
      </div>

      {/* Right: code */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          House code
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy household code"
            style={{
              fontFamily: "ui-monospace,'JetBrains Mono',monospace",
              fontSize: 24,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.18em',
              background: codeCopied ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 10,
              padding: '9px 16px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {household?.code}
          </button>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', marginTop: 6 }}>
          {codeCopied ? 'Copied to clipboard' : 'Tap the code to copy, then share to let someone join'}
        </div>
      </div>
    </div>
  )

  // ── Invite row ─────────────────────────────────────────────────────────────

  const InviteRow = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--roost-border)' }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '2px dashed var(--roost-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <UserPlus size={16} color="var(--roost-text-muted)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-muted)' }}>Invite someone</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--roost-border-bottom)' }}>Share code or send a link</div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setInviteOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 9,
              background: '#EF4444',
              border: '1.5px solid #EF4444',
              borderBottom: '2px solid #C93B3B',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 900,
              color: '#fff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <UserPlus size={11} color="#fff" />
            Invite member
          </button>
        )}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '2px dashed #DDD6FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Baby size={16} color="#A78BFA" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#6D28D9' }}>Add a child account</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#A78BFA' }}>PIN-based, no email needed</div>
          </div>
          <button
            onClick={() => setAddChildOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 9,
              background: '#EDE9FE',
              border: '1.5px solid #DDD6FE',
              borderBottom: '2px solid #A78BFA',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 900,
              color: '#6D28D9',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Baby size={11} color="#6D28D9" />
            Add child
          </button>
        </div>
      )}
    </>
  )

  // ── Members slab ───────────────────────────────────────────────────────────

  const MembersSlab = (
    <div style={{
      background: 'var(--roost-surface)',
      border: '1.5px solid var(--roost-border)',
      borderBottom: `4px solid ${SLAB_BOTTOM}`,
      borderRadius: 16,
      marginBottom: 14,
      overflow: 'hidden',
    }}>
      {/* Slab header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Members</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>{members.length} {members.length === 1 ? 'person' : 'people'}</span>
      </div>

      {/* Slab body */}
      <div style={{ padding: '6px 16px 14px' }}>
        {members.map((m, i) => (
          <MemberRow
            key={m.userId}
            member={m}
            index={i}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onGear={setGearMember}
            onRemove={setRemoveTarget}
          />
        ))}
        {InviteRow}
      </div>
    </div>
  )

  // ── Desktop right sidebar ──────────────────────────────────────────────────

  const OverviewCard = (
    <div style={{
      background: 'var(--roost-surface)',
      border: '1.5px solid var(--roost-border)',
      borderBottom: `4px solid ${SLAB_BOTTOM}`,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        Household overview
      </div>
      {[
        { key: 'Total members', val: members.length, green: false },
        { key: 'Admins',  val: counts.admins,   green: true },
        { key: 'Members', val: counts.members,  green: false },
        { key: 'Children', val: counts.children, green: false },
        ...(counts.guests > 0 ? [{ key: 'Guests', val: counts.guests, green: false }] : []),
      ].map(row => (
        <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-secondary)' }}>{row.key}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: row.green ? '#15803D' : 'var(--roost-text-primary)' }}>{row.val}</span>
        </div>
      ))}
    </div>
  )

  const RolesCard = (
    <div style={{
      background: 'var(--roost-surface)',
      border: '1.5px solid var(--roost-border)',
      borderBottom: `4px solid ${SLAB_BOTTOM}`,
      borderRadius: 14,
      padding: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        Roles explained
      </div>
      {[
        { role: 'admin',  desc: 'Full access: manage members, bills, settings' },
        { role: 'member', desc: 'Shared household access with per-person overrides available' },
        { role: 'child',  desc: 'Restricted access by default, with per-person overrides available' },
      ].map(({ role, desc }) => (
        <div key={role} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <RoleBadge role={role} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{desc}</div>
        </div>
      ))}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)', lineHeight: 1.5, marginTop: 4 }}>
        Admins always keep full access. Member and child permissions can be overridden per person from member settings.
      </div>
    </div>
  )

  // ── Page header (mobile inline, desktop header) ────────────────────────────

  const PageHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--roost-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
          Household
        </h1>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', margin: 0 }}>
          Members and settings
        </p>
      </div>
      {isAdmin && (
        <button
          onClick={() => setInviteOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 13px',
            borderRadius: 10,
            background: '#EF4444',
            border: '1.5px solid #EF4444',
            borderBottom: '3px solid #C93B3B',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 800,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <UserPlus size={13} color="#fff" />
          Invite member
        </button>
      )}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <PageContainer>
        {/* Mobile layout */}
        <div className="md:hidden" style={{ padding: '14px 14px 80px' }}>
          {PageHeader}
          {HeroCard}
          {MembersSlab}
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block" style={{ padding: '16px 20px 32px' }}>
          {/* Desktop page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--roost-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
                Household
              </h1>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', margin: '1px 0 0' }}>
                Members and settings
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setInviteOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 13px',
                  borderRadius: 10,
                  background: '#EF4444',
                  border: '1.5px solid #EF4444',
                  borderBottom: '3px solid #C93B3B',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={13} color="#fff" />
                Invite member
              </button>
            )}
          </div>

          {/* Desktop hero (horizontal) */}
          {HeroCardDesktop}

          {/* Two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, alignItems: 'start' }}>
            {/* Left: members slab */}
            <div>
              {MembersSlab}
            </div>

            {/* Right: overview + roles cards */}
            <div>
              {OverviewCard}
              {RolesCard}
            </div>
          </div>
        </div>
      </PageContainer>

      {/* ── Invite sheet ──────────────────────────────────────────────────────── */}
      <InviteMemberSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        householdName={household?.name ?? ''}
        householdCode={household?.code ?? ''}
      />

      {/* ── Add child sheet ───────────────────────────────────────────────────── */}
      <AddChildSheet
        open={addChildOpen}
        onClose={() => setAddChildOpen(false)}
      />

      {/* ── Member settings sheet (gear icon) ─────────────────────────────────── */}
      <MemberSheet
        member={gearMember}
        householdId={household?.id ?? ''}
        onClose={() => setGearMember(null)}
        onRefetch={() => {
          queryClient.invalidateQueries({ queryKey: ['household-members'] })
          refetch()
        }}
      />

      {/* ── Remove member AlertDialog ──────────────────────────────────────────── */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v) => { if (!v) setRemoveTarget(null) }}>
        <AlertDialogContent style={{
          background: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '4px solid #B91C1C',
          borderRadius: 16,
        }}>
          <AlertDialogHeader>
            {/* Icon */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#FEE2E2',
              border: '1.5px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <UserPlus size={22} color="#EF4444" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <AlertDialogTitle style={{ color: 'var(--roost-text-primary)', fontWeight: 900 }}>
              Remove {removeTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--roost-text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
              {removeTarget?.name} will lose access to {household?.name}. Their expenses and chore history will remain. They can rejoin with the house code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ flexDirection: 'column', gap: 8 }}>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              style={{
                background: '#EF4444',
                border: '1.5px solid #EF4444',
                borderBottom: '3px solid #B91C1C',
                borderRadius: 11,
                color: '#fff',
                fontWeight: 900,
                fontSize: 13,
                padding: '11px 16px',
                cursor: removing ? 'default' : 'pointer',
                opacity: removing ? 0.7 : 1,
                width: '100%',
              }}
            >
              {removing ? 'Removing...' : 'Remove from household'}
            </AlertDialogAction>
            <AlertDialogCancel
              style={{
                background: 'var(--roost-bg)',
                border: 'none',
                borderRadius: 11,
                color: 'var(--roost-text-secondary)',
                fontWeight: 700,
                fontSize: 13,
                padding: '9px 16px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Keep them
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
