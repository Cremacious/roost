'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Lock,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  UtensilsCrossed,
  ArrowUpDown,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { startOfWeek, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { groupItemsBySection } from '@/lib/utils/grocerySort';
import { CommonItemsSheet } from '@/components/grocery/CommonItemsSheet';
import { usePermissionGate } from '@/lib/hooks/usePermissionGate';
import { useHousehold } from '@/lib/hooks/useHousehold';
import PremiumGate from '@/components/shared/PremiumGate';
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

const COLOR = '#F59E0B';
const COLOR_DARK = '#C87D00';
const COLOR_LIGHT = '#FEF3C7';

const SECTION_DOT_COLORS: Record<string, string> = {
  Produce: '#22C55E',
  'Meat & Seafood': '#EF4444',
  'Dairy & Eggs': '#3B82F6',
  'Bakery & Bread': '#F97316',
  Frozen: '#06B6D4',
  'Pantry & Dry Goods': '#F59E0B',
  'Canned & Jarred': '#A855F7',
  Snacks: '#EC4899',
  Beverages: '#8B5CF6',
  Breakfast: '#F59E0B',
  'Condiments & Sauces': '#84CC16',
  'Cleaning & Household': '#14B8A6',
  'Personal Care': '#F472B6',
  'Baby & Kids': '#FB923C',
  Pet: '#78716C',
  Other: '#9CA3AF',
};

const LIST_COLORS = [
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#22C55E',
  '#A855F7',
  '#F97316',
  '#06B6D4',
];

// Compute the bumped quantity when increasing an existing grocery item.
// quantity is free text (e.g. "1 gal", "2 dozen"); we increment the leading
// integer and keep any trailing text. The increment is the incoming numeric
// quantity when present, otherwise 1. Empty, null, or non-numeric free text
// ("a bunch") treats the single existing row as 1 and falls back to "2".
function computeIncreasedQuantity(
  existing: string | null,
  incoming?: string,
): string {
  const existingStr = (existing ?? '').trim();
  const incomingMatch = (incoming ?? '').trim().match(/^(\d+)/);
  const increment = incomingMatch ? parseInt(incomingMatch[1], 10) : 1;
  const existingMatch = existingStr.match(/^(\d+)(.*)$/);
  if (existingMatch) {
    const base = parseInt(existingMatch[1], 10);
    return `${base + increment}${existingMatch[2]}`;
  }
  return String(1 + increment);
}


// ── Interfaces ────────────────────────────────────────────────────────────────

interface GroceryItem {
  id: string;
  name: string;
  quantity: string | null;
  isChecked: boolean;
  checkedAt: string | null;
  addedBy: string;
  addedByAvatar?: string | null;
  createdAt: string;
  // Stable client-side identity for optimistic rows. Set on the optimistic
  // insert and preserved when the real server id arrives, so the rendered row
  // keeps the same React key and framer-motion never replays its enter/exit.
  clientKey?: string;
}

interface ListSummary {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
}

interface GroceryData {
  listId: string;
  listName: string;
  isDefault: boolean;
  items: GroceryItem[];
}

interface PlannerSlot {
  id: string;
  slotDate: string;
  slotType: string;
  mealId: string;
  mealName: string;
  mealIngredients: string | null;
}

// ── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onCheck,
  onDelete,
  onEdit,
  index,
}: {
  item: GroceryItem;
  onCheck: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, name: string, quantity: string) => void;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(item.quantity ?? '');
  const nameRef = useRef<HTMLInputElement>(null);

  function openEdit() {
    setEditName(item.name);
    setEditQty(item.quantity ?? '');
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  function saveEdit() {
    const name = editName.trim();
    if (!name) return;
    onEdit(item.id, name, editQty.trim());
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    setEditName(item.name);
    setEditQty(item.quantity ?? '');
  }

  const initials = item.addedBy ? item.addedBy.charAt(0).toUpperCase() : '?';
  const avatarBg = item.addedByAvatar ?? '#9CA3AF';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: Math.min(index * 0.03, 0.15), duration: 0.14 },
      }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.12 } }}
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${item.isChecked ? '#D1D5DB' : COLOR_DARK}`,
        borderRadius: 14,
        overflow: 'hidden',
        opacity: item.isChecked ? 0.6 : 1,
      }}
    >
      {editing ? (
        <div
          style={{
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <input
            ref={nameRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            placeholder="Item name"
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              borderRadius: 10,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              background: 'var(--roost-surface)',
              outline: 'none',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--roost-text-primary)',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <input
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            placeholder="Quantity (e.g. 2 lbs, 1 dozen)"
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px',
              borderRadius: 10,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border-bottom)',
              background: 'var(--roost-surface)',
              outline: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--roost-text-primary)',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={saveEdit}
              disabled={!editName.trim()}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 10,
                border: 'none',
                borderBottom: `3px solid ${COLOR_DARK}`,
                backgroundColor: COLOR,
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                cursor: editName.trim() ? 'pointer' : 'default',
                opacity: editName.trim() ? 1 : 0.5,
                fontFamily: 'inherit',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1.5px solid var(--roost-border)',
                borderBottom: '3px solid var(--roost-border-bottom)',
                background: 'var(--roost-surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={15} color="var(--roost-text-muted)" />
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 12px',
            minHeight: 60,
          }}
        >
          <button
            type="button"
            aria-label={item.isChecked ? 'Uncheck item' : 'Check item'}
            onClick={() => onCheck(item.id, !item.isChecked)}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: `2px solid ${item.isChecked ? COLOR : COLOR + '55'}`,
              backgroundColor: item.isChecked ? COLOR : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {item.isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
          </button>

          <button
            type="button"
            onClick={openEdit}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: '10px 0',
            }}
          >
            <p
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: item.isChecked
                  ? 'var(--roost-text-muted)'
                  : 'var(--roost-text-primary)',
                textDecoration: item.isChecked ? 'line-through' : 'none',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.name}
            </p>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--roost-text-muted)',
                margin: 0,
              }}
            >
              {item.quantity || 'Add quantity'}
            </p>
          </button>

          {/* Added-by avatar */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: avatarBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 900,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <button
            type="button"
            aria-label="Delete item"
            onClick={() => onDelete(item.id)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--roost-text-muted)',
              flexShrink: 0,
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── NewListForm ───────────────────────────────────────────────────────────────

function NewListForm({
  onSave,
  onCancel,
}: {
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onSave(value.trim());
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="List name"
        style={{
          flex: 1,
          height: 40,
          padding: '0 12px',
          borderRadius: 10,
          border: `1.5px solid ${COLOR}`,
          borderBottom: `3px solid ${COLOR_DARK}`,
          background: 'var(--roost-surface)',
          outline: 'none',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--roost-text-primary)',
          fontFamily: 'inherit',
        }}
      />
      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => value.trim() && onSave(value.trim())}
        style={{
          height: 40,
          padding: '0 14px',
          borderRadius: 10,
          border: 'none',
          borderBottom: `3px solid ${COLOR_DARK}`,
          backgroundColor: COLOR,
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          cursor: value.trim() ? 'pointer' : 'default',
          opacity: value.trim() ? 1 : 0.5,
        }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: '1.5px solid var(--roost-border)',
          borderBottom: '3px solid var(--roost-border-bottom)',
          background: 'var(--roost-surface)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={16} color="var(--roost-text-muted)" />
      </button>
    </div>
  );
}

// ── ProgressBanner ────────────────────────────────────────────────────────────

function ProgressBanner({
  checked,
  total,
  listName,
}: {
  checked: number;
  total: number;
  listName: string;
}) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const remaining = total - checked;
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${COLOR} 0%, #D97706 100%)`,
        borderRadius: 14,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Blob */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Shopping progress
        </span>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>
          {checked} / {total} items
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: 'rgba(255,255,255,0.25)',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 12,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'white',
            borderRadius: 4,
            width: `${pct}%`,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div
        style={{ display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'white',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {remaining} remaining
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.45)',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {checked} in cart
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {pct}% done
          </span>
        </div>
      </div>
    </div>
  );
}

// ── MealCard ──────────────────────────────────────────────────────────────────

function MealCard({
  meals,
  onAddAll,
}: {
  meals: PlannerSlot[];
  onAddAll: () => void;
}) {
  const ORANGE = '#F97316';
  const ORANGE_LIGHT = '#FFEDD5';
  return (
    <div
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${ORANGE}`,
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--roost-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <UtensilsCrossed size={14} color={ORANGE} strokeWidth={2.5} />
          From this week&apos;s meals
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 6,
              backgroundColor: ORANGE_LIGHT,
              color: ORANGE,
            }}
          >
            {meals.length} {meals.length === 1 ? 'recipe' : 'recipes'}
          </span>
        </span>
        <button
          type="button"
          onClick={onAddAll}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: ORANGE,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontFamily: 'inherit',
            padding: 0,
          }}
        >
          Add all
        </button>
      </div>
      <div
        style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}
      >
        {meals.map((slot) => {
          let count = 0;
          try {
            count = JSON.parse(slot.mealIngredients ?? '[]').length;
          } catch {
            count = 0;
          }
          return (
            <div
              key={slot.mealId}
              style={{
                minWidth: 140,
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: ORANGE_LIGHT,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--roost-text-primary)',
                  marginBottom: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {slot.mealName}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE }}>
                +{count} items needed
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FoodPage() {
  const queryClient = useQueryClient();
  const { allowed: canAddItem, onBlocked: onBlockedAddItem } = usePermissionGate('grocery.add')
  const { allowed: canCreateList, onBlocked: onBlockedCreateList } = usePermissionGate('grocery.create_list')
  const { isPremium } = useHousehold();
  // "New list" is blocked when the member lacks the permission OR the household
  // is on the free plan (free = one list only). Permission is checked first so
  // upgrading never grants a permission an admin disabled.
  const listLocked = !canCreateList || !isPremium;
  const [showListGate, setShowListGate] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [checkedOpen, setCheckedOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'smart' | 'newest'>('newest');
  const [addingList, setAddingList] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [commonItemsSheetOpen, setCommonItemsSheetOpen] = useState(false);
  const [dupDialog, setDupDialog] = useState<{
    item: GroceryItem;
    incomingQuantity?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Scroll progress indicator for the list tabs row: only shown when the pills
  // overflow. thumbW is the visible fraction; thumbPos is 0..1 scroll position.
  const [tabScroll, setTabScroll] = useState({ overflow: false, thumbW: 1, thumbPos: 0 });

  // ── Lists query ──────────────────────────────────────────────────────────
  const { data: listsData, isLoading: listsLoading } = useQuery<{
    lists: ListSummary[];
  }>({
    queryKey: ['grocery-lists'],
    queryFn: async () => {
      const res = await fetch('/api/grocery/lists');
      if (!res.ok) throw new Error('Failed to load lists');
      return res.json();
    },
    staleTime: 15_000,
  });

  const resolvedActiveListId = useMemo(() => {
    if (!listsData) return activeListId;
    if (activeListId && listsData.lists.find((l) => l.id === activeListId))
      return activeListId;
    const def = listsData.lists.find((l) => l.isDefault) ?? listsData.lists[0];
    return def ? def.id : activeListId;
  }, [listsData, activeListId]);

  // Promote the resolved default into state once it becomes known. This is the
  // documented "adjust state during render" pattern (it converges in one extra
  // render) and avoids a setState-in-effect cascade.
  if (resolvedActiveListId && resolvedActiveListId !== activeListId) {
    setActiveListId(resolvedActiveListId);
  }

  // ── Items query ──────────────────────────────────────────────────────────
  const {
    data,
    isLoading: itemsLoading,
    isError,
  } = useQuery<GroceryData>({
    queryKey: ['grocery-items', activeListId],
    queryFn: async () => {
      if (!activeListId) throw new Error('No list');
      const res = await fetch(`/api/grocery/lists/${activeListId}/items`);
      if (!res.ok) throw new Error('Failed to load items');
      return res.json();
    },
    enabled: !!activeListId,
    staleTime: 10_000,
    refetchInterval: 30_000,
    // Carry the optimistic clientKey forward onto the matching server row so a
    // background refetch keeps the same React key and never replays the add
    // animation on a row that is already on screen.
    structuralSharing: (oldData, newData) => {
      const next = newData as GroceryData | undefined;
      const old = oldData as GroceryData | undefined;
      if (!next || !old) return newData;
      const keyById = new Map(
        old.items
          .filter((i) => i.clientKey)
          .map((i) => [i.id, i.clientKey as string]),
      );
      if (keyById.size === 0) return newData;
      return {
        ...next,
        items: next.items.map((i) =>
          keyById.has(i.id) ? { ...i, clientKey: keyById.get(i.id) } : i,
        ),
      };
    },
  });

  // ── Planner query ────────────────────────────────────────────────────────
  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  );
  const { data: plannerData } = useQuery<{ slots: PlannerSlot[] }>({
    queryKey: ['planner', weekStart],
    queryFn: async () => {
      const res = await fetch(`/api/meals/planner?weekStart=${weekStart}`);
      if (!res.ok) throw new Error('Failed to load planner');
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: commonItemsData } = useQuery<{ items: { id: string; name: string }[] }>({
    queryKey: ['common-items'],
    queryFn: async () => {
      const res = await fetch('/api/grocery/common-items')
      if (!res.ok) throw new Error('Failed to load common items')
      return res.json()
    },
    staleTime: 30_000,
  })
  const commonItems = commonItemsData?.items ?? []

  // ── Create list ──────────────────────────────────────────────────────────
  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/grocery/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error ?? 'Failed to create list') as Error & {
          code?: string;
        };
        err.code = data.code;
        throw err;
      }
      return res.json() as Promise<ListSummary>;
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
      setActiveListId(newList.id);
      setAddingList(false);
    },
    onError: (err: Error & { code?: string }) => {
      // Free households that reach the single-list cap get the upgrade sheet
      // instead of a misleading network error toast.
      if (err.code === 'MULTIPLE_LISTS_PREMIUM') {
        setAddingList(false);
        setShowListGate(true);
        return;
      }
      toast.error('Could not create list', {
        description: 'Check your connection and try again.',
      });
    },
  });

  // Gate the "New list" affordance: permission first (admin-disabled beats any
  // upgrade), then the free single-list cap (opens the upgrade sheet).
  const handleNewListClick = useCallback(() => {
    if (!canCreateList) {
      onBlockedCreateList();
      return;
    }
    if (!isPremium) {
      setShowListGate(true);
      return;
    }
    setAddingList(true);
  }, [canCreateList, onBlockedCreateList, isPremium]);

  // ── Add item ─────────────────────────────────────────────────────────────
  // Uses resolvedActiveListId (not the raw activeListId state) so a quick tap on
  // a common-item chip during first load never no-ops or throws while the sync
  // effect catches up. Optimistically inserts the row so the chip gives instant
  // feedback instead of appearing to do nothing for a network round-trip.
  const addMutation = useMutation({
    mutationFn: async ({
      name,
      quantity,
    }: {
      name: string;
      quantity?: string;
    }) => {
      const listId = resolvedActiveListId;
      if (!listId) throw new Error('No active list');
      const res = await fetch(`/api/grocery/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity: quantity || undefined }),
      });
      if (!res.ok) throw new Error('Failed to add item');
      return res.json() as Promise<GroceryItem>;
    },
    onMutate: async ({ name, quantity }) => {
      const listId = resolvedActiveListId;
      if (!listId) return { prev: undefined, listId: null, clientKey: null };
      await queryClient.cancelQueries({ queryKey: ['grocery-items', listId] });
      const prev = queryClient.getQueryData<GroceryData>([
        'grocery-items',
        listId,
      ]);
      // Only insert optimistically when the list is already in cache, otherwise
      // we fall back to a refetch in onSettled.
      const clientKey = prev ? `temp-${crypto.randomUUID()}` : null;
      if (prev && clientKey) {
        const optimistic: GroceryItem = {
          id: clientKey,
          clientKey,
          name,
          quantity: quantity?.trim() ? quantity.trim() : null,
          isChecked: false,
          checkedAt: null,
          addedBy: '',
          addedByAvatar: null,
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<GroceryData>(['grocery-items', listId], {
          ...prev,
          items: [...prev.items, optimistic],
        });
      }
      return { prev, listId, clientKey };
    },
    onSuccess: (created, _vars, ctx) => {
      // Adopt the real server id on the existing optimistic row while keeping
      // its clientKey, so the React key never changes and the row does not
      // re-animate. No items refetch needed, which is what caused the row to
      // flash out and back in.
      if (!ctx?.listId || !ctx.clientKey || !created?.id) return;
      const current = queryClient.getQueryData<GroceryData>([
        'grocery-items',
        ctx.listId,
      ]);
      if (!current) return;
      queryClient.setQueryData<GroceryData>(['grocery-items', ctx.listId], {
        ...current,
        items: current.items.map((i) =>
          i.clientKey === ctx.clientKey ? { ...i, id: created.id } : i,
        ),
      });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.listId && ctx.prev) {
        queryClient.setQueryData(['grocery-items', ctx.listId], ctx.prev);
      }
      toast.error('Could not add item', {
        description: 'Check your connection and try again.',
      });
    },
    onSettled: (_data, _err, _vars, ctx) => {
      // When we could not insert optimistically (list not yet cached), refetch
      // so the new item still shows up. When we did insert optimistically, skip
      // the items refetch: it would replace the clientKey-tagged row with a
      // plain server row and replay the add animation.
      if (ctx?.listId && !ctx.clientKey) {
        queryClient.invalidateQueries({
          queryKey: ['grocery-items', ctx.listId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });

  // ── Edit item ─────────────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      quantity,
    }: {
      id: string;
      name: string;
      quantity: string;
    }) => {
      const res = await fetch(`/api/grocery/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity: quantity || null }),
      });
      if (!res.ok) throw new Error('Failed to update item');
    },
    onMutate: async ({ id, name, quantity }) => {
      await queryClient.cancelQueries({
        queryKey: ['grocery-items', activeListId],
      });
      const prev = queryClient.getQueryData<GroceryData>([
        'grocery-items',
        activeListId,
      ]);
      if (prev)
        queryClient.setQueryData<GroceryData>(['grocery-items', activeListId], {
          ...prev,
          items: prev.items.map((i) =>
            i.id === id ? { ...i, name, quantity: quantity || null } : i,
          ),
        });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(['grocery-items', activeListId], ctx.prev);
      toast.error('Could not update item', {
        description: 'Check your connection and try again.',
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      }),
  });

  // ── Check / uncheck ──────────────────────────────────────────────────────
  const checkMutation = useMutation({
    mutationFn: async ({
      id,
      isChecked,
    }: {
      id: string;
      isChecked: boolean;
    }) => {
      const res = await fetch(`/api/grocery/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked }),
      });
      if (!res.ok) throw new Error('Failed to update');
    },
    onMutate: async ({ id, isChecked }) => {
      await queryClient.cancelQueries({
        queryKey: ['grocery-items', activeListId],
      });
      const prev = queryClient.getQueryData<GroceryData>([
        'grocery-items',
        activeListId,
      ]);
      if (prev)
        queryClient.setQueryData<GroceryData>(['grocery-items', activeListId], {
          ...prev,
          items: prev.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  isChecked,
                  checkedAt: isChecked ? new Date().toISOString() : null,
                }
              : i,
          ),
        });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(['grocery-items', activeListId], ctx.prev);
      toast.error('Could not update item', {
        description: 'Check your connection and try again.',
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      }),
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/grocery/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ['grocery-items', activeListId],
      });
      const prev = queryClient.getQueryData<GroceryData>([
        'grocery-items',
        activeListId,
      ]);
      if (prev)
        queryClient.setQueryData<GroceryData>(['grocery-items', activeListId], {
          ...prev,
          items: prev.items.filter((i) => i.id !== id),
        });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(['grocery-items', activeListId], ctx.prev);
      toast.error('Could not delete item', {
        description: 'Check your connection and try again.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });

  // ── Clear cart ────────────────────────────────────────────────────────────
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!activeListId) throw new Error('No active list');
      const res = await fetch(`/api/grocery/lists/${activeListId}/clear`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to clear cart');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['grocery-items', activeListId],
      });
      const prev = queryClient.getQueryData<GroceryData>([
        'grocery-items',
        activeListId,
      ]);
      if (prev) {
        const clearedCount = prev.items.filter((i) => i.isChecked).length;
        queryClient.setQueryData<GroceryData>(['grocery-items', activeListId], {
          ...prev,
          items: prev.items.filter((i) => !i.isChecked),
        });
        // Update list item count without triggering a refetch
        queryClient.setQueryData<{ lists: ListSummary[] }>(
          ['grocery-lists'],
          (old) => {
            if (!old) return old;
            return {
              lists: old.lists.map((l) =>
                l.id === activeListId
                  ? { ...l, itemCount: Math.max(0, l.itemCount - clearedCount) }
                  : l,
              ),
            };
          },
        );
      }
      return { prev };
    },
    onSuccess: () => {
      setCheckedOpen(false);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(['grocery-items', activeListId], ctx.prev);
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
      toast.error('Could not clear cart', {
        description: 'Check your connection and try again.',
      });
    },
  });

  // ── Add all meals ─────────────────────────────────────────────────────────
  const addAllMealsMutation = useMutation({
    mutationFn: async (mealIds: string[]) => {
      await Promise.all(
        mealIds.map((id) =>
          fetch(`/api/meals/${id}/add-to-grocery`, { method: 'POST' }).then(
            (r) => {
              if (!r.ok) throw new Error('failed');
            },
          ),
        ),
      );
    },
    onSuccess: () => {
      toast.success('Meal ingredients added to list');
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', activeListId],
      });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
    onError: () => {
      toast.error('Could not add meals', {
        description: 'Check your connection and try again.',
      });
    },
  });

  // Single duplicate-check gate that every add path routes through. Looks for an
  // existing item on the active list whose name matches case-insensitively
  // (trimmed) and that is NOT checked (in the cart) and not soft-deleted (the
  // items query already excludes soft-deleted rows). If a duplicate is found we
  // open the dialog offering to increase the quantity; otherwise we add normally.
  const requestAddItem = useCallback(
    ({ name, quantity }: { name: string; quantity?: string }) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;
      const items =
        queryClient.getQueryData<GroceryData>([
          'grocery-items',
          resolvedActiveListId,
        ])?.items ?? [];
      const target = trimmedName.toLowerCase();
      const duplicate = items.find(
        (i) => !i.isChecked && i.name.trim().toLowerCase() === target,
      );
      if (duplicate) {
        setDupDialog({ item: duplicate, incomingQuantity: quantity });
        return;
      }
      addMutation.mutate({ name: trimmedName, quantity: quantity || undefined });
    },
    [queryClient, resolvedActiveListId, addMutation],
  );

  // Confirm handler for the duplicate dialog: bump the existing item's quantity
  // via the edit mutation (no new row) and show a success toast.
  const handleConfirmIncrease = useCallback(() => {
    if (!dupDialog) return;
    const { item, incomingQuantity } = dupDialog;
    const newQuantity = computeIncreasedQuantity(item.quantity, incomingQuantity);
    editMutation.mutate({ id: item.id, name: item.name, quantity: newQuantity });
    toast.success(`Increased ${item.name} to ${newQuantity}`);
    setDupDialog(null);
  }, [dupDialog, editMutation]);

  const handleQuickAdd = useCallback(() => {
    const name = input.trim();
    if (!name) return;
    const quantity = qtyInput.trim();
    setInput('');
    setQtyInput('');
    requestAddItem({ name, quantity: quantity || undefined });
    inputRef.current?.focus();
  }, [input, qtyInput, requestAddItem]);

  // Quick-add from a common-item chip. Respects the same grocery.add permission
  // gate as the quick-add bar and guards against a not-yet-resolved list, then
  // routes through the same duplicate-check gate as the quick-add bar.
  const handleCommonItemAdd = useCallback(
    (name: string) => {
      if (!canAddItem) {
        onBlockedAddItem();
        return;
      }
      if (!resolvedActiveListId) {
        toast.error('No list selected', {
          description: 'Create or pick a list first, then try again.',
        });
        return;
      }
      requestAddItem({ name });
    },
    [canAddItem, onBlockedAddItem, resolvedActiveListId, requestAddItem],
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const unchecked = data?.items.filter((i) => !i.isChecked) ?? [];
  const checked = data?.items.filter((i) => i.isChecked) ?? [];
  const totalItems = data?.items.length ?? 0;
  const checkedCount = checked.length;
  const sortedGroups =
    sortMode === 'smart' ? groupItemsBySection(unchecked) : null;
  const displayUnchecked =
    sortMode === 'newest' ? [...unchecked].reverse() : unchecked;
  const isLoading = listsLoading || (itemsLoading && !!activeListId);
  const lists = listsData?.lists ?? [];

  // Track whether the list tabs overflow and where the scroll sits, so the
  // progress indicator can hint that more lists are off-screen (the native
  // scrollbar is hidden). Recomputes on resize and on scroll.
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const update = () => {
      const { scrollWidth, clientWidth, scrollLeft } = el;
      const overflow = scrollWidth > clientWidth + 1;
      const thumbW = overflow ? clientWidth / scrollWidth : 1;
      const maxScroll = scrollWidth - clientWidth;
      const thumbPos = maxScroll > 0 ? scrollLeft / maxScroll : 0;
      setTabScroll({ overflow, thumbW, thumbPos });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [lists.length]);

  // Deduplicated meals with ingredients for this week
  const mealsThisWeek = (() => {
    if (!plannerData?.slots) return [];
    const seen = new Set<string>();
    return plannerData.slots.filter((slot) => {
      if (seen.has(slot.mealId)) return false;
      seen.add(slot.mealId);
      try {
        const ingredients = slot.mealIngredients
          ? JSON.parse(slot.mealIngredients)
          : [];
        return Array.isArray(ingredients) && ingredients.length > 0;
      } catch {
        return false;
      }
    });
  })();

  // Member activity for "who's added what" sidebar widget
  const memberActivity = (() => {
    const map = new Map<
      string,
      { name: string; avatar: string; count: number }
    >();
    for (const item of data?.items ?? []) {
      const name = item.addedBy || 'Unknown';
      const existing = map.get(name);
      if (existing) existing.count++;
      else
        map.set(name, {
          name,
          avatar: item.addedByAvatar ?? '#9CA3AF',
          count: 1,
        });
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          padding: 16,
          maxWidth: 768,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {[80, 110, 90].map((w, i) => (
            <Skeleton
              key={i}
              style={{ height: 36, width: w, borderRadius: 20, flexShrink: 0 }}
            />
          ))}
        </div>
        <Skeleton style={{ height: 52 }} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 64, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}>
          Could not load grocery list. Please refresh.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F9FAFB',
        maxWidth: 768,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Page header ── */}
      <div style={{ backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>
            Lists
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
            {unchecked.length} {unchecked.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => setSortMode((m) => (m === 'smart' ? 'newest' : 'smart'))}
            title={sortMode === 'smart' ? 'Switch to newest' : 'Switch to smart sort'}
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border-bottom)',
              backgroundColor: 'var(--roost-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ArrowUpDown size={16} color="var(--roost-text-muted)" />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => inputRef.current?.focus()}
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Plus size={18} color="white" />
          </motion.button>
        </div>
      </div>

      {/* ── List tabs bar ── */}
      <div style={{ position: 'relative', backgroundColor: '#F9FAFB' }}>
      <div
        ref={tabsRef}
        style={{
          backgroundColor: '#F9FAFB',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 48,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {lists.map((list) => {
          const isActive = list.id === activeListId;
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => setActiveListId(list.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 14px',
                borderRadius: 8,
                border: `1.5px solid ${isActive ? COLOR : 'transparent'}`,
                borderBottom: `3px solid ${isActive ? COLOR_DARK : 'transparent'}`,
                backgroundColor: isActive ? COLOR_LIGHT : 'transparent',
                fontSize: 13,
                fontWeight: 700,
                color: isActive ? COLOR_DARK : 'var(--roost-text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.12s',
                fontFamily: 'inherit',
              }}
            >
              {list.name}
              {list.itemCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 7px',
                    borderRadius: 10,
                    backgroundColor: isActive ? COLOR : 'var(--roost-border)',
                    color: isActive ? 'white' : 'var(--roost-text-muted)',
                  }}
                >
                  {list.itemCount}
                </span>
              )}
            </button>
          );
        })}
        {/* Separator before new list */}
        {lists.length > 0 && (
          <div
            style={{
              width: 1,
              height: 24,
              backgroundColor: 'var(--roost-border)',
              marginLeft: 4,
              flexShrink: 0,
            }}
          />
        )}
        {!addingList && (
          <button
            type="button"
            onClick={handleNewListClick}
            aria-disabled={listLocked}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: '1.5px dashed var(--roost-border)',
              backgroundColor: 'transparent',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--roost-text-muted)',
              cursor: listLocked ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              fontFamily: 'inherit',
              opacity: listLocked ? 0.55 : 1,
            }}
          >
            {listLocked ? (
              <Lock size={11} color="var(--roost-text-muted)" />
            ) : (
              <Plus size={11} color="var(--roost-text-muted)" />
            )}
            New list
          </button>
        )}
      </div>
        {tabScroll.overflow && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 16,
              right: 16,
              height: 3,
              borderRadius: 2,
              backgroundColor: COLOR + '20',
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                height: '100%',
                borderRadius: 2,
                backgroundColor: COLOR,
                width: `${tabScroll.thumbW * 100}%`,
              }}
              animate={{ left: `${tabScroll.thumbPos * (100 - tabScroll.thumbW * 100)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        )}
      </div>

      {/* New list form */}
      {addingList && (
        <div style={{ padding: '8px 16px', backgroundColor: '#F9FAFB' }}>
          <NewListForm
            onSave={(name) => createListMutation.mutate(name)}
            onCancel={() => setAddingList(false)}
          />
        </div>
      )}

      {/* ── Content layout (main + sidebar) ── */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
        {/* Main column */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: '16px 16px 100px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Progress banner */}
          {data && totalItems > 0 && (
            <ProgressBanner
              checked={checkedCount}
              total={totalItems}
              listName={data.listName}
            />
          )}

          {/* Meal card */}
          {mealsThisWeek.length > 0 && (
            <MealCard
              meals={mealsThisWeek}
              onAddAll={() =>
                addAllMealsMutation.mutate(mealsThisWeek.map((m) => m.mealId))
              }
            />
          )}

          {/* Quick add — mobile (stacked) */}
          <div
            className="md:hidden"
            style={{
              backgroundColor: 'var(--roost-surface)',
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (input.trim()) qtyRef.current?.focus();
                  }
                }}
                placeholder="Add an item"
                style={{
                  flex: 1,
                  height: 48,
                  padding: '0 16px',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--roost-text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={canAddItem ? handleQuickAdd : onBlockedAddItem}
                aria-disabled={!canAddItem}
                style={{
                  width: 48,
                  height: 48,
                  border: 'none',
                  borderLeft: `1px solid ${COLOR}30`,
                  background: input.trim() ? COLOR : 'transparent',
                  cursor: canAddItem ? (input.trim() ? 'pointer' : 'default') : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.12s',
                  opacity: canAddItem ? 1 : 0.55,
                }}
              >
                {canAddItem ? (
                  <Plus
                    size={20}
                    color={input.trim() ? '#fff' : COLOR + '60'}
                    strokeWidth={2.5}
                  />
                ) : (
                  <Lock size={20} color={input.trim() ? '#fff' : COLOR + '60'} strokeWidth={2.5} />
                )}
              </button>
            </div>
            <div
              style={{
                borderTop: `1px solid ${COLOR}25`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: COLOR_DARK,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.05em',
                }}
              >
                QTY
              </span>
              <input
                ref={qtyRef}
                type="text"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (canAddItem) { handleQuickAdd() } else { onBlockedAddItem() } } }}
                placeholder="e.g. 2 lbs, 1 dozen (optional)"
                style={{
                  flex: 1,
                  height: 36,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--roost-text-muted)',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Quick add — desktop (inline) */}
          <div
            className="hidden md:block"
            style={{
              backgroundColor: 'var(--roost-surface)',
              border: `1.5px solid ${COLOR}`,
              borderBottom: `4px solid ${COLOR_DARK}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                data-testid="grocery-quick-add"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (canAddItem) { handleQuickAdd() } else { onBlockedAddItem() } } }}
                placeholder="Add an item..."
                style={{
                  flex: 1,
                  height: 46,
                  padding: '0 16px',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--roost-text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              <div
                style={{
                  width: 1,
                  height: 28,
                  backgroundColor: `${COLOR}30`,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 16px',
                  minWidth: 200,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: COLOR_DARK,
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}
                >
                  QTY
                </span>
                <input
                  type="text"
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { if (canAddItem) { handleQuickAdd() } else { onBlockedAddItem() } } }}
                  placeholder="e.g. 2 cartons (optional)"
                  style={{
                    flex: 1,
                    height: 46,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--roost-text-muted)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={canAddItem ? handleQuickAdd : onBlockedAddItem}
                aria-disabled={!canAddItem}
                style={{
                  width: 46,
                  height: 46,
                  border: 'none',
                  borderLeft: `1px solid ${COLOR}30`,
                  background: input.trim() ? COLOR : `${COLOR}40`,
                  cursor: canAddItem ? (input.trim() ? 'pointer' : 'default') : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.12s',
                  opacity: canAddItem ? 1 : 0.55,
                }}
              >
                {canAddItem ? (
                  <Plus size={20} color="white" strokeWidth={2.5} />
                ) : (
                  <Lock size={20} color="white" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          {/* Sort bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setSortMode('smart')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 30,
                padding: '0 12px',
                borderRadius: 7,
                border: `1.5px solid ${sortMode === 'smart' ? COLOR : 'var(--roost-border)'}`,
                borderBottom: `3px solid ${sortMode === 'smart' ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                backgroundColor:
                  sortMode === 'smart' ? COLOR_LIGHT : 'var(--roost-surface)',
                fontSize: 12,
                fontWeight: 700,
                color:
                  sortMode === 'smart' ? COLOR_DARK : 'var(--roost-text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}
            >
              <ArrowUpDown
                size={11}
                color={
                  sortMode === 'smart' ? COLOR_DARK : 'var(--roost-text-muted)'
                }
                strokeWidth={2.5}
              />
              Smart sort
            </button>
            <button
              type="button"
              onClick={() => setSortMode('newest')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 30,
                padding: '0 12px',
                borderRadius: 7,
                border: `1.5px solid ${sortMode === 'newest' ? COLOR : 'var(--roost-border)'}`,
                borderBottom: `3px solid ${sortMode === 'newest' ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                backgroundColor:
                  sortMode === 'newest' ? COLOR_LIGHT : 'var(--roost-surface)',
                fontSize: 12,
                fontWeight: 700,
                color:
                  sortMode === 'newest'
                    ? COLOR_DARK
                    : 'var(--roost-text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}
            >
              Newest
            </button>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--roost-text-muted)',
                marginLeft: 'auto',
              }}
            >
              {unchecked.length} item{unchecked.length !== 1 ? 's' : ''}{' '}
              remaining
            </span>
          </div>

          {/* Empty state */}
          {data && data.items.length === 0 && (
            <div
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                backgroundColor: 'var(--roost-surface)',
                border: '2px dashed var(--roost-border)',
                borderBottom: '4px dashed var(--roost-border-bottom)',
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: `4px solid ${COLOR}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <ShoppingCart size={22} color={COLOR} />
              </div>
              <p
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: 'var(--roost-text-primary)',
                  margin: '0 0 6px',
                }}
              >
                The fridge is on its own.
              </p>
              <p
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--roost-text-muted)',
                  margin: 0,
                }}
              >
                No items on the list. Add something before someone eats a
                condiment for dinner.
              </p>
            </div>
          )}

          {/* Unchecked items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedGroups ? (
              sortedGroups.map((group) => (
                <div key={group.section}>
                  {/* Section header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor:
                          SECTION_DOT_COLORS[group.section] ?? '#9CA3AF',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--roost-text-muted)',
                      }}
                    >
                      {group.section}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: 'var(--roost-text-muted)',
                        marginLeft: 'auto',
                      }}
                    >
                      {group.items.length} item
                      {group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    <AnimatePresence mode="popLayout">
                      {group.items.map((item, i) => (
                        <ItemRow
                          key={item.clientKey ?? item.id}
                          item={item}
                          index={i}
                          onCheck={(id, val) =>
                            checkMutation.mutate({ id, isChecked: val })
                          }
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onEdit={(id, name, qty) =>
                            editMutation.mutate({ id, name, quantity: qty })
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            ) : (
              <AnimatePresence mode="popLayout">
                {displayUnchecked.map((item, i) => (
                  <ItemRow
                    key={item.clientKey ?? item.id}
                    item={item}
                    index={i}
                    onCheck={(id, val) =>
                      checkMutation.mutate({ id, isChecked: val })
                    }
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onEdit={(id, name, qty) =>
                      editMutation.mutate({ id, name, quantity: qty })
                    }
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* In the cart */}
          {checked.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 0',
                  marginBottom: checkedOpen ? 8 : 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setCheckedOpen((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: COLOR,
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    IN THE CART ({checked.length})
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: 'var(--roost-border)',
                    }}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClearConfirmOpen(true);
                  }}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--roost-text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setCheckedOpen((v) => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {checkedOpen ? (
                    <ChevronUp size={14} color={COLOR} />
                  ) : (
                    <ChevronDown size={14} color={COLOR} />
                  )}
                </button>
              </div>
              <AnimatePresence>
                {checkedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {checked.map((item, i) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        index={i}
                        onCheck={(id, val) =>
                          checkMutation.mutate({ id, isChecked: val })
                        }
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onEdit={(id, name, qty) =>
                          editMutation.mutate({ id, name, quantity: qty })
                        }
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Frequently bought — mobile only */}
          <div className="md:hidden">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--roost-text-muted)',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}
              >
                COMMON ITEMS
              </p>
              <button
                type="button"
                aria-label="Edit common items"
                onClick={() => setCommonItemsSheetOpen(true)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '2px solid var(--roost-border-bottom)',
                  background: 'var(--roost-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={14} color="var(--roost-text-muted)" />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {commonItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCommonItemAdd(item.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: '1.5px solid var(--roost-border)',
                    backgroundColor: 'var(--roost-surface)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--roost-text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={12} color={COLOR} strokeWidth={2.5} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* /main column */}

        {/* ── Desktop right sidebar ── */}
        <div
          className="hidden md:flex"
          style={{
            width: 264,
            flexShrink: 0,
            backgroundColor: '#F9FAFB',
            flexDirection: 'column',
            gap: 20,
            padding: '20px 18px',
            position: 'sticky',
            top: 56,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 56px)',
            overflowY: 'auto',
          }}
        >
          {/* All lists widget */}
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--roost-text-muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              All lists
            </p>
            <div
              style={{
                backgroundColor: 'var(--roost-bg)',
                border: '1.5px solid var(--roost-border)',
                borderRadius: 12,
                padding: '4px 14px',
              }}
            >
              {lists.map((list, idx) => {
                const isActive = list.id === activeListId;
                const dotColor = LIST_COLORS[idx % LIST_COLORS.length];
                const activeChecked = isActive ? checkedCount : 0;
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setActiveListId(list.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 0',
                      borderBottom:
                        idx < lists.length - 1
                          ? '1px solid var(--roost-border)'
                          : 'none',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--roost-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {list.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 5,
                        flexShrink: 0,
                        backgroundColor: isActive
                          ? COLOR_LIGHT
                          : 'var(--roost-border)',
                        color: isActive
                          ? COLOR_DARK
                          : 'var(--roost-text-muted)',
                        marginLeft: 8,
                      }}
                    >
                      {isActive
                        ? `${activeChecked}/${list.itemCount}`
                        : list.itemCount}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleNewListClick}
                aria-disabled={listLocked}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 0',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--roost-text-muted)',
                  cursor: listLocked ? 'not-allowed' : 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'inherit',
                  opacity: listLocked ? 0.55 : 1,
                }}
              >
                {listLocked ? (
                  <Lock size={11} color="var(--roost-text-muted)" />
                ) : (
                  <Plus size={11} color="var(--roost-text-muted)" />
                )}
                New list
              </button>
            </div>
          </div>

          {/* Who's added what widget */}
          {memberActivity.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--roost-text-muted)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Who&apos;s added what
              </p>
              <div
                style={{
                  backgroundColor: 'var(--roost-bg)',
                  border: '1.5px solid var(--roost-border)',
                  borderRadius: 12,
                  padding: '4px 14px',
                }}
              >
                {memberActivity.map((member, idx) => (
                  <div
                    key={member.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom:
                        idx < memberActivity.length - 1
                          ? '1px solid var(--roost-border)'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        backgroundColor: member.avatar,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 900,
                        color: 'white',
                        flexShrink: 0,
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: 'var(--roost-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {member.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--roost-text-muted)',
                        }}
                      >
                        {member.count} {member.count === 1 ? 'item' : 'items'}{' '}
                        added
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: COLOR_LIGHT,
                        color: COLOR_DARK,
                        flexShrink: 0,
                      }}
                    >
                      {member.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequently bought widget */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--roost-text-muted)',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}
              >
                COMMON ITEMS
              </p>
              <button
                type="button"
                aria-label="Edit common items"
                onClick={() => setCommonItemsSheetOpen(true)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '2px solid var(--roost-border-bottom)',
                  background: 'var(--roost-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={14} color="var(--roost-text-muted)" />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {commonItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCommonItemAdd(item.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: '1.5px solid var(--roost-border)',
                    backgroundColor: 'var(--roost-surface)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--roost-text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={12} color={COLOR} strokeWidth={2.5} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* /desktop sidebar */}
      </div>
      {/* /content layout */}

      <CommonItemsSheet open={commonItemsSheetOpen} onClose={() => setCommonItemsSheetOpen(false)} />

      {showListGate && (
        <PremiumGate
          feature="grocery"
          trigger="sheet"
          onClose={() => setShowListGate(false)}
        />
      )}

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {checked.length} checked{' '}
              {checked.length === 1 ? 'item' : 'items'} from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearMutation.mutate()}
              style={{
                backgroundColor: COLOR,
                borderBottom: `3px solid ${COLOR_DARK}`,
                border: 'none',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!dupDialog}
        onOpenChange={(open) => {
          if (!open) setDupDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Already on your list</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{dupDialog?.item.name}&quot; is already on this list. Increase
              the quantity instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmIncrease}
              style={{
                backgroundColor: COLOR,
                borderBottom: `3px solid ${COLOR_DARK}`,
                border: 'none',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              Increase quantity
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
