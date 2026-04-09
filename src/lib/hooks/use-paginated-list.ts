import { useState, useEffect } from 'react';

interface UsePaginatedListOptions {
  pageSize?: number;
}

interface UsePaginatedListResult<T> {
  visibleItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  visibleCount: number;
  totalCount: number;
}

export function usePaginatedList<T>(
  items: T[],
  { pageSize = 15 }: UsePaginatedListOptions = {}
): UsePaginatedListResult<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  // Reset when the items array identity changes (filter switch, etc.)
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: items.length > visibleCount,
    loadMore: () => setVisibleCount((n) => Math.min(n + pageSize, items.length)),
    reset: () => setVisibleCount(pageSize),
    visibleCount: Math.min(visibleCount, items.length),
    totalCount: items.length,
  };
}
