'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'
import { useHideTest } from '@/lib/admin/useHideTest'
import { HideTestToggle } from '@/components/admin/HideTestToggle'
import { InfoField } from '@/components/admin/InfoField'

interface AdminUser {
  id: string
  name: string
  email: string
  isChildAccount: boolean
  createdAt: string
  role: string | null
  householdId: string | null
  householdName: string | null
  subscriptionStatus: string | null
}

interface DeleteInfo {
  user: AdminUser
  isAdmin: boolean
  memberCount: number
  householdName: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { hideTest, setHideTest } = useHideTest()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null)
  const [deleteHousehold, setDeleteHousehold] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), filter })
      if (search) params.set('search', search)
      if (hideTest) params.set('hideTest', 'true')
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, search, filter, hideTest, router])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Reset page on search/filter change
  useEffect(() => { setPage(1) }, [search, filter, hideTest])

  function openDeleteDialog(u: AdminUser) {
    const isAdmin = u.role === 'admin'
    const memberCount = 0 // We'd need a separate API call for exact count; show warning for admins
    setDeleteInfo({ user: u, isAdmin, memberCount, householdName: u.householdName ?? '' })
    setDeleteHousehold(false)
  }

  async function handleDelete() {
    if (!deleteInfo) return
    setDeleting(true)
    try {
      const params = new URLSearchParams()
      if (deleteHousehold) params.set('deleteHousehold', 'true')
      const res = await fetch(`/api/admin/users/${deleteInfo.user.id}?${params}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Delete failed')
        return
      }
      setDeleteInfo(null)
      fetchUsers()
    } finally {
      setDeleting(false)
    }
  }

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'premium', label: 'Premium' },
    { value: 'free', label: 'Free' },
    { value: 'child', label: 'Children' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9', margin: '0 0 20px' }}>
        Users <span style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>({total})</span>
      </h1>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
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
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          <HideTestToggle checked={hideTest} onChange={setHideTest} />
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#64748B', fontWeight: 700, fontSize: 13 }}>Loading...</p>
        ) : users.length === 0 ? (
          <p style={{ padding: 24, color: '#64748B', fontWeight: 700, fontSize: 13 }}>No users found.</p>
        ) : (
          users.map((u, i) => (
            <div key={u.id}>
              <div
                onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid #1E293B' : 'none',
                  backgroundColor: expanded === u.id ? '#243347' : 'transparent',
                  cursor: 'pointer',
                  gap: 12,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', backgroundColor: '#334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#94A3B8', flexShrink: 0,
                }}>
                  {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {u.name}
                    {u.isChildAccount && <Badge label="Child" color="#F59E0B" />}
                    {u.subscriptionStatus === 'premium' && !u.isChildAccount && <Badge label="Premium" color="#22C55E" />}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', margin: '1px 0 0' }}>{u.email}</p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: 0 }}>
                    {u.householdName ?? 'No household'}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#334155', margin: '1px 0 0' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Expanded row */}
              {expanded === u.id && (
                <div style={{ padding: '12px 16px 14px 62px', backgroundColor: '#1A2537', borderTop: '1px solid #243347', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <InfoField label="User ID" value={u.id} mono />
                  <InfoField label="Household ID" value={u.householdId ?? 'None'} mono />
                  <InfoField label="Role" value={u.role ?? 'None'} />
                  <InfoField label="Plan" value={u.subscriptionStatus ?? 'free'} />

                  <button
                    onClick={(e) => { e.stopPropagation(); openDeleteDialog(u) }}
                    style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 12px',
                      backgroundColor: '#7F1D1D20',
                      border: '1px solid #7F1D1D',
                      borderRadius: 8,
                      color: '#F87171',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Trash2 size={13} />
                    Delete user
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={paginationBtn(page === 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={paginationBtn(page === totalPages)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Delete dialog */}
      {deleteInfo && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24,
        }}>
          <div style={{
            backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 16,
            padding: '28px 28px', maxWidth: 440, width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#7F1D1D40', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#F87171" />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', margin: '0 0 4px' }}>Delete user?</h2>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', margin: 0 }}>
                  This will permanently delete <strong style={{ color: '#F1F5F9' }}>{deleteInfo.user.name}</strong> ({deleteInfo.user.email}). This cannot be undone.
                </p>
              </div>
            </div>

            {deleteInfo.isAdmin && deleteInfo.householdName && (
              <div style={{
                backgroundColor: '#451A0320', border: '1px solid #78350F',
                borderRadius: 10, padding: '12px 14px', marginBottom: 16,
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#FCD34D', margin: '0 0 4px' }}>
                  This user is an admin of &ldquo;{deleteInfo.householdName}&rdquo;
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#D97706', margin: 0 }}>
                  Deleting the user without the household will leave it without an admin. Choose below:
                </p>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!deleteHousehold}
                      onChange={() => setDeleteHousehold(false)}
                      style={{ accentColor: '#6366F1' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Delete user only</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>(household stays, no admin)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={deleteHousehold}
                      onChange={() => setDeleteHousehold(true)}
                      style={{ accentColor: '#EF4444' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F87171' }}>Delete user + household</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>(all data wiped)</span>
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteInfo(null)}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: '1px solid #334155', backgroundColor: 'transparent',
                  color: '#94A3B8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: 'none', backgroundColor: deleteHousehold ? '#7F1D1D' : '#991B1B',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {deleting ? 'Deleting...' : deleteHousehold ? 'Delete user + household' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, color, backgroundColor: color + '20',
      padding: '2px 7px', borderRadius: 6, letterSpacing: '0.05em',
    }}>
      {label}
    </span>
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
