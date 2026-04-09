"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

interface DraggableSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Hex color for the handle pill. Defaults to var(--roost-border) gray. */
  featureColor?: string;
  /** Max-width on sm+ breakpoint. Defaults to 680. */
  desktopMaxWidth?: number;
}

/**
 * DraggableSheet — native drag-to-dismiss bottom sheet powered by Vaul.
 * Replaces shadcn Sheet (side="bottom") across the entire app.
 *
 * Mobile:  full-width, slides from bottom, rounded-t-2xl corners.
 * Desktop: centered at desktopMaxWidth (default 680px), same corner radius.
 *
 * A colored handle pill is automatically rendered at the top.
 * Children are responsible for their own inner scroll wrapper when needed.
 */
export default function DraggableSheet({
  open,
  onOpenChange,
  children,
  featureColor,
  desktopMaxWidth = 680,
}: DraggableSheetProps) {
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <DrawerPrimitive.Portal>
        {/* Backdrop */}
        <DrawerPrimitive.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.4)",
          }}
        />

        {/* Sheet content */}
        <DrawerPrimitive.Content
          aria-label="Sheet"
          className="roost-draggable-sheet fixed bottom-0 left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-170 sm:w-full"
          style={
            {
              zIndex: 50,
              backgroundColor: "var(--roost-surface)",
              borderRadius: "20px 20px 0 0",
              maxHeight: "96dvh",
              outline: "none",
              paddingBottom: "env(safe-area-inset-bottom)",
              display: "flex",
              flexDirection: "column",
              /* CSS variable read by the @media rule in globals.css for non-680px sheets */
              "--draggable-sheet-max-width": `${desktopMaxWidth}px`,
            } as React.CSSProperties
          }
        >
          {/* Accessible title (visually hidden — sheets provide their own visible heading) */}
          <DrawerPrimitive.Title className="sr-only">Roost</DrawerPrimitive.Title>

          {/* Colored drag handle pill */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 12,
              paddingBottom: 8,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 99,
                background: featureColor ?? "var(--roost-border)",
                opacity: 0.7,
              }}
            />
          </div>

          {children}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
