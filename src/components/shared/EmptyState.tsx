"use client";

import { type LucideIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  color?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  body,
  buttonLabel,
  onButtonClick,
  color = "var(--roost-text-secondary)",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px dashed var(--roost-border)",
        borderBottom: "4px dashed var(--roost-border-bottom)",
      }}
    >
      {/* Icon box */}
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: `4px solid ${color}`,
        }}
      >
        <Icon className="size-7" style={{ color }} />
      </div>

      {/* Copy */}
      <div className="space-y-1.5 max-w-xs">
        <p
          className="text-base font-800"
          style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
        >
          {title}
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
        >
          {body}
        </p>
      </div>

      {/* Action button */}
      {buttonLabel && onButtonClick && (
        <SlabButton color={color} onClick={onButtonClick}>
          <Plus className="size-4" />
          {buttonLabel}
        </SlabButton>
      )}
    </motion.div>
  );
}

function SlabButton({
  color,
  onClick,
  children,
}: {
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ y: 2 }}
      className="mt-1 flex h-11 items-center gap-2 rounded-xl px-5 text-sm text-white"
      style={{
        backgroundColor: color,
        border: `1.5px solid ${color}`,
        borderBottom: "3px solid rgba(0,0,0,0.2)",
        fontWeight: 800,
      }}
    >
      {children}
    </motion.button>
  );
}
