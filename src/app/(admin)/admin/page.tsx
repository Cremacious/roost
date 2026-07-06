'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useHideTest } from '@/lib/admin/useHideTest'
import { HideTestToggle } from '@/components/admin/HideTestToggle'

interface Stats {
  totalUsers: number
  totalHouseholds: number
  premiumHouseholds: number
  freeHouseholds: number
  signupsOverTime: { date: string; count: number }[]
  conversionsOverTime: { date: string; count: number }[]
}

function StatCard({ label, value, color = '#6366F1' }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      backgroundColor: '#1E293B',
      border: '1px solid #334155',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#64748B', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 900, color, margin: 0 }}>{value}</p>
    </div>
  )
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const { hideTest, setHideTest } = useHideTest()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/stats?hideTest=${hideTest}`)
      .then(r => {
        if (r.status === 401) { router.push('/admin/login'); return null }
        if (!r.ok) throw new Error('Failed to load stats')
        return r.json()
      })
      .then(data => { if (!cancelled && data) { setStats(data); setError('') } })
      .catch(() => { if (!cancelled) setError('Failed to load stats') })
    return () => { cancelled = true }
  }, [router, hideTest])

  const conversionRate = stats && stats.totalHouseholds > 0
    ? ((stats.premiumHouseholds / stats.totalHouseholds) * 100).toFixed(1)
    : '0.0'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9', margin: 0 }}>Overview</h1>
        <HideTestToggle checked={hideTest} onChange={setHideTest} />
      </div>

      {error ? (
        <p style={{ color: '#F87171', fontWeight: 700 }}>{error}</p>
      ) : !stats ? (
        <p style={{ color: '#64748B', fontWeight: 700 }}>Loading...</p>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Households" value={stats.totalHouseholds} />
        <StatCard label="Premium" value={stats.premiumHouseholds} color="#22C55E" />
        <StatCard label="Conversion" value={`${conversionRate}%`} color="#F59E0B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ChartCard title="Signups (90 days)" data={stats.signupsOverTime} color="#6366F1" />
        <ChartCard title="Premium conversions (90 days)" data={stats.conversionsOverTime} color="#22C55E" />
      </div>
      </>
      )}
    </div>
  )
}

function ChartCard({ title, data, color }: { title: string; data: { date: string; count: number }[]; color: string }) {
  return (
    <div style={{
      backgroundColor: '#1E293B',
      border: '1px solid #334155',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', margin: '0 0 16px' }}>{title}</p>
      {data.length === 0 ? (
        <p style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 11 }}
              tickFormatter={d => d?.slice(5) ?? d}
            />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94A3B8' }}
              itemStyle={{ color: color }}
            />
            <Area type="monotone" dataKey="count" stroke={color} fill={`${color}22`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
