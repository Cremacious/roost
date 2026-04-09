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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
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
        {/* Handle pill */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: featureColor ?? "var(--roost-border)",
              opacity: 0.7,
            }}
          />
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}
