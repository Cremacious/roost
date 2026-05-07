'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

const Sheet = DialogPrimitive.Root
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ style, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 50,
      ...style,
    }}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'bottom' | 'top' | 'left' | 'right'
  }
>(({ side = 'bottom', style, children, ...props }, ref) => (
  <DialogPrimitive.Content
    ref={ref}
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 51,
      ...style,
    }}
    {...props}
  >
    {children}
  </DialogPrimitive.Content>
))
SheetContent.displayName = 'SheetContent'

export { Sheet, SheetPortal, SheetOverlay, SheetContent }
