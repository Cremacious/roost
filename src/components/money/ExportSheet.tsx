'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear,
} from 'date-fns'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'
const LABEL = '#374151'

type ExportFormat = 'csv' | 'pdf'

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

interface QuickRange {
  label: string
  range: () => { from: string; to: string }
}

const QUICK_RANGES: QuickRange[] = [
  { label: 'This month', range: () => { const n = new Date(); return { from: fmt(startOfMonth(n)), to: fmt(endOfMonth(n)) } } },
  { label: 'Last month', range: () => { const n = subMonths(new Date(), 1); return { from: fmt(startOfMonth(n)), to: fmt(endOfMonth(n)) } } },
  { label: 'Last 3 months', range: () => { const n = new Date(); return { from: fmt(startOfMonth(subMonths(n, 2))), to: fmt(endOfMonth(n)) } } },
  { label: 'This year', range: () => { const n = new Date(); return { from: fmt(startOfYear(n)), to: fmt(endOfYear(n)) } } },
]

export function ExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const defaults = useMemo(() => QUICK_RANGES[0].range(), [])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [downloading, setDownloading] = useState(false)

  // Reset to the default range each time the sheet opens.
  useEffect(() => {
    if (open) {
      const d = QUICK_RANGES[0].range()
      setFrom(d.from)
      setTo(d.to)
      setExportFormat('csv')
    }
  }, [open])

  const rangeValid = !!from && !!to && from <= to

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['export-preview', from, to],
    queryFn: () =>
      fetch(`/api/expenses/export/preview?from=${from}&to=${to}`).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json() as Promise<{ count: number; total: number }>
      }),
    enabled: open && rangeValid,
    staleTime: 30_000,
  })

  const activeQuickLabel = QUICK_RANGES.find((q) => {
    const r = q.range()
    return r.from === from && r.to === to
  })?.label

  async function handleDownload() {
    if (!rangeValid) {
      toast.error('Pick a valid date range', { description: 'The start date must be on or before the end date.' })
      return
    }
    setDownloading(true)
    try {
      const res = await fetch(`/api/expenses/export?from=${from}&to=${to}&format=${exportFormat}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error('Could not export expenses', { description: err.error ?? 'Something went wrong. Try again.' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roost-expenses-${from}-${to}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export ready', { description: `Your ${exportFormat.toUpperCase()} download has started.` })
      onClose()
    } catch {
      toast.error('Could not export expenses', { description: 'Network error. Check your connection and try again.' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Export expenses
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
          Download your expense history as a spreadsheet or a printable report.
        </p>

        {/* Quick ranges */}
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Quick range
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {QUICK_RANGES.map((q) => {
            const active = activeQuickLabel === q.label
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => { const r = q.range(); setFrom(r.from); setTo(r.to) }}
                style={{
                  padding: '8px 14px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  backgroundColor: active ? COLOR : 'var(--roost-surface)',
                  color: active ? '#fff' : 'var(--roost-text-secondary)',
                  border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
                  borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                }}
              >
                {q.label}
              </button>
            )
          })}
        </div>

        {/* From / To */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="export-from" style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              From
            </label>
            <input
              id="export-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              style={{
                width: '100%', height: 44, padding: '0 12px', borderRadius: 12, fontFamily: 'inherit', fontSize: 14,
                color: 'var(--roost-text-primary)', backgroundColor: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)', borderBottom: `3px solid ${COLOR}`,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="export-to" style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              To
            </label>
            <input
              id="export-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              style={{
                width: '100%', height: 44, padding: '0 12px', borderRadius: 12, fontFamily: 'inherit', fontSize: 14,
                color: 'var(--roost-text-primary)', backgroundColor: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)', borderBottom: `3px solid ${COLOR}`,
              }}
            />
          </div>
        </div>

        {/* Format toggle */}
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Format
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {([
            { id: 'csv' as const, label: 'CSV', desc: 'Spreadsheet', icon: <FileSpreadsheet size={18} /> },
            { id: 'pdf' as const, label: 'PDF', desc: 'Printable report', icon: <FileText size={18} /> },
          ]).map((opt) => {
            const active = exportFormat === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setExportFormat(opt.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  padding: '14px 16px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  backgroundColor: active ? `${COLOR}12` : 'var(--roost-surface)',
                  border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
                  borderBottom: `4px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                  color: active ? COLOR_DARK : 'var(--roost-text-secondary)',
                }}
              >
                {opt.icon}
                <span style={{ fontSize: 15, fontWeight: 800, color: active ? COLOR_DARK : 'var(--roost-text-primary)' }}>{opt.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>{opt.desc}</span>
              </button>
            )
          })}
        </div>

        {/* Live preview */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '12px 16px', borderRadius: 12, marginBottom: 20,
            backgroundColor: `${COLOR}0F`, border: `1.5px solid ${COLOR}33`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--roost-text-secondary)' }}>
            {!rangeValid ? 'Pick a valid date range' : previewLoading ? 'Calculating...' : `${preview?.count ?? 0} ${preview?.count === 1 ? 'expense' : 'expenses'} in range`}
          </span>
          {rangeValid && !previewLoading && (
            <span style={{ fontSize: 15, fontWeight: 900, color: COLOR_DARK }}>
              ${(preview?.total ?? 0).toFixed(2)}
            </span>
          )}
        </div>

        {/* Download */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !rangeValid}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 50, borderRadius: 14, fontFamily: 'inherit', fontSize: 15, fontWeight: 800,
            backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
            cursor: downloading || !rangeValid ? 'not-allowed' : 'pointer',
            opacity: downloading || !rangeValid ? 0.6 : 1,
          }}
        >
          <Download size={18} />
          {downloading ? 'Preparing...' : `Download ${exportFormat.toUpperCase()}`}
        </button>
      </div>
    </DraggableSheet>
  )
}
