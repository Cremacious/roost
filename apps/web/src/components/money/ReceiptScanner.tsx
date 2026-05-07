'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, AlertCircle, Loader2, PackageOpen, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { ParsedReceipt } from '@/lib/utils/azureReceipts'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'
const AMBER = '#F59E0B'
const AMBER_DARK = '#C87D00'

type ScanState = 'idle' | 'scanning' | 'error' | 'empty'

interface ReceiptScannerProps {
  onResult: (receipt: ParsedReceipt) => void
  onManual: () => void
  onCancel: () => void
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export function ReceiptScanner({ onResult, onManual, onCancel }: ReceiptScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type', { description: 'Please use a JPG, PNG, WebP, or HEIC image.' })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('File too large', { description: 'Maximum image size is 10 MB.' })
      return
    }

    setState('scanning')
    setErrorMessage('')

    try {
      const imageBase64 = await fileToBase64(file)
      const res = await fetch('/api/expenses/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState('error')
        setErrorMessage(data.error ?? 'Could not read the receipt. Try again or enter items manually.')
        return
      }

      const receipt: ParsedReceipt = data.receipt

      if (data.warning || receipt.lineItems.length === 0) {
        setState('empty')
        return
      }

      onResult(receipt)
    } catch {
      setState('error')
      setErrorMessage('Network error. Check your connection and try again.')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // reset input so selecting the same file again re-fires onChange
    e.target.value = ''
  }

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 800, fontSize: 16,
    cursor: 'pointer', border: 'none',
  }

  return (
    <div style={{ padding: '0 16px 32px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <button
          onClick={onCancel}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--roost-border)',
            borderBottom: '3px solid var(--roost-border-bottom)',
            backgroundColor: 'var(--roost-surface)', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--roost-text-primary)' }} />
        </button>
        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 18, margin: 0 }}>
          Scan receipt
        </p>
      </div>

      {/* IDLE */}
      {state === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 14, marginBottom: 4, textAlign: 'center' }}>
            Take a photo or upload an image of your receipt.
          </p>

          {/* Camera button (mobile) */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            style={{
              ...btnBase,
              backgroundColor: COLOR,
              color: '#fff',
              borderBottom: `3px solid ${COLOR_DARK}`,
            }}
          >
            <Camera size={20} />
            Take photo
          </button>

          {/* File picker button (desktop) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...btnBase,
              backgroundColor: 'var(--roost-surface)',
              color: 'var(--roost-text-primary)',
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border-bottom)',
            }}
          >
            <Upload size={20} />
            Upload image
          </button>

          <button
            onClick={onManual}
            style={{
              marginTop: 4, padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
              backgroundColor: 'transparent', color: 'var(--roost-text-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            Enter items manually
          </button>
        </div>
      )}

      {/* SCANNING */}
      {state === 'scanning' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: '48px 0',
        }}>
          <Loader2 size={40} style={{ color: COLOR }} className="animate-spin" />
          <p style={{ color: 'var(--roost-text-primary)', fontWeight: 700, fontSize: 16, textAlign: 'center' }}>
            Reading your receipt...
          </p>
          <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
            This usually takes a few seconds.
          </p>
        </div>
      )}

      {/* ERROR */}
      {state === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '32px 16px',
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: '4px solid #EF4444',
            borderRadius: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)',
            }}>
              <AlertCircle size={24} style={{ color: '#EF4444' }} />
            </div>
            <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 16, textAlign: 'center', margin: 0 }}>
              Could not read receipt
            </p>
            <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 14, textAlign: 'center', margin: 0 }}>
              {errorMessage}
            </p>
          </div>

          <button
            onClick={() => setState('idle')}
            style={{
              ...btnBase,
              backgroundColor: COLOR,
              color: '#fff',
              borderBottom: `3px solid ${COLOR_DARK}`,
            }}
          >
            Try again
          </button>

          <button
            onClick={onManual}
            style={{
              ...btnBase,
              backgroundColor: 'var(--roost-surface)',
              color: 'var(--roost-text-primary)',
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border-bottom)',
            }}
          >
            Enter manually
          </button>
        </div>
      )}

      {/* EMPTY (amber) */}
      {state === 'empty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '32px 16px',
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: `4px solid ${AMBER}`,
            borderRadius: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(245,158,11,0.1)', border: `1.5px solid rgba(245,158,11,0.3)`,
            }}>
              <PackageOpen size={24} style={{ color: AMBER }} />
            </div>
            <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 16, textAlign: 'center', margin: 0 }}>
              No items detected
            </p>
            <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 14, textAlign: 'center', margin: 0 }}>
              The receipt was read but no line items were found. Try a clearer photo or add items manually.
            </p>
          </div>

          <button
            onClick={onManual}
            style={{
              ...btnBase,
              backgroundColor: AMBER,
              color: '#fff',
              borderBottom: `3px solid ${AMBER_DARK}`,
            }}
          >
            Add items manually
          </button>

          <button
            onClick={() => setState('idle')}
            style={{
              padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
              backgroundColor: 'transparent', color: 'var(--roost-text-muted)',
              border: 'none', cursor: 'pointer', width: '100%',
            }}
          >
            Try another photo
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
    </div>
  )
}
