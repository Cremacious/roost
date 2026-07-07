'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, RotateCcw } from 'lucide-react'

export default function AdminDevPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [purging, setPurging] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handlePurge() {
    setPurging(true)
    setError('')
    try {
      const res = await fetch('/api/admin/dev/purge', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Purge failed')
        return
      }
      setShowConfirm(false)
      setDone(true)
    } catch {
      setError('Something went wrong.')
    } finally {
      setPurging(false)
    }
  }

  return (
    <div>
      {/* Dev badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9', margin: 0 }}>Dev Tools</h1>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
          backgroundColor: '#7C3AED20', color: '#A78BFA', letterSpacing: '0.08em',
        }}>
          DEV ONLY
        </span>
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', margin: '0 0 28px' }}>
        These tools are only available when running in development mode and are not accessible in production.
      </p>

      {/* Purge card */}
      <div style={{
        backgroundColor: '#1E293B',
        border: '1px solid #7F1D1D',
        borderRadius: 12,
        padding: '24px',
        maxWidth: 480,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            backgroundColor: '#7F1D1D30',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Trash2 size={20} color="#F87171" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#F1F5F9', margin: '0 0 4px' }}>Purge database</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              Wipes every table in the database and resets all sequences. All users, households, and data will be permanently deleted.
            </p>
          </div>
        </div>

        {done ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: '#14532D20', border: '1px solid #166534',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <RotateCcw size={14} color="#4ADE80" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80', margin: 0 }}>
              Database purged. Starting fresh.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 8,
              border: '1px solid #7F1D1D', backgroundColor: '#7F1D1D20',
              color: '#F87171', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Trash2 size={14} />
            Purge
          </button>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 24,
        }}>
          <div style={{
            backgroundColor: '#1E293B',
            border: '1px solid #7F1D1D',
            borderRadius: 16,
            padding: '28px',
            maxWidth: 420,
            width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                backgroundColor: '#7F1D1D40',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AlertTriangle size={20} color="#F87171" />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px' }}>
                  Wipe entire database?
                </h2>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                  Every user, household, and piece of data will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, fontWeight: 700, color: '#F87171', margin: '0 0 14px' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowConfirm(false); setError('') }}
                disabled={purging}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: '1px solid #334155', backgroundColor: 'transparent',
                  color: '#94A3B8', fontSize: 13, fontWeight: 700,
                  cursor: purging ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                disabled={purging}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  border: 'none', backgroundColor: purging ? '#7F1D1D' : '#DC2626',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: purging ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {purging ? (
                  <>
                    <span style={{
                      width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff', borderRadius: '50%',
                      display: 'inline-block', animation: 'spin 0.7s linear infinite',
                    }} />
                    Purging...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Yes, Wipe Everything
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
