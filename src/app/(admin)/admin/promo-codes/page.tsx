'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Infinity as InfinityIcon } from 'lucide-react'

interface PromoCode {
  id: string
  code: string
  durationDays: number
  isLifetime: boolean
  status: 'active' | 'paused' | 'deactivated'
  maxRedemptions: number | null
  redemptionCount: number
  expiresAt: string | null
  createdAt: string
  redemptions: { householdId: string; redeemedAt: string }[]
}

const DURATION_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: '180 days', value: 180 },
  { label: '365 days', value: 365 },
]

export default function AdminPromoCodesPage() {
  const router = useRouter()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [customCode, setCustomCode] = useState('')
  const [duration, setDuration] = useState(30)
  const [isLifetime, setIsLifetime] = useState(false)
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/promo-codes?filter=${filter}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      setCodes(data.promoCodes ?? [])
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        isLifetime,
        durationDays: isLifetime ? 0 : duration,
      }
      if (customCode.trim()) body.code = customCode.trim()
      if (maxRedemptions) body.maxRedemptions = parseInt(maxRedemptions, 10)
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString()

      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to create code')
        return
      }
      setShowCreate(false)
      setCustomCode('')
      setDuration(30)
      setIsLifetime(false)
      setMaxRedemptions('')
      setExpiresAt('')
      fetchCodes()
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(id: string, status: 'active' | 'paused' | 'deactivated') {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { alert('Update failed'); return }
      setCodes(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    } finally {
      setUpdating(null)
    }
  }

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'deactivated', label: 'Deactivated' },
  ]

  function statusColor(status: string) {
    if (status === 'active') return '#22C55E'
    if (status === 'paused') return '#F59E0B'
    return '#64748B'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9', margin: 0 }}>Promo Codes</h1>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{
            padding: '9px 16px', borderRadius: 8,
            border: 'none', backgroundColor: '#6366F1',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {showCreate ? 'Cancel' : '+ New code'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} style={{
          backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 12,
          padding: '20px 24px', marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#F1F5F9', margin: '0 0 16px' }}>Create promo code</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div>
              <label style={labelStyle}>Code (leave blank to auto-generate)</label>
              <input
                type="text"
                value={customCode}
                onChange={e => setCustomCode(e.target.value.toUpperCase())}
                placeholder="e.g. LAUNCH50"
                maxLength={20}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Duration</label>
              <select
                value={isLifetime ? 'lifetime' : String(duration)}
                onChange={e => {
                  if (e.target.value === 'lifetime') { setIsLifetime(true) }
                  else { setIsLifetime(false); setDuration(parseInt(e.target.value, 10)) }
                }}
                style={inputStyle}
                disabled={isLifetime}
              >
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Max redemptions (blank = unlimited)</label>
              <input
                type="number"
                value={maxRedemptions}
                onChange={e => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
                min={1}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Code expires on (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isLifetime}
                  onChange={e => setIsLifetime(e.target.checked)}
                  style={{ accentColor: '#A855F7', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#C4B5FD' }}>Lifetime (never expires)</span>
              </label>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={creating}
              style={{
                padding: '9px 20px', borderRadius: 8,
                border: 'none', backgroundColor: creating ? '#4338CA' : '#6366F1',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {creating ? 'Creating...' : 'Create code'}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid ' + (filter === f.value ? '#6366F1' : '#334155'),
              backgroundColor: filter === f.value ? '#6366F120' : 'transparent',
              color: filter === f.value ? '#818CF8' : '#94A3B8',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#64748B', fontWeight: 700, fontSize: 13 }}>Loading...</p>
        ) : codes.length === 0 ? (
          <p style={{ padding: 24, color: '#64748B', fontWeight: 700, fontSize: 13 }}>No codes found.</p>
        ) : (
          codes.map((c, i) => (
            <div key={c.id} style={{ opacity: c.status === 'deactivated' ? 0.5 : 1 }}>
              <div
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid #243347' : 'none',
                  backgroundColor: expanded === c.id ? '#243347' : 'transparent',
                  cursor: 'pointer',
                  gap: 12,
                }}
              >
                {/* Code + copy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
                    color: c.status === 'deactivated' ? '#475569' : '#F1F5F9',
                    textDecoration: c.status === 'deactivated' ? 'line-through' : 'none',
                  }}>
                    {c.code}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); copyCode(c.code) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
                  >
                    {copied === c.code ? <Check size={13} color="#22C55E" /> : <Copy size={13} />}
                  </button>
                </div>

                {/* Duration */}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', minWidth: 100 }}>
                  {c.isLifetime
                    ? <span style={{ color: '#A855F7', display: 'flex', alignItems: 'center', gap: 4 }}><InfinityIcon size={14} /> Lifetime</span>
                    : `${c.durationDays} days`
                  }
                </span>

                {/* Redemptions */}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', minWidth: 100 }}>
                  {c.redemptionCount} / {c.maxRedemptions ?? 'unlimited'}
                </span>

                {/* Expiry */}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', flex: 1 }}>
                  {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}` : 'No expiry'}
                </span>

                {/* Status badge */}
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  backgroundColor: statusColor(c.status) + '20',
                  color: statusColor(c.status),
                  letterSpacing: '0.05em',
                }}>
                  {c.status.toUpperCase()}
                </span>
              </div>

              {/* Expanded */}
              {expanded === c.id && (
                <div style={{ padding: '12px 16px 14px', backgroundColor: '#1A2537', borderTop: '1px solid #243347' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Actions
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {c.status !== 'active' && (
                      <ActionBtn label="Activate" color="#22C55E" onClick={() => handleStatusChange(c.id, 'active')} disabled={updating === c.id} />
                    )}
                    {c.status === 'active' && (
                      <ActionBtn label="Pause" color="#F59E0B" onClick={() => handleStatusChange(c.id, 'paused')} disabled={updating === c.id} />
                    )}
                    {c.status !== 'deactivated' && (
                      <ActionBtn label="Deactivate" color="#F87171" onClick={() => handleStatusChange(c.id, 'deactivated')} disabled={updating === c.id} />
                    )}
                  </div>
                  {c.redemptions.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Recent redemptions ({c.redemptions.length})
                      </p>
                      {c.redemptions.slice(0, 5).map((r, idx) => (
                        <p key={idx} style={{ fontSize: 12, fontWeight: 600, color: '#64748B', margin: '0 0 2px', fontFamily: 'monospace' }}>
                          {r.householdId} — {new Date(r.redeemedAt).toLocaleDateString()}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 14px', borderRadius: 8,
        border: `1px solid ${color}50`, backgroundColor: color + '15',
        color, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
  color: '#64748B', marginBottom: 6, textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  backgroundColor: '#0F172A',
  border: '1.5px solid #334155',
  borderRadius: 8,
  color: '#F1F5F9',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}
