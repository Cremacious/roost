"use client";

import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";

interface ErrorStateProps {
  onRetry?: () => void;
}

export default function ErrorState({ onRetry }: ErrorStateProps) {
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
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "var(--roost-border)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: "2px solid var(--roost-border-bottom)",
        }}
      >
        <WifiOff className="size-7" style={{ color: "var(--roost-text-muted)" }} />
      </div>

      <div className="max-w-xs space-y-1.5">
        <p
          className="text-base"
          style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
        >
          Something went wrong.
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
        >
          We could not load this page. Check your connection and try again.
        </p>
      </div>

      {onRetry && (
        <motion.button
          type="button"
          onClick={onRetry}
          whileTap={{ y: 2 }}
          className="mt-1 flex h-11 items-center gap-2 rounded-xl px-5 text-sm"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "3px solid var(--roost-border-bottom)",
            color: "var(--roost-text-primary)",
            fontWeight: 800,
          }}
        >
          Try again
        </motion.button>
      )}
    </motion.div>
  );
}
