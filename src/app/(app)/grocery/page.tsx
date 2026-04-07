'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Lock,
  Loader2,
  MoreHorizontal,
  Plus,
  ShoppingCart,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { SECTION_COLORS } from '@/lib/constants/colors';
import { relativeTime } from '@/lib/utils/time';
import MemberAvatar from '@/components/shared/MemberAvatar';
import ErrorState from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import GroceryItemSheet from '@/components/grocery/GroceryItemSheet';
import GroceryListSheet, {
  type GroceryListData,
} from '@/components/grocery/GroceryListSheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import UpgradePrompt from '@/components/shared/UpgradePrompt';

const COLOR = SECTION_COLORS.grocery; // #F59E0B
const COLOR_DARK = '#C87D00';

// ---- Types ------------------------------------------------------------------

interface GroceryListSummary {
  id: string;
  name: string;
  is_default: boolean;
  item_count: number;
}

interface ListsResponse {
  lists: GroceryListSummary[];
  isPremium: boolean;
  isAdmin: boolean;
}

interface GroceryItemFull {
  id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  added_by: string;
  added_by_name: string | null;
  added_by_avatar: string | null;
  checked_by: string | null;
  checked_by_name: string | null;
  checked_by_avatar: string | null;
  checked_at: string | null;
  created_at: string | null;
}

interface ItemsResponse {
  items: GroceryItemFull[];
}

// ---- Helpers ----------------------------------------------------------------

function firstName(name: string | null): string {
  if (!name) return 'Someone';
  return name.split(' ')[0];
}

// ---- Item row ---------------------------------------------------------------

function ItemRow({
  item,
  onCheck,
  onEdit,
  onDelete,
}: {
  item: GroceryItemFull;
  onCheck: (id: string, checked: boolean) => void;
  onEdit: (item: GroceryItemFull) => void;
  onDelete: (id: string) => void;
}) {
  const addedMeta = item.added_by_name
    ? `Added by ${firstName(item.added_by_name)}${item.created_at ? ` · ${relativeTime(item.created_at)}` : ''}`
    : null;

  const checkedMeta = item.checked_by_name
    ? `Checked by ${firstName(item.checked_by_name)}${item.checked_at ? ` · ${relativeTime(item.checked_at)}` : ''}`
    : null;

  return (
    <div
      className="group flex min-h-16 items-center gap-2 rounded-2xl px-3"
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '4px solid #C87D00',
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onCheck(item.id, !item.checked)}
        className="flex h-12 w-12 shrink-0 items-center justify-center"
        aria-label={item.checked ? 'Uncheck item' : 'Check item'}
      >
        {item.checked ? (
          <motion.div
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: COLOR }}
          >
            <Check className="size-3.5 text-white" strokeWidth={3} />
          </motion.div>
        ) : (
          <div
            className="h-6 w-6 rounded-md border-2"
            style={{ borderColor: COLOR + '70' }}
          />
        )}
      </button>

      {/* Content */}
      <div
        className="min-w-0 flex-1 cursor-pointer py-2.5"
        onClick={() => onEdit(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onEdit(item)}
      >
        {/* Name + quantity */}
        <p
          className="truncate text-sm"
          style={{
            color: 'var(--roost-text-primary)',
            fontWeight: 700,
            textDecoration: item.checked ? 'line-through' : undefined,
            opacity: item.checked ? 0.5 : 1,
          }}
        >
          {item.name}
        </p>
        {item.quantity && (
          <p
            className="mt-0.5 truncate text-xs"
            style={{
              color: 'var(--roost-text-muted)',
              fontWeight: 600,
              opacity: item.checked ? 0.5 : 1,
            }}
          >
            {item.quantity}
          </p>
        )}

        {/* Unchecked: added by + time */}
        {!item.checked && addedMeta && (
          <div className="mt-1 flex items-center gap-1.5">
            {item.added_by_name && (
              <MemberAvatar
                name={item.added_by_name}
                avatarColor={item.added_by_avatar}
                size="sm"
              />
            )}
            <span
              className="text-xs"
              style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
            >
              {addedMeta}
            </span>
          </div>
        )}

        {/* Checked: added by on left, checked by on right */}
        {item.checked && (addedMeta || checkedMeta) && (
          <div className="mt-1 flex items-center justify-between gap-2">
            {addedMeta && item.added_by_name ? (
              <div className="flex min-w-0 items-center gap-1">
                <MemberAvatar
                  name={item.added_by_name}
                  avatarColor={item.added_by_avatar}
                  size="sm"
                />
                <span
                  className="truncate text-xs"
                  style={{
                    color: 'var(--roost-text-muted)',
                    fontWeight: 600,
                    opacity: 0.7,
                  }}
                >
                  {addedMeta}
                </span>
              </div>
            ) : (
              <span />
            )}
            {checkedMeta && item.checked_by_name ? (
              <div className="flex shrink-0 items-center gap-1">
                <MemberAvatar
                  name={item.checked_by_name}
                  avatarColor={item.checked_by_avatar}
                  size="sm"
                />
                <span
                  className="text-xs"
                  style={{
                    color: 'var(--roost-text-muted)',
                    fontWeight: 600,
                    opacity: 0.7,
                  }}
                >
                  {checkedMeta}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100"
        style={{ color: 'var(--roost-text-muted)' }}
        aria-label="Remove item"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// ---- More menu --------------------------------------------------------------

function MoreMenu({
  list,
  isAdmin,
  onRename,
  onClear,
  onDelete,
}: {
  list: GroceryListSummary;
  isAdmin: boolean;
  onRename: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function action(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: open ? 'var(--roost-border)' : 'transparent',
          color: 'var(--roost-text-secondary)',
        }}
      >
        <MoreHorizontal className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full z-50 mt-1 min-w-48 overflow-hidden rounded-2xl py-1"
            style={{
              backgroundColor: 'var(--roost-surface)',
              border: '1.5px solid var(--roost-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            {!list.is_default && (
              <button
                type="button"
                onClick={() => action(onRename)}
                className="flex h-11 w-full items-center px-4 text-sm"
                style={{ color: 'var(--roost-text-primary)', fontWeight: 600 }}
              >
                Rename list
              </button>
            )}
            <button
              type="button"
              onClick={() => action(onClear)}
              className="flex h-11 w-full items-center px-4 text-sm"
              style={{ color: 'var(--roost-text-primary)', fontWeight: 600 }}
            >
              Clear checked items
            </button>
            {!list.is_default && isAdmin && (
              <button
                type="button"
                onClick={() => action(onDelete)}
                className="flex h-11 w-full items-center px-4 text-sm"
                style={{ color: '#EF4444', fontWeight: 600 }}
              >
                Delete list
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function GroceryPage() {
  const queryClient = useQueryClient();
  const quickAddRef = useRef<HTMLInputElement>(null);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showChecked, setShowChecked] = useState(true);
  const [editingItem, setEditingItem] = useState<GroceryItemFull | null>(null);
  const [showItemSheet, setShowItemSheet] = useState(false);
  const [showListSheet, setShowListSheet] = useState(false);
  const [listToEdit, setListToEdit] = useState<GroceryListData | null>(null);
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);

  const PLACEHOLDERS = ['Add milk...', 'Add eggs...', 'Add anything...'];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // ---- Queries ---------------------------------------------------------------

  const listsQuery = useQuery<ListsResponse>({
    queryKey: ['grocery-lists'],
    queryFn: async () => {
      const r = await fetch('/api/grocery/lists');
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to load lists');
      }
      return r.json();
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const lists = listsQuery.data?.lists ?? [];
  const isPremium = listsQuery.data?.isPremium ?? false;
  const isAdmin = listsQuery.data?.isAdmin ?? false;

  const activeListId = selectedListId ?? lists[0]?.id ?? null;

  const itemsQuery = useQuery<ItemsResponse>({
    queryKey: ['grocery-items', activeListId],
    queryFn: async () => {
      const r = await fetch(`/api/grocery/lists/${activeListId}/items`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to load items');
      }
      return r.json();
    },
    enabled: !!activeListId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const items = itemsQuery.data?.items ?? [];
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const activeList = lists.find((l) => l.id === activeListId);

  // ---- Mutations -------------------------------------------------------------

  const addItemMutation = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/grocery/lists/${activeListId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? 'Failed to add item');
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
      setNewItemName('');
      quickAddRef.current?.focus();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkMutation = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      fetch(`/api/grocery/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? 'Failed to update item');
        }
        return r.json();
      }),
    onMutate: async ({ itemId, checked }) => {
      await queryClient.cancelQueries({
        queryKey: ['grocery-items', activeListId],
      });
      const previous = queryClient.getQueryData<ItemsResponse>([
        'grocery-items',
        activeListId,
      ]);
      queryClient.setQueryData<ItemsResponse>(
        ['grocery-items', activeListId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    checked,
                    checked_at: checked ? new Date().toISOString() : null,
                  }
                : item,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['grocery-items', activeListId], ctx.previous);
      }
      toast.error('Could not update item', {
        description: 'Something went wrong. Try again.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      fetch(`/api/grocery/items/${itemId}`, { method: 'DELETE' }).then(
        async (r) => {
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error ?? 'Failed to remove item');
          }
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearCheckedMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/grocery/lists/${activeListId}/clear`, {
        method: 'POST',
      }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? 'Failed to clear items');
        }
        return r.json() as Promise<{ cleared: number }>;
      }),
    onSuccess: ({ cleared }) => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
      toast.success(
        cleared > 0
          ? `Cleared ${cleared} item${cleared === 1 ? '' : 's'}`
          : 'Nothing to clear',
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteListMutation = useMutation({
    mutationFn: (listId: string) =>
      fetch(`/api/grocery/lists/${listId}`, { method: 'DELETE' }).then(
        async (r) => {
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error ?? 'Failed to delete list');
          }
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
      // Switch to first remaining list
      const remaining = lists.filter((l) => l.id !== activeListId);
      setSelectedListId(remaining[0]?.id ?? null);
      toast.success('List deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Handlers --------------------------------------------------------------

  function handleQuickAdd() {
    if (!newItemName.trim() || !activeListId) return;
    addItemMutation.mutate(newItemName.trim());
  }

  function openEditItem(item: GroceryItemFull) {
    setEditingItem(item);
    setShowItemSheet(true);
  }

  function openAddItem() {
    setEditingItem(null);
    setShowItemSheet(true);
  }

  function openAddList() {
    setListToEdit(null);
    setShowListSheet(true);
  }

  function openRenameList() {
    if (!activeList) return;
    setListToEdit(activeList);
    setShowListSheet(true);
  }

  const handleCheck = useCallback(
    (itemId: string, checked: boolean) => {
      checkMutation.mutate({ itemId, checked });
    },
    [checkMutation],
  );

  const handleDelete = useCallback(
    (itemId: string) => {
      deleteItemMutation.mutate(itemId);
    },
    [deleteItemMutation],
  );

  // ---- Render ----------------------------------------------------------------

  if (listsQuery.isLoading) {
    return (
      <div
        className="py-4 pb-28 md:py-6"
        style={{ backgroundColor: 'var(--roost-bg)' }}
      >
        <PageContainer className="flex flex-col gap-4">
          <Skeleton className="h-9 w-48 rounded-2xl" />
          <Skeleton className="h-14 rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </PageContainer>
      </div>
    );
  }

  if (listsQuery.isError) {
    return (
      <div
        className="py-4 pb-28 md:py-6"
        style={{ backgroundColor: 'var(--roost-bg)' }}
      >
        <PageContainer>
          <ErrorState onRetry={() => listsQuery.refetch()} />
        </PageContainer>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="py-4 pb-28 md:py-6"
      style={{ backgroundColor: 'var(--roost-bg)' }}
    >
      <PageContainer className="flex flex-col gap-4">
        {/* Header: list name + action buttons in one row */}
        {activeList && (
          <div className="flex items-center justify-between gap-2">
            {/* List name */}
            <h1
              className="text-2xl md:text-3xl"
              style={{ color: 'var(--roost-text-primary)', fontWeight: 900 }}
            >
              {activeList.name}
            </h1>

            {/* Actions: + Shopping List, + add item, more menu */}
            <div className="flex shrink-0 items-center gap-2">
              {/* + Shopping List button */}
              <motion.button
                type="button"
                onClick={
                  isPremium
                    ? openAddList
                    : () => setUpgradeCode('MULTIPLE_LISTS_PREMIUM')
                }
                whileTap={{ y: 1 }}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm"
                style={{
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: `3px solid ${COLOR_DARK}`,
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 700,
                }}
              >
                {isPremium ? (
                  <Plus className="size-3.5" strokeWidth={2.5} />
                ) : (
                  <Lock className="size-3.5" />
                )}
                <span className="hidden sm:inline">Shopping List</span>
                <span className=" md:hidden">
                  <ClipboardList className="size-3.5" />
                </span>
              </motion.button>

              {/* + add item */}
              <motion.button
                type="button"
                onClick={openAddItem}
                whileTap={{ y: 1 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: `3px solid ${COLOR_DARK}`,
                  color: 'var(--roost-text-secondary)',
                }}
                title="Add item with details"
              >
                <Plus className="size-4" />
              </motion.button>

              {/* More menu */}
              <MoreMenu
                list={activeList}
                isAdmin={isAdmin}
                onRename={openRenameList}
                onClear={() => clearCheckedMutation.mutate()}
                onDelete={() => setShowDeleteListConfirm(true)}
              />
            </div>
          </div>
        )}

        {/* List pill switcher — only shown when 2+ lists exist */}
        {lists.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {lists.map((list) => {
              const active = list.id === activeListId;
              return (
                <motion.button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(list.id)}
                  whileTap={{ y: 1 }}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm"
                  style={{
                    backgroundColor: active
                      ? COLOR + '18'
                      : 'var(--roost-surface)',
                    border: active
                      ? `1.5px solid ${COLOR}40`
                      : '1.5px solid var(--roost-border)',
                    borderBottom: active
                      ? `3px solid ${COLOR}60`
                      : '3px solid #E5E7EB',
                    color: active ? COLOR : 'var(--roost-text-primary)',
                    fontWeight: active ? 800 : 600,
                  }}
                >
                  {list.name}
                  {list.item_count > 0 && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] text-white"
                      style={{
                        backgroundColor: active
                          ? COLOR
                          : 'var(--roost-text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {list.item_count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Quick add bar */}
        {activeListId && (
          <div
            className="flex h-14 items-center gap-2 overflow-hidden rounded-xl"
            onClick={() => quickAddRef.current?.focus()}
            style={{
              border: `1.5px solid ${COLOR}50`,
              borderBottom: `3px solid ${COLOR}70`,
              backgroundColor: 'var(--roost-surface)',
              cursor: 'text',
            }}
          >
            <input
              ref={quickAddRef}
              data-testid="grocery-quick-add"
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              className="h-full flex-1 bg-transparent px-4 text-sm focus:outline-none"
              style={{
                color: 'var(--roost-text-primary)',
                fontWeight: 600,
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAdd();
              }}
              disabled={!newItemName.trim() || addItemMutation.isPending}
              className="flex h-full w-14 shrink-0 items-center justify-center disabled:opacity-40"
              style={{ color: COLOR }}
            >
              {addItemMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-5" strokeWidth={2.5} />
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!itemsQuery.isLoading && items.length === 0 && (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center"
            style={{
              backgroundColor: 'var(--roost-surface)',
              border: '2px dashed var(--roost-border)',
              borderBottom: '2px dashed var(--roost-border)',
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: 'var(--roost-surface)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: `4px solid ${COLOR_DARK}`,
              }}
            >
              <ShoppingCart className="size-5" style={{ color: COLOR }} />
            </div>
            <div>
              <p
                className="text-base"
                style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
              >
                The fridge is on its own.
              </p>
              <p
                className="mt-1 text-sm"
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                No items on the list. Add something before someone eats a
                condiment for dinner.
              </p>
            </div>
          </div>
        )}

        {/* Unchecked items */}
        {unchecked.length > 0 && (
          <div className="space-y-2">
            {unchecked.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
              >
                <ItemRow
                  item={item}
                  onCheck={handleCheck}
                  onEdit={openEditItem}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Checked items (collapsible) */}
        {checked.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowChecked((v) => !v)}
              className="flex h-11 w-full items-center gap-2 text-sm"
              style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}
            >
              <ChevronDown
                className="size-4 transition-transform"
                style={{
                  transform: showChecked ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
              />
              In the cart ({checked.length})
            </button>

            <AnimatePresence initial={false}>
              {showChecked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-1">
                    {checked.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onCheck={handleCheck}
                        onEdit={openEditItem}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Item sheet */}
        <GroceryItemSheet
          open={showItemSheet}
          onClose={() => {
            setShowItemSheet(false);
            setEditingItem(null);
          }}
          item={editingItem}
          listId={activeListId ?? ''}
        />

        {/* List sheet */}
        <GroceryListSheet
          open={showListSheet}
          onClose={() => {
            setShowListSheet(false);
            setListToEdit(null);
          }}
          list={listToEdit}
          isPremium={isPremium}
        />

        {/* Delete list confirmation */}
        <AlertDialog
          open={showDeleteListConfirm}
          onOpenChange={setShowDeleteListConfirm}
        >
          <AlertDialogContent
            style={{
              backgroundColor: 'var(--roost-surface)',
              border: '1.5px solid var(--roost-border)',
              borderRadius: 20,
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle
                style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
              >
                Delete list?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                {activeList
                  ? `"${activeList.name}" and all its items will be permanently removed.`
                  : 'This list and all its items will be permanently removed.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                style={{
                  backgroundColor: 'var(--roost-bg)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid #E5E7EB',
                  color: 'var(--roost-text-primary)',
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  activeList && deleteListMutation.mutate(activeList.id)
                }
                disabled={deleteListMutation.isPending}
                style={{
                  backgroundColor: '#EF4444',
                  borderBottom: '3px solid #C93B3B',
                  color: '#fff',
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                {deleteListMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upgrade prompt */}
        <Sheet
          open={!!upgradeCode}
          onOpenChange={(v) => !v && setUpgradeCode(null)}
        >
          <SheetContent
            side="bottom"
            className="rounded-t-2xl px-4 pb-8 pt-2"
            style={{ backgroundColor: 'var(--roost-surface)' }}
          >
            <div
              className="mx-auto mb-4 h-1 w-10 rounded-full"
              style={{ backgroundColor: COLOR }}
            />
            {upgradeCode && (
              <UpgradePrompt
                code={upgradeCode}
                onDismiss={() => setUpgradeCode(null)}
              />
            )}
          </SheetContent>
        </Sheet>
      </PageContainer>
    </motion.div>
  );
}
