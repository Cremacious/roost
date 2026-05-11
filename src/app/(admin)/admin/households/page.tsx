'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Crown } from 'lucide-react'

interface AdminHousehold {
  id: string
  name: string
  inviteCode: string
  subscriptionStatus: string
  premiumExpiresAt: string | null
  createdAt: string
  memberCount: string
  memberEmails: string[] | null
  members: { name: string; email: string; role: string }[] | null
}

export default function AdminHouseholdsPage() {
  const router = useRouter()
  const [households, setHouseholds] = useState<AdminHousehold[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; name: string; status: 'premium' | 'free' } | null>(null)

  const fetchHouseholds = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), filter })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/households?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      setHouseholds(data.households ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, search, filter, router])

  useEffect(() => { fetchHouseholds() }, [fetchHouseholds])
  useEffect(() => { setPage(1) }, [search, filter])

  async function handleSetStatus(id: string, status: 'premium' | 'free') {
    setUpdating(id)
    setConfirm(null)
    try {
      const res = await fetch(`/api/admin/households/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionStatus: status }),
      })
      if (!res.ok) { alert('Update failed'); return }
      setHouseholds(prev =>
        prev.map(h => h.id === id ? { ...h, subscriptionStatus: status } : h)
      )
    } finally {
      setUpdating(null)
    }
  }

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'premium', label: 'Premium' },
    { value: 'free', label: 'Free' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9', margin: '0 0 20px' }}>
        Households <span style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>({total})</span>
      </h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search by name or invite code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 32px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#F1F5F9',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid ' + (filter === f.value ? '#6366F1' : '#334155'),
                backgroundColor: filter === f.value ? '#6366F120' : 'transparent',
                color: filter === f.value ? '#818CF8' : '#94A3B8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#64748B', fontWeight: 700, fontSize: 13 }}>Loading...</p>
        ) : households.length === 0 ? (
          <p style={{ padding: 24, color: '#64748B', fontWeight: 700, fontSize: 13 }}>No households found.</p>
        ) : (
          households.map((h, i) => (
            <div key={h.id}>
              <div
                onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid #243347' : 'none',
                  backgroundColor: expanded === h.id ? '#243347' : 'transparent',
                  cursor: 'pointer',
                  gap: 12,
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, backgroundColor: '#334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {h.subscriptionStatus === 'premium'
                    ? <Crown size={16} color="#F59E0B" />
                    : <span style={{ fontSize: 13, fontWeight: 800, color: '#64748B' }}>{h.name.charAt(0)}</span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>{h.name}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', margin: '1px 0 0', fontFamily: 'monospace' }}>
                    {h.inviteCode}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                    backgroundColor: h.subscriptionStatus === 'premium' ? '#22C55E20' : '#334155',
                    color: h.subscriptionStatus === 'premium' ? '#22C55E' : '#64748B',
                  }}>
                    {h.subscriptionStatus?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                    {h.memberCount} member{parseInt(h.memberCount) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {expanded === h.id && (
                <div style={{ padding: '12px 16px 14px 16px', backgroundColor: '#1A2537', borderTop: '1px solid #243347' }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
                    <InfoField label="Household ID" value={h.id} mono />
                    <InfoField label="Invite Code" value={h.inviteCode} mono />
                    <InfoField label="Created" value={new Date(h.createdAt).toLocaleDateString()} />
                    {h.premiumExpiresAt && (
                      <InfoField label="Premium expires" value={new Date(h.premiumExpiresAt).toLocaleDateString()} />
                    )}
                  </div>

                  {/* Members list */}
                  {h.members && h.members.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Members</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {h.members.map((m, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>{m.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{m.email}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                              backgroundColor: m.role === 'admin' ? '#6366F120' : '#334155',
                              color: m.role === 'admin' ? '#818CF8' : '#64748B',
                            }}>{m.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Premium toggle */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {h.subscriptionStatus !== 'premium' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirm({ id: h.id, name: h.name, status: 'premium' }) }}
                        disabled={updating === h.id}
                        style={{
                          padding: '7px 14px', borderRadius: 8,
                          border: '1px solid #166534', backgroundColor: '#14532D20',
                          color: '#4ADE80', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Set Premium
                      </button>
                    )}
                    {h.subscriptionStatus === 'premium' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirm({ id: h.id, name: h.name, status: 'free' }) }}
                        disabled={updating === h.id}
                        style={{
                          padding: '7px 14px', borderRadius: 8,
                          border: '1px solid #7F1D1D', backgroundColor: '#7F1D1D20',
                          color: '#F87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Set Free
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={paginationBtn(page === 1)}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={paginationBtn(page === totalPages)}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24,
        }}>
          <div style={{
            backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 16,
            padding: '28px', maxWidth: 380, width: '100%',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', margin: '0 0 10px' }}>
              {confirm.status === 'premium' ? 'Grant premium?' : 'Revoke premium?'}
            </h2>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', margin: '0 0 20px' }}>
              {confirm.status === 'premium'
                ? `Set "${confirm.name}" to premium indefinitely (no expiry).`
                : `Revert "${confirm.name}" to the free plan immediately.`
              }
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirm(null)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #334155', backgroundColor: 'transparent', color: '#94A3B8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetStatus(confirm.id, confirm.status)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  backgroundColor: confirm.status === 'premium' ? '#166534' : '#7F1D1D',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', margin: 0, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</p>
    </div>
  )
}

function paginationBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '7px 10px', borderRadius: 8,
    border: '1px solid #334155', backgroundColor: 'transparent',
    color: disabled ? '#334155' : '#94A3B8', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center',
  }
}
