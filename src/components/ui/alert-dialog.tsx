'use client'

import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ style, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      backgroundColor: 'rgba(0,0,0,0.5)',
      ...style,
    }}
    {...props}
  />
))
AlertDialogOverlay.displayName = 'AlertDialogOverlay'

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ style, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        backgroundColor: 'var(--roost-surface, #fff)',
        borderRadius: 16,
        padding: 24,
        width: '90vw',
        maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        ...style,
      }}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = 'AlertDialogContent'

function AlertDialogHeader({ style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ marginBottom: 16, ...style }} {...props} />
}

function AlertDialogFooter({ style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 24,
        ...style,
      }}
      {...props}
    />
  )
}

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ style, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    style={{
      fontSize: 18,
      fontWeight: 800,
      color: 'var(--roost-text-primary, #111827)',
      ...style,
    }}
    {...props}
  />
))
AlertDialogTitle.displayName = 'AlertDialogTitle'

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ style, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    style={{
      fontSize: 14,
      color: 'var(--roost-text-secondary, #374151)',
      marginTop: 8,
      ...style,
    }}
    {...props}
  />
))
AlertDialogDescription.displayName = 'AlertDialogDescription'

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ style, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    style={{
      height: 40,
      paddingLeft: 16,
      paddingRight: 16,
      borderRadius: 10,
      border: 'none',
      borderBottom: '3px solid #C93B3B',
      backgroundColor: '#EF4444',
      color: '#fff',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
      ...style,
    }}
    {...props}
  />
))
AlertDialogAction.displayName = 'AlertDialogAction'

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ style, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    style={{
      height: 40,
      paddingLeft: 16,
      paddingRight: 16,
      borderRadius: 10,
      border: '1.5px solid var(--roost-border, #E5E7EB)',
      borderBottom: '3px solid var(--roost-border-bottom, #D1D5DB)',
      backgroundColor: 'var(--roost-surface, #fff)',
      color: 'var(--roost-text-primary, #111827)',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
      ...style,
    }}
    {...props}
  />
))
AlertDialogCancel.displayName = 'AlertDialogCancel'

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
