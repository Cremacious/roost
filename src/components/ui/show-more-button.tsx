'use client';

import { motion } from 'framer-motion';

interface ShowMoreButtonProps {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
  pageSize?: number;
  color?: string;
}

export function ShowMoreButton({
  visibleCount,
  totalCount,
  onLoadMore,
  pageSize = 15,
  color = 'var(--roost-text-muted)',
}: ShowMoreButtonProps) {
  if (visibleCount >= totalCount) return null;
  const remaining = totalCount - visibleCount;
  const nextBatch = Math.min(pageSize, remaining);

  return (
    <div className="flex flex-col items-center gap-1 pt-2">
      <p className="text-xs" style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}>
        Showing {visibleCount} of {totalCount}
      </p>
      <motion.button
        type="button"
        onClick={onLoadMore}
        whileTap={{ y: 1 }}
        className="flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm"
        style={{
          backgroundColor: color + '15',
          border: `1.5px solid ${color}40`,
          borderBottom: `3px solid ${color}60`,
          color: color,
          fontWeight: 700,
        }}
      >
        + Show {nextBatch} more
      </motion.button>
    </div>
  );
}
