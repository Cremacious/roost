'use client'

import { useRef, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetPortal,
  SheetOverlay,
} from '@/components/ui/sheet'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'

interface DraggableSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  featureColor?: string
  desktopMaxWidth?: number
}

export function DraggableSheet({
  open,
  onOpenChange,
  children,
  featureColor = '#E5E7EB',
  desktopMaxWidth = 680,
}: DraggableSheetProps) {
  const startY = useRef<number | null>(null)
  const isDragging = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const handle = (e.target as HTMLElement).closest('[data-drag-handle]')
    if (!handle) return
    startY.current = e.touches[0].clientY
    isDragging.current = true
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || startY.current === null) return
      const delta = e.changedTouches[0].clientY - startY.current
      if (delta > 120) onOpenChange(false)
      startY.current = null
      isDragging.current = false
    },
    [onOpenChange]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay />
        <SheetContent
          side="bottom"
          onOpenAutoFocus={e => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            left: '50%',
            right: 'auto',
            transform: 'translateX(-50%)',
            maxWidth: desktopMaxWidth,
            width: '100%',
            borderRadius: '20px 20px 0 0',
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: 'none',
            maxHeight: '96dvh',
            overflowY: 'auto',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Sheet</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="flex justify-center pt-3 pb-1" data-drag-handle>
            <div
              className="h-1 w-10 rounded-full"
              style={{ backgroundColor: featureColor }}
            />
          </div>
          {children}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  )
}
