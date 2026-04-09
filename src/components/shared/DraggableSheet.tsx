"use client";

import * as React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DraggableSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  featureColor?: string;
  desktopMaxWidth?: number;
}

export default function DraggableSheet({
  open,
  onOpenChange,
  children,
  featureColor,
  desktopMaxWidth = 680,
}: DraggableSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const dragStartY = React.useRef<number | null>(null);
  const dragCurrentY = React.useRef<number>(0);
  const isDraggingHandle = React.useRef<boolean>(false);

  function onTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    const isHandle = target.closest("[data-drag-handle]");
    if (!isHandle) return;
    isDraggingHandle.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDraggingHandle.current || dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta < 0) return; // prevent dragging up
    dragCurrentY.current = delta;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateX(-50%) translateY(${delta}px)`;
    }
  }

  function onTouchEnd() {
    if (!isDraggingHandle.current) return;
    isDraggingHandle.current = false;
    dragStartY.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.3s ease";
    }
    if (dragCurrentY.current > 120) {
      onOpenChange(false);
      if (sheetRef.current) {
        sheetRef.current.style.transform = "translateX(-50%) translateY(100%)";
      }
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transform = "translateX(-50%) translateY(0)";
      }
    }
    dragCurrentY.current = 0;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          backgroundColor: "var(--roost-surface)",
          borderRadius: "20px 20px 0 0",
          maxHeight: "96dvh",
          overflowY: "auto",
          padding: 0,
          gap: 0,
          maxWidth: desktopMaxWidth,
          width: "100%",
          left: "50%",
          right: "auto",
          transform: "translateX(-50%)",
          border: "none",
          outline: "none",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Handle pill — drag target */}
        <div
          data-drag-handle="true"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingTop: 12,
            paddingBottom: 12,
            cursor: "grab",
            touchAction: "none",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: featureColor ?? "var(--roost-border)",
              opacity: 0.7,
              pointerEvents: "none",
            }}
          />
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}
