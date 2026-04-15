'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Thermometer,
  Tag,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CategoryIcon,
  ICON_OPTIONS,
  COLOR_OPTIONS,
} from '@/components/expenses/CategoryPicker';
import type { Category } from '@/components/expenses/CategoryPicker';
import {
  ChoreIcon,
  type ChoreCategory,
} from '@/components/chores/ChoreCategoryPicker';
import { CHORE_ICON_OPTIONS } from '@/components/chores/choreIconMap';
import { THEMES, type ThemeKey } from '@/lib/constants/themes';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useSession } from '@/lib/auth/client';
import { useHousehold } from '@/lib/hooks/useHousehold';
import { useUserPreferences } from '@/lib/hooks/useUserPreferences';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import MemberSheet, {
  type SheetMember,
} from '@/components/settings/MemberSheet';
import InviteGuestSheet from '@/components/settings/InviteGuestSheet';
import AddChildSheet from '@/components/settings/AddChildSheet';
import MemberAvatar from '@/components/shared/MemberAvatar';
import PremiumGate from '@/components/shared/PremiumGate';
import { PageContainer } from '@/components/layout/PageContainer';

// ---- Constants --------------------------------------------------------------

const AVATAR_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#84CC16',
  '#6366F1',
  '#F43F5E',
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { value: 'America/Honolulu', label: 'Hawaii (Honolulu)' },
  { value: 'America/Phoenix', label: 'Arizona (Phoenix)' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
  { value: 'Europe/Warsaw', label: 'Warsaw (CET)' },
  { value: 'Europe/Athens', label: 'Athens (EET)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];

const NAV_SECTIONS = [
  { id: 'section-profile', label: 'Profile' },
  { id: 'section-appearance', label: 'Appearance' },
  { id: 'section-preferences', label: 'Preferences' },
  { id: 'section-household', label: 'Household' },
  { id: 'section-members', label: 'Members' },
  { id: 'section-notifications', label: 'Notifications' },
  { id: 'section-categories', label: 'Categories', adminOnly: true },
  {
    id: 'section-chore-categories',
    label: 'Chore Categories',
    adminOnly: true,
  },
  { id: 'section-promotions', label: 'Promotions' },
  { id: 'section-billing', label: 'Billing' },
  { id: 'section-danger', label: 'Danger Zone', adminOnly: true },
];

// ---- Shared helpers ---------------------------------------------------------

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatGuestExpiry(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const msLeft = date.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return 'expires today';
  if (daysLeft === 1) return 'expires in 1 day';
  if (daysLeft <= 3) return `expires in ${daysLeft} days`;
  return `expires ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

type Strength = 'weak' | 'fair' | 'good' | 'strong';

function getStrength(pw: string): Strength {
  if (pw.length < 8) return 'weak';
  const hasNum = /[0-9]/.test(pw);
  const hasSym = /[^a-zA-Z0-9]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  if (hasUpper && hasNum && hasSym) return 'strong';
  if (hasNum || hasSym) return 'good';
  return 'fair';
}

const STRENGTH_CONFIG: Record<
  Strength,
  { segments: number; label: string; color: string }
> = {
  weak: { segments: 1, label: 'Weak', color: '#EF4444' },
  fair: { segments: 2, label: 'Fair', color: '#F97316' },
  good: { segments: 3, label: 'Good', color: '#F59E0B' },
  strong: { segments: 4, label: 'Strong', color: '#22C55E' },
};

const inputClass =
  'flex h-11 w-full rounded-xl border bg-transparent px-3 text-sm focus:outline-none';
const inputStyle = {
  border: '1.5px solid var(--roost-border)',
  borderBottom: '3px solid var(--roost-border-bottom)',
  color: 'var(--roost-text-primary)',
  fontWeight: 600,
};

// ---- Sub-components ---------------------------------------------------------

function SettingsSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div>
        <h2
          className="text-[17px]"
          style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-0.5 text-[13px]"
            style={{ color: 'var(--roost-text-secondary)', fontWeight: 600 }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function SlabCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '4px solid var(--roost-border-bottom)',
      }}
    >
      {children}
    </div>
  );
}

function SlabRow({
  children,
  topBorder = true,
}: {
  children: React.ReactNode;
  topBorder?: boolean;
}) {
  return (
    <div
      className="flex min-h-14 items-center gap-3 px-4"
      style={{
        borderTop: topBorder ? '1px solid var(--roost-border)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

function ThemeCard({
  themeKey,
  isSelected,
  onSelect,
}: {
  themeKey: ThemeKey;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const t = THEMES[themeKey];
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ y: 1 }}
      className="relative flex flex-col gap-2 rounded-2xl p-3 text-left"
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: isSelected
          ? '2px solid #EF4444'
          : '1.5px solid var(--roost-border)',
        borderBottom: isSelected
          ? '4px solid #C93B3B'
          : `4px solid ${t.borderBottom}`,
      }}
    >
      {isSelected && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: '#EF4444' }}
        >
          <Check className="size-3 text-white" strokeWidth={3} />
        </span>
      )}
      <div
        className="flex h-12 w-full flex-col gap-1 overflow-hidden rounded-xl p-1.5"
        style={{ backgroundColor: t.bg }}
      >
        <div
          className="h-2 w-full rounded-md"
          style={{
            backgroundColor: t.topbarBg,
            borderBottom: `1px solid ${t.topbarBorder}`,
          }}
        />
        <div
          className="h-4 w-3/4 rounded-md"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            borderBottom: `2px solid ${t.borderBottom}`,
          }}
        />
      </div>
      <span
        className="text-xs"
        style={{ color: 'var(--roost-text-primary)', fontWeight: 700 }}
      >
        {t.name}
      </span>
    </motion.button>
  );
}

// ---- CategoriesSettingsSection ----------------------------------------------

function CategoriesSettingsSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Receipt');
  const [editColor, setEditColor] = useState('#6B7280');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data } = useQuery<{
    categories: Category[];
    pendingSuggestions?: Category[];
  }>({
    queryKey: ['expenseCategories'],
    queryFn: async () => {
      const r = await fetch('/api/expenses/categories');
      if (!r.ok) throw new Error('Failed to load categories');
      return r.json();
    },
    staleTime: 30_000,
  });

  const customCategories = (data?.categories ?? []).filter((c) => c.is_custom);
  const pendingSuggestions = data?.pendingSuggestions ?? [];

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Category>;
    }) => {
      const r = await fetch(`/api/expenses/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to update category');
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      setEditingId(null);
    },
    onError: (err: Error) =>
      toast.error('Failed to update', { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/expenses/categories/${id}`, {
        method: 'DELETE',
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to delete category');
      }
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      setDeleteConfirmId(null);
      if (data.moved > 0) {
        toast.success(`Category removed`, {
          description: `${data.moved} expense(s) moved to Other.`,
        });
      } else {
        toast.success('Category removed');
      }
    },
    onError: (err: Error) =>
      toast.error('Failed to delete', { description: err.message }),
  });

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--roost-surface)',
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    borderRadius: 10,
    padding: '8px 12px',
    color: 'var(--roost-text-primary)',
    fontWeight: 600,
    fontSize: 13,
    width: '100%',
  };

  return (
    <div className="space-y-4">
      {/* Active custom categories */}
      <SlabCard>
        {customCategories.length === 0 ? (
          <div className="px-4 py-3">
            <p
              className="text-sm"
              style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
            >
              No custom categories yet. Use the expense form to add one.
            </p>
          </div>
        ) : (
          customCategories.map((cat, i) => (
            <div key={cat.id}>
              {i > 0 && (
                <div
                  style={{ height: 1, backgroundColor: 'var(--roost-border)' }}
                />
              )}
              {editingId === cat.id ? (
                <div className="space-y-3 px-4 py-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={inputStyle}
                    placeholder="Category name"
                  />
                  {/* Icon picker */}
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map((iconName) => {
                      const active = editIcon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditIcon(iconName)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl"
                          style={{
                            border: active
                              ? `1.5px solid ${editColor}`
                              : '1.5px solid var(--roost-border)',
                            borderBottom: active
                              ? `3px solid ${editColor}`
                              : '3px solid var(--roost-border-bottom)',
                            backgroundColor: active
                              ? `${editColor}18`
                              : 'transparent',
                          }}
                        >
                          <CategoryIcon
                            icon={iconName}
                            color={
                              active ? editColor : 'var(--roost-text-muted)'
                            }
                            size={14}
                          />
                        </button>
                      );
                    })}
                  </div>
                  {/* Color picker */}
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className="h-6 w-6 rounded-full"
                        style={{
                          backgroundColor: c,
                          boxShadow:
                            editColor === c
                              ? `0 0 0 2px white, 0 0 0 4px ${c}`
                              : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-9 flex-1 rounded-xl text-xs"
                      style={{
                        border: '1.5px solid var(--roost-border)',
                        borderBottom: '3px solid var(--roost-border-bottom)',
                        color: 'var(--roost-text-secondary)',
                        fontWeight: 700,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patchMutation.mutate({
                          id: cat.id,
                          updates: {
                            name: editName,
                            icon: editIcon,
                            color: editColor,
                          },
                        })
                      }
                      disabled={!editName.trim() || patchMutation.isPending}
                      className="h-9 flex-1 rounded-xl text-xs text-white"
                      style={{
                        backgroundColor: '#22C55E',
                        border: '1.5px solid #22C55E',
                        borderBottom: '3px solid #16A34A',
                        fontWeight: 700,
                        opacity:
                          !editName.trim() || patchMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {patchMutation.isPending ? (
                        <Loader2 className="mx-auto size-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <SlabRow topBorder={i > 0}>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <CategoryIcon icon={cat.icon} color={cat.color} size={18} />
                  </div>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                    }}
                  >
                    <Pencil
                      className="size-4"
                      style={{ color: 'var(--roost-text-secondary)' }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(cat.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      border: '1.5px solid #EF444430',
                      borderBottom: '3px solid #EF444440',
                    }}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </button>
                </SlabRow>
              )}
            </div>
          ))
        )}
      </SlabCard>

      {/* Pending suggestions */}
      {pendingSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: '#D97706', fontWeight: 700 }}>
            Pending suggestions
          </p>
          <SlabCard>
            {pendingSuggestions.map((cat, i) => (
              <div key={cat.id}>
                {i > 0 && (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: 'var(--roost-border)',
                    }}
                  />
                )}
                <SlabRow topBorder={i > 0}>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <CategoryIcon icon={cat.icon} color={cat.color} size={18} />
                  </div>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      patchMutation.mutate({
                        id: cat.id,
                        updates: { status: 'active' },
                      })
                    }
                    disabled={patchMutation.isPending}
                    className="h-9 rounded-xl px-3 text-xs text-white"
                    style={{
                      backgroundColor: '#22C55E',
                      border: '1.5px solid #22C55E',
                      borderBottom: '3px solid #16A34A',
                      fontWeight: 700,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchMutation.mutate({
                        id: cat.id,
                        updates: { status: 'rejected' },
                      })
                    }
                    disabled={patchMutation.isPending}
                    className="h-9 rounded-xl px-3 text-xs"
                    style={{
                      border: '1.5px solid #EF444430',
                      borderBottom: '3px solid #EF444440',
                      color: '#EF4444',
                      fontWeight: 700,
                    }}
                  >
                    Reject
                  </button>
                </SlabRow>
              </div>
            ))}
          </SlabCard>
        </div>
      )}

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(v) => !v && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove category?</AlertDialogTitle>
            <AlertDialogDescription>
              Any expenses using this category will be moved to Other.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="h-10 rounded-xl px-4 text-sm"
              style={{
                border: '1.5px solid var(--roost-border)',
                borderBottom: '3px solid var(--roost-border-bottom)',
                color: 'var(--roost-text-primary)',
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                deleteConfirmId && deleteMutation.mutate(deleteConfirmId)
              }
              disabled={deleteMutation.isPending}
              className="h-10 rounded-xl px-4 text-sm text-white"
              style={{
                backgroundColor: '#EF4444',
                border: '1.5px solid #EF4444',
                borderBottom: '3px solid #A63030',
                fontWeight: 800,
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Remove'
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- ChoreCategoriesSettingsSection -----------------------------------------

function ChoreCategoriesSettingsSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('CheckSquare');
  const [editColor, setEditColor] = useState('#EF4444');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data } = useQuery<{
    categories: ChoreCategory[];
    pendingSuggestions?: ChoreCategory[];
  }>({
    queryKey: ['choreCategories'],
    queryFn: async () => {
      const r = await fetch('/api/chore-categories');
      if (!r.ok) throw new Error('Failed to load chore categories');
      return r.json();
    },
    staleTime: 30_000,
  });

  const customCategories = (data?.categories ?? []).filter((c) => c.is_custom);
  const pendingSuggestions = data?.pendingSuggestions ?? [];

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ChoreCategory & { status: string }>;
    }) => {
      const r = await fetch(`/api/chore-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to update category');
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choreCategories'] });
      setEditingId(null);
    },
    onError: (err: Error) =>
      toast.error('Failed to update', { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/chore-categories/${id}`, {
        method: 'DELETE',
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to delete category');
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choreCategories'] });
      setDeleteConfirmId(null);
      toast.success('Category removed');
    },
    onError: (err: Error) =>
      toast.error('Failed to delete', { description: err.message }),
  });

  function startEdit(cat: ChoreCategory) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--roost-surface)',
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    borderRadius: 10,
    padding: '8px 12px',
    color: 'var(--roost-text-primary)',
    fontWeight: 600,
    fontSize: 13,
    width: '100%',
  };

  return (
    <div className="space-y-4">
      <SlabCard>
        {customCategories.length === 0 ? (
          <div className="px-4 py-3">
            <p
              className="text-sm"
              style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
            >
              No custom chore categories yet. Use the chore form to add one.
            </p>
          </div>
        ) : (
          customCategories.map((cat, i) => (
            <div key={cat.id}>
              {i > 0 && (
                <div
                  style={{ height: 1, backgroundColor: 'var(--roost-border)' }}
                />
              )}
              {editingId === cat.id ? (
                <div className="space-y-3 px-4 py-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={inputStyle}
                    placeholder="Category name"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {CHORE_ICON_OPTIONS.map((iconName) => {
                      const active = editIcon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditIcon(iconName)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl"
                          style={{
                            border: active
                              ? `1.5px solid ${editColor}`
                              : '1.5px solid var(--roost-border)',
                            borderBottom: active
                              ? `3px solid ${editColor}`
                              : '3px solid var(--roost-border-bottom)',
                            backgroundColor: active
                              ? `${editColor}18`
                              : 'transparent',
                          }}
                        >
                          <ChoreIcon
                            icon={iconName}
                            color={
                              active ? editColor : 'var(--roost-text-muted)'
                            }
                            size={14}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className="h-6 w-6 rounded-full"
                        style={{
                          backgroundColor: c,
                          boxShadow:
                            editColor === c
                              ? `0 0 0 2px white, 0 0 0 4px ${c}`
                              : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-9 flex-1 rounded-xl text-xs"
                      style={{
                        border: '1.5px solid var(--roost-border)',
                        borderBottom: '3px solid var(--roost-border-bottom)',
                        color: 'var(--roost-text-secondary)',
                        fontWeight: 700,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patchMutation.mutate({
                          id: cat.id,
                          updates: {
                            name: editName,
                            icon: editIcon,
                            color: editColor,
                          },
                        })
                      }
                      disabled={!editName.trim() || patchMutation.isPending}
                      className="h-9 flex-1 rounded-xl text-xs text-white"
                      style={{
                        backgroundColor: '#EF4444',
                        border: '1.5px solid #EF4444',
                        borderBottom: '3px solid #C93B3B',
                        fontWeight: 700,
                        opacity:
                          !editName.trim() || patchMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {patchMutation.isPending ? (
                        <Loader2 className="mx-auto size-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <SlabRow topBorder={i > 0}>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <ChoreIcon icon={cat.icon} color={cat.color} size={18} />
                  </div>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                    }}
                  >
                    <Pencil
                      className="size-4"
                      style={{ color: 'var(--roost-text-secondary)' }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(cat.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      border: '1.5px solid #EF444430',
                      borderBottom: '3px solid #EF444440',
                    }}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </button>
                </SlabRow>
              )}
            </div>
          ))
        )}
      </SlabCard>

      {pendingSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: '#D97706', fontWeight: 700 }}>
            Pending suggestions
          </p>
          <SlabCard>
            {pendingSuggestions.map((cat, i) => (
              <div key={cat.id}>
                {i > 0 && (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: 'var(--roost-border)',
                    }}
                  />
                )}
                <SlabRow topBorder={i > 0}>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <ChoreIcon icon={cat.icon} color={cat.color} size={18} />
                  </div>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      patchMutation.mutate({
                        id: cat.id,
                        updates: { status: 'active' },
                      })
                    }
                    disabled={patchMutation.isPending}
                    className="h-9 rounded-xl px-3 text-xs text-white"
                    style={{
                      backgroundColor: '#22C55E',
                      border: '1.5px solid #22C55E',
                      borderBottom: '3px solid #16A34A',
                      fontWeight: 700,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchMutation.mutate({
                        id: cat.id,
                        updates: { status: 'rejected' },
                      })
                    }
                    disabled={patchMutation.isPending}
                    className="h-9 rounded-xl px-3 text-xs"
                    style={{
                      border: '1.5px solid #EF444430',
                      borderBottom: '3px solid #EF444440',
                      color: '#EF4444',
                      fontWeight: 700,
                    }}
                  >
                    Reject
                  </button>
                </SlabRow>
              </div>
            ))}
          </SlabCard>
        </div>
      )}

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(v) => !v && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove category?</AlertDialogTitle>
            <AlertDialogDescription>
              Any chores using this category will be unassigned from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="h-10 rounded-xl px-4 text-sm"
              style={{
                border: '1.5px solid var(--roost-border)',
                borderBottom: '3px solid var(--roost-border-bottom)',
                color: 'var(--roost-text-primary)',
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                deleteConfirmId && deleteMutation.mutate(deleteConfirmId)
              }
              disabled={deleteMutation.isPending}
              className="h-10 rounded-xl px-4 text-sm text-white"
              style={{
                backgroundColor: '#EF4444',
                border: '1.5px solid #EF4444',
                borderBottom: '3px solid #A63030',
                fontWeight: 800,
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Remove'
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { data: sessionData } = useSession();
  const { household, role, isPremium } = useHousehold();
  const { temperatureUnit, latitude, longitude, updatePreferences } =
    useUserPreferences();

  const isAdmin = role === 'admin';
  const householdId = household?.id ?? '';
  const themeKeys = Object.keys(THEMES) as ThemeKey[];

  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);

  // ---- Profile state --------------------------------------------------------
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTimezone, setProfileTimezone] = useState('America/New_York');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // ---- Household state ------------------------------------------------------
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [codeRegenerating, setCodeRegenerating] = useState(false);
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);

  // ---- Members state --------------------------------------------------------
  const [selectedMember, setSelectedMember] = useState<SheetMember | null>(
    null,
  );
  const [inviteGuestOpen, setInviteGuestOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);

  // ---- Danger zone state ----------------------------------------------------
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [deleteDataConfirm, setDeleteDataConfirm] = useState('');
  const [deleteDataStep2, setDeleteDataStep2] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deleteHouseOpen, setDeleteHouseOpen] = useState(false);
  const [deleteHouseConfirm, setDeleteHouseConfirm] = useState('');
  const [deleteHouseStep2, setDeleteHouseStep2] = useState(false);
  const [deletingHouse, setDeletingHouse] = useState(false);

  // ---- Promo code state -----------------------------------------------------
  const [promoInput, setPromoInput] = useState('');
  const [promoRedeeming, setPromoRedeeming] = useState(false);

  const { data: promoStatus } = useQuery<{
    redemptions: {
      id: string;
      code: string;
      durationDays: number;
      isLifetime: boolean;
      redeemedAt: string;
      premiumExpiresAt: string | null;
    }[];
  }>({
    queryKey: ['promo-status'],
    queryFn: async () => {
      const r = await fetch('/api/promo-codes/status');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 60_000,
  });

  async function handleRedeemPromo() {
    if (!promoInput.trim()) return;
    setPromoRedeeming(true);
    try {
      const r = await fetch('/api/promo-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error('Could not redeem code', {
          description: data.error || 'Something went wrong.',
        });
        return;
      }
      toast.success('Promo code redeemed', {
        description: data.message,
      });
      setPromoInput('');
      queryClient.invalidateQueries({ queryKey: ['promo-status'] });
      queryClient.invalidateQueries({ queryKey: ['household'] });
    } catch {
      toast.error('Could not redeem code', {
        description: 'Something went wrong. Try again.',
      });
    } finally {
      setPromoRedeeming(false);
    }
  }

  // ---- Desktop nav ----------------------------------------------------------
  const [activeSection, setActiveSection] = useState('section-profile');

  useEffect(() => {
    function onScroll() {
      const visibleIds = NAV_SECTIONS.filter(
        (s) => !s.adminOnly || isAdmin,
      ).map((s) => s.id);
      const midpoint = window.innerHeight / 2;
      let best: string = visibleIds[0];
      let bestDist = Infinity;
      for (const id of visibleIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        // Distance from top of section to viewport midpoint — prefer sections whose top is above midpoint
        const dist = top <= midpoint ? midpoint - top : Infinity;
        if (dist < bestDist) {
          bestDist = dist;
          best = id;
        }
      }
      setActiveSection(best);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isAdmin]);

  // ---- Fetch profile --------------------------------------------------------
  const { data: profileData } = useQuery<{
    user: {
      name: string;
      email: string;
      avatar_color: string | null;
      timezone: string;
    };
  }>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const r = await fetch('/api/user/profile');
      if (!r.ok) throw new Error('Failed to load profile');
      return r.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!profileData?.user) return;
    setProfileName(profileData.user.name);
    setProfileEmail(profileData.user.email ?? '');
    setProfileTimezone(profileData.user.timezone);
    setSelectedColor(profileData.user.avatar_color);
  }, [profileData]);

  // ---- Sync household state -------------------------------------------------
  useEffect(() => {
    if (household) {
      setHouseholdName(household.name);
      setInviteCode(household.code);
    }
  }, [household]);

  // ---- Fetch members --------------------------------------------------------
  const { data: membersData, refetch: refetchMembers } = useQuery<{
    members: SheetMember[];
  }>({
    queryKey: ['household-members'],
    queryFn: async () => {
      const r = await fetch('/api/household/members');
      if (!r.ok) throw new Error('Failed to load members');
      return r.json();
    },
    staleTime: 10_000,
  });

  const members = membersData?.members ?? [];

  // ---- Location (also used in preferences section) --------------------------
  const [locationUpdating, setLocationUpdating] = useState(false);

  function handleUpdateLocation() {
    if (!navigator.geolocation) {
      toast.error('Location not available', {
        description: 'Your browser does not support geolocation.',
      });
      return;
    }
    setLocationUpdating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updatePreferences({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('Location updated');
        } catch {
          toast.error('Could not save location', {
            description: 'Something went wrong. Try again.',
          });
        } finally {
          setLocationUpdating(false);
        }
      },
      (error) => {
        console.log('Location denied:', error.message);
        setLocationUpdating(false);
        toast.error('Location access was denied', {
          description: 'You can enable it in your browser settings.',
        });
      },
      { timeout: 10_000 },
    );
  }

  // ---- Profile save ---------------------------------------------------------
  async function saveProfileField(field: string, value: unknown) {
    setProfileSaving(true);
    try {
      const r = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to save');
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Saved');
    } catch (err) {
      toast.error('Could not save', { description: (err as Error).message });
    } finally {
      setProfileSaving(false);
    }
  }

  // ---- Password change ------------------------------------------------------
  const pwStrength = newPw.length > 0 ? getStrength(newPw) : null;
  const pwsMatch = newPw === confirmPw;
  const pwValid =
    !!pwStrength && pwStrength !== 'weak' && pwsMatch && !!currentPw;

  async function handlePasswordChange() {
    if (!pwValid) return;
    setPwSaving(true);
    try {
      const r = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      toast.success('Password changed');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast.error('Could not change password', {
        description: (err as Error).message,
      });
    } finally {
      setPwSaving(false);
    }
  }

  // ---- Household name save --------------------------------------------------
  async function saveHouseholdName() {
    try {
      const r = await fetch(`/api/household/${householdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      queryClient.invalidateQueries({ queryKey: ['household'] });
      queryClient.invalidateQueries({ queryKey: ['household-members'] });
      toast.success('Household name saved');
    } catch (err) {
      toast.error('Could not save household name', {
        description: (err as Error).message,
      });
    }
  }

  // ---- Regenerate code ------------------------------------------------------
  async function regenerateCode() {
    setCodeRegenerating(true);
    try {
      const r = await fetch(`/api/household/${householdId}/regenerate-code`, {
        method: 'POST',
      });
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      setInviteCode(d.code);
      queryClient.invalidateQueries({ queryKey: ['household-members'] });
      toast.success('New invite code generated');
    } catch {
      toast.error('Could not regenerate code', {
        description: 'Something went wrong. Try again.',
      });
    } finally {
      setCodeRegenerating(false);
      setRegenConfirmOpen(false);
    }
  }

  // ---- Transfer admin -------------------------------------------------------
  async function handleTransfer() {
    if (!transferTarget) return;
    try {
      const r = await fetch(`/api/household/${householdId}/transfer-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAdminUserId: transferTarget }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      toast.success('Admin transferred');
      queryClient.invalidateQueries({ queryKey: ['household'] });
      queryClient.invalidateQueries({ queryKey: ['household-members'] });
      setTransferConfirmOpen(false);
      setTransferOpen(false);
    } catch (err) {
      toast.error('Could not transfer admin', {
        description: (err as Error).message,
      });
    }
  }

  // ---- Temp unit ------------------------------------------------------------
  async function handleTempUnitChange(unit: 'fahrenheit' | 'celsius') {
    try {
      await updatePreferences({ temperature_unit: unit });
      toast.success('Preference saved');
    } catch {
      toast.error('Could not save preference', {
        description: 'Something went wrong. Try again.',
      });
    }
  }

  // ---- Delete all data ------------------------------------------------------
  async function handleDeleteData() {
    setDeletingData(true);
    try {
      const r = await fetch(`/api/household/${householdId}/delete-data`, {
        method: 'POST',
      });
      if (!r.ok) throw new Error('Failed');
      toast.success('All household data deleted');
      queryClient.invalidateQueries();
      setDeleteDataOpen(false);
      setDeleteDataStep2(false);
      setDeleteDataConfirm('');
    } catch {
      toast.error('Could not delete data', {
        description: 'Something went wrong. Try again.',
      });
    } finally {
      setDeletingData(false);
    }
  }

  // ---- Delete household -----------------------------------------------------
  async function handleDeleteHousehold() {
    setDeletingHouse(true);
    try {
      const r = await fetch(`/api/household/${householdId}`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error('Failed');
      toast.success('Household deleted');
      router.push('/onboarding');
    } catch {
      toast.error('Could not delete household', {
        description: 'Something went wrong. Try again.',
      });
      setDeletingHouse(false);
    }
  }

  const userName = sessionData?.user?.name ?? '';

  // ---- Render ----------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: 'var(--roost-bg)' }}
    >
      <PageContainer className="flex gap-8">
        {/* Desktop left nav */}
        <nav className="hidden w-44 shrink-0 lg:block">
          <div className="sticky top-20 space-y-1">
            {NAV_SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  document
                    .getElementById(s.id)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex h-9 w-full items-center rounded-xl px-3 text-sm text-left"
                style={{
                  backgroundColor:
                    activeSection === s.id
                      ? 'var(--roost-surface)'
                      : 'transparent',
                  border:
                    activeSection === s.id
                      ? '1.5px solid var(--roost-border)'
                      : '1.5px solid transparent',
                  color:
                    activeSection === s.id
                      ? 'var(--roost-text-primary)'
                      : 'var(--roost-text-muted)',
                  fontWeight: activeSection === s.id ? 700 : 600,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-10">
          <h1
            className="text-2xl md:text-3xl"
            style={{ color: 'var(--roost-text-primary)', fontWeight: 900 }}
          >
            Settings
          </h1>

          {/* ---- SECTION 1: PROFILE ----------------------------------------- */}
          <SettingsSection
            id="section-profile"
            title="Profile"
            subtitle="Your personal account details."
          >
            <SlabCard>
              {/* Avatar + color picker */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl text-white"
                    style={{
                      backgroundColor:
                        selectedColor ?? '#2563EB',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                      fontWeight: 800,
                    }}
                  >
                    {initials(userName)}
                  </div>
                  <div>
                    <p
                      className="text-sm"
                      style={{
                        color: 'var(--roost-text-primary)',
                        fontWeight: 700,
                      }}
                    >
                      Avatar color
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={async () => {
                            setSelectedColor(color);
                            await saveProfileField('avatar_color', color);
                          }}
                          className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                          style={{
                            backgroundColor: color,
                            border:
                              selectedColor === color
                                ? '2.5px solid var(--roost-text-primary)'
                                : '2px solid transparent',
                            outline:
                              selectedColor === color
                                ? `2px solid ${color}`
                                : undefined,
                            outlineOffset: '1px',
                          }}
                          aria-label={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div
                className="px-4 pb-1 pt-2 space-y-1.5"
                style={{ borderTop: '1px solid var(--roost-border)' }}
              >
                <label
                  className="text-xs"
                  style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}
                >
                  Display name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="Your name"
                  />
                  {profileName !== (profileData?.user?.name ?? '') && (
                    <motion.button
                      type="button"
                      whileTap={{ y: 1 }}
                      disabled={profileSaving}
                      onClick={() => saveProfileField('name', profileName)}
                      className="h-11 shrink-0 rounded-xl px-4 text-sm text-white"
                      style={{
                        backgroundColor: 'var(--roost-text-primary)',
                        border: '1.5px solid var(--roost-border)',
                        borderBottom: '3px solid rgba(0,0,0,0.2)',
                        fontWeight: 700,
                      }}
                    >
                      Save
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Email */}
              <div
                className="px-4 pb-1 pt-3 space-y-1.5"
                style={{ borderTop: '1px solid var(--roost-border)' }}
              >
                <label
                  className="text-xs"
                  style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}
                >
                  Email address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="you@example.com"
                  />
                  {profileEmail !== (profileData?.user?.email ?? '') && (
                    <motion.button
                      type="button"
                      whileTap={{ y: 1 }}
                      disabled={profileSaving}
                      onClick={() => saveProfileField('email', profileEmail)}
                      className="h-11 shrink-0 rounded-xl px-4 text-sm text-white"
                      style={{
                        backgroundColor: 'var(--roost-text-primary)',
                        border: '1.5px solid var(--roost-border)',
                        borderBottom: '3px solid rgba(0,0,0,0.2)',
                        fontWeight: 700,
                      }}
                    >
                      Save
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Timezone */}
              <div
                className="px-4 pb-3 pt-3 space-y-1.5"
                style={{ borderTop: '1px solid var(--roost-border)' }}
              >
                <label
                  className="text-xs"
                  style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}
                >
                  Timezone
                </label>
                <select
                  value={profileTimezone}
                  onChange={(e) => {
                    setProfileTimezone(e.target.value);
                    saveProfileField('timezone', e.target.value);
                  }}
                  className={`${inputClass} cursor-pointer`}
                  style={inputStyle}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </SlabCard>

            {/* Password change */}
            <SlabCard>
              <div className="p-4">
                <p
                  className="text-sm mb-3"
                  style={{
                    color: 'var(--roost-text-primary)',
                    fontWeight: 700,
                  }}
                >
                  Change password
                </p>
                <div className="space-y-2.5">
                  {/* Current */}
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="Current password"
                      className={`${inputClass} pr-11`}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--roost-text-muted)' }}
                      tabIndex={-1}
                    >
                      {showCurrent ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {/* New */}
                  <div>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="New password"
                        className={`${inputClass} pr-11`}
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--roost-text-muted)' }}
                        tabIndex={-1}
                      >
                        {showNew ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {pwStrength &&
                      (() => {
                        const cfg = STRENGTH_CONFIG[pwStrength];
                        return (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex flex-1 gap-1">
                              {[0, 1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="h-1.5 flex-1 rounded-full"
                                  style={{
                                    backgroundColor:
                                      i < cfg.segments
                                        ? cfg.color
                                        : 'var(--roost-border)',
                                  }}
                                />
                              ))}
                            </div>
                            <span
                              className="text-xs"
                              style={{ color: cfg.color, fontWeight: 700 }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        );
                      })()}
                  </div>
                  {/* Confirm */}
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Confirm new password"
                      className={`${inputClass} pr-11`}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--roost-text-muted)' }}
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    disabled={!pwValid || pwSaving}
                    onClick={handlePasswordChange}
                    className="flex h-11 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                    style={{
                      backgroundColor: '#E24B4A',
                      border: '1.5px solid #E24B4A',
                      borderBottom: '3px solid rgba(0,0,0,0.2)',
                      fontWeight: 800,
                    }}
                  >
                    Change password
                  </motion.button>
                </div>
              </div>
            </SlabCard>
          </SettingsSection>

          {/* ---- SECTION 2: APPEARANCE --------------------------------------- */}
          <SettingsSection
            id="section-appearance"
            title="Appearance"
            subtitle="Your theme is only visible to you."
          >
            <div className="grid grid-cols-2 gap-3">
              {themeKeys.map((key) => (
                <ThemeCard
                  key={key}
                  themeKey={key}
                  isSelected={theme === key}
                  onSelect={() => setTheme(key)}
                />
              ))}
            </div>
          </SettingsSection>

          {/* ---- SECTION 3: PREFERENCES ------------------------------------- */}
          <SettingsSection id="section-preferences" title="Preferences">
            <SlabCard>
              {/* Temperature unit */}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Thermometer
                    className="size-4 shrink-0"
                    style={{ color: 'var(--roost-text-muted)' }}
                  />
                  <div>
                    <p
                      className="text-sm"
                      style={{
                        color: 'var(--roost-text-primary)',
                        fontWeight: 700,
                      }}
                    >
                      Temperature
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: 'var(--roost-text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      Preferred unit for weather display.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['fahrenheit', 'celsius'] as const).map((unit) => {
                    const active = temperatureUnit === unit;
                    return (
                      <motion.button
                        key={unit}
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={() => handleTempUnitChange(unit)}
                        className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                        style={{
                          backgroundColor: active ? '#E24B4A' : 'var(--roost-bg)',
                          border: '1.5px solid var(--roost-border)',
                          borderBottom: '3px solid var(--roost-border-bottom)',
                          color: active ? '#fff' : 'var(--roost-text-secondary)',
                          fontWeight: 700,
                        }}
                      >
                        {unit === 'fahrenheit' ? '°F Fahrenheit' : '°C Celsius'}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Weather location */}
              <div
                className="flex items-center gap-3 p-4"
                style={{ borderTop: '1px solid var(--roost-border)' }}
              >
                <MapPin
                  className="size-4 shrink-0"
                  style={{ color: 'var(--roost-text-muted)' }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm"
                    style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    Weather Location
                  </p>
                  {latitude !== null && longitude !== null ? (
                    <>
                      <p
                        className="text-xs"
                        style={{
                          color: 'var(--roost-text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        Using your current location
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: 'var(--roost-text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {latitude.toFixed(2)}, {longitude.toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p
                        className="text-xs"
                        style={{
                          color: 'var(--roost-text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        Location not set
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: 'var(--roost-text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        Allow location access for accurate weather.
                      </p>
                    </>
                  )}
                </div>
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={handleUpdateLocation}
                  disabled={locationUpdating}
                  className="shrink-0 h-9 rounded-xl px-3 text-sm"
                  style={{
                    backgroundColor: 'var(--roost-bg)',
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: '3px solid var(--roost-border-bottom)',
                    color: 'var(--roost-text-secondary)',
                    fontWeight: 700,
                    opacity: locationUpdating ? 0.6 : 1,
                  }}
                >
                  {locationUpdating ? 'Updating...' : 'Update'}
                </motion.button>
              </div>

              {/* Language */}
              <div
                className="p-4 space-y-2"
                style={{ borderTop: '1px solid var(--roost-border)' }}
              >
                <p
                  className="text-sm"
                  style={{
                    color: 'var(--roost-text-primary)',
                    fontWeight: 700,
                  }}
                >
                  Language
                </p>
                <div className="flex gap-2">
                  {['English', 'Español'].map((lang) => {
                    const active = lang === 'English';
                    return (
                      <motion.button
                        key={lang}
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={() => {
                          if (lang === 'Español')
                            toast.info('Spanish translation coming soon.');
                        }}
                        className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                        style={{
                          backgroundColor: active ? '#E24B4A' : 'var(--roost-bg)',
                          border: '1.5px solid var(--roost-border)',
                          borderBottom: '3px solid var(--roost-border-bottom)',
                          color: active ? '#fff' : 'var(--roost-text-secondary)',
                          fontWeight: 700,
                        }}
                      >
                        {lang}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </SlabCard>
          </SettingsSection>

          {/* ---- SECTION 4: HOUSEHOLD --------------------------------------- */}
          <SettingsSection
            id="section-household"
            title="Household"
            subtitle="Manage your household settings."
          >
            <SlabCard>
              {/* Household name */}
              <div className="p-4 space-y-1.5">
                <label
                  className="text-xs"
                  style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}
                >
                  Household name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    disabled={!isAdmin}
                    className={inputClass}
                    style={{ ...inputStyle, opacity: isAdmin ? 1 : 0.7 }}
                    placeholder="Your household name"
                  />
                  {isAdmin &&
                    householdName !== household?.name &&
                    householdName.trim() && (
                      <motion.button
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={saveHouseholdName}
                        className="h-11 shrink-0 rounded-xl px-4 text-sm text-white"
                        style={{
                          backgroundColor: '#C0160C',
                          border: '1.5px solid var(--roost-border)',
                          borderBottom: '3px solid rgba(0,0,0,0.2)',
                          fontWeight: 700,
                        }}
                      >
                        Save
                      </motion.button>
                    )}
                </div>
              </div>

              {/* Invite code */}
              <div
                className="p-4 space-y-2"
                style={{ borderTop: '1px solid var(--roost-border)' }}
              >
                <p
                  className="text-sm"
                  style={{
                    color: 'var(--roost-text-primary)',
                    fontWeight: 700,
                  }}
                >
                  Invite code
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
                >
                  Share this code so housemates can join.
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-xl px-4 py-3 font-mono text-xl tracking-widest"
                    style={{
                      backgroundColor: 'var(--roost-bg)',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                      color: 'var(--roost-text-primary)',
                      fontWeight: 800,
                      letterSpacing: '0.2em',
                    }}
                  >
                    {inviteCode}
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode);
                      toast.success('Code copied to clipboard');
                    }}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: 'var(--roost-bg)',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                    }}
                  >
                    <Copy
                      className="size-4"
                      style={{ color: 'var(--roost-text-muted)' }}
                    />
                  </motion.button>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setRegenConfirmOpen(true)}
                    className="text-sm"
                    style={{
                      color: 'var(--roost-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Generate new code
                  </button>
                )}
              </div>

              {/* Subscription */}
              <div
                className="flex items-center justify-between p-4"
                style={{ borderTop: '1px solid var(--roost-border)' }}
              >
                <div>
                  <p
                    className="text-sm"
                    style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    Subscription
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: 'var(--roost-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {isPremium ? 'Premium plan active' : 'Free plan'}
                  </p>
                </div>
                {isPremium ? (
                  <span
                    className="rounded-xl px-3 py-1 text-xs text-white"
                    style={{ backgroundColor: '#22C55E', fontWeight: 700 }}
                  >
                    Premium
                  </span>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => router.push('/settings/billing')}
                    className="h-9 rounded-xl px-3 text-sm text-white"
                    style={{
                      backgroundColor: '#C0160C',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid rgba(0,0,0,0.2)',
                      fontWeight: 700,
                    }}
                  >
                    Upgrade
                  </motion.button>
                )}
              </div>

              {/* Transfer admin */}
              {isAdmin && (
                <div
                  className="p-4"
                  style={{ borderTop: '1px solid var(--roost-border)' }}
                >
                  <p
                    className="text-sm"
                    style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    Transfer admin
                  </p>
                  <p
                    className="text-xs mt-0.5 mb-3"
                    style={{
                      color: 'var(--roost-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Give admin control to another member. You will become a
                    regular member.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTransferOpen(true)}
                    className="text-sm"
                    style={{
                      color: 'var(--roost-text-muted)',
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    Transfer admin
                  </button>
                </div>
              )}
            </SlabCard>
          </SettingsSection>

          {/* ---- SECTION 5: MEMBERS ------------------------------------------ */}
          <SettingsSection
            id="section-members"
            title="Members"
            subtitle={
              isAdmin
                ? 'Manage who is in your household. Click a name to adjust their privileges.'
                : 'Everyone in your household.'
            }
          >
            {isAdmin && members.some((m) => m.role === 'child') && (
              <p
                className="mb-3 text-[13px]"
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Set up rewards for children on the Chores page.
                Rewards are evaluated automatically based on the period you choose.
              </p>
            )}
            <SlabCard>
              {members.map((m, i) => {
                const isGuest = m.role === 'guest';
                const guestExpiry =
                  isGuest && m.expiresAt
                    ? formatGuestExpiry(m.expiresAt)
                    : null;

                const roleBadge = isGuest ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #F59E0B',
                      color: '#92400E',
                      fontWeight: 700,
                    }}
                  >
                    <Clock className="size-3" />
                    Guest{guestExpiry ? ` · ${guestExpiry}` : ''}
                  </span>
                ) : (
                  <span
                    className="shrink-0 rounded-lg px-2 py-0.5 text-xs capitalize"
                    style={{
                      backgroundColor:
                        m.role === 'admin'
                          ? '#C0160C'
                          : 'var(--roost-border)',
                      color:
                        m.role === 'admin'
                          ? '#ffffff'
                          : 'var(--roost-text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    {m.role}
                  </span>
                );

                if (isAdmin) {
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="flex w-full min-h-14 items-center gap-3 px-4 text-left"
                      style={{
                        borderTop:
                          i > 0 ? '1px solid var(--roost-border)' : undefined,
                      }}
                    >
                      <MemberAvatar
                        name={m.name}
                        avatarColor={m.avatarColor}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm"
                          style={{
                            color: 'var(--roost-text-primary)',
                            fontWeight: 700,
                          }}
                        >
                          {m.name}
                        </p>
                        <p
                          className="text-xs capitalize"
                          style={{
                            color: 'var(--roost-text-muted)',
                            fontWeight: 600,
                          }}
                        >
                          {isGuest ? 'Guest member' : m.role}
                        </p>
                      </div>
                      {roleBadge}
                    </button>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className="flex min-h-14 items-center gap-3 px-4"
                    style={{
                      borderTop:
                        i > 0 ? '1px solid var(--roost-border)' : undefined,
                    }}
                  >
                    <MemberAvatar
                      name={m.name}
                      avatarColor={m.avatarColor}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm"
                        style={{
                          color: 'var(--roost-text-primary)',
                          fontWeight: 700,
                        }}
                      >
                        {m.name}
                      </p>
                      <p
                        className="text-xs capitalize"
                        style={{
                          color: 'var(--roost-text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {isGuest ? 'Guest member' : m.role}
                      </p>
                    </div>
                    {roleBadge}
                  </div>
                );
              })}
            </SlabCard>

            {isAdmin && (
              <div className="mt-3 flex flex-col gap-2">
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => setAddChildOpen(true)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'var(--roost-surface)',
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: '3px solid var(--roost-border-bottom)',
                    color: 'var(--roost-text-secondary)',
                    fontWeight: 700,
                  }}
                >
                  <UserPlus className="size-4" />
                  Add Child Account
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => {
                    if (!isPremium) {
                      setUpgradeCode('GUEST_MEMBER_PREMIUM');
                    } else {
                      setInviteGuestOpen(true);
                    }
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'var(--roost-surface)',
                    border: '1.5px solid var(--roost-border)',
                    borderBottom: '3px solid var(--roost-border-bottom)',
                    color: 'var(--roost-text-secondary)',
                    fontWeight: 700,
                  }}
                >
                  <UserPlus className="size-4" />
                  Invite Temporary Guest
                </motion.button>

                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: 'var(--roost-bg)',
                    border: '1px solid var(--roost-border)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--roost-text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    Child accounts use a 4-digit PIN to log in at{' '}
                    <span style={{ color: '#EF4444' }}>roost.app/child-login</span>.
                    No email needed. Share the household code and PIN with them.
                  </p>
                </div>
              </div>
            )}
          </SettingsSection>

          {/* ---- SECTION 6: NOTIFICATIONS ----------------------------------- */}
          <SettingsSection
            id="section-notifications"
            title="Notifications"
            subtitle="Push notifications are available in the iOS and Android apps. Coming soon."
          >
            <p style={{ fontSize: 14, color: 'var(--roost-text-muted)' }}>
              No settings available yet.
            </p>
          </SettingsSection>

          {/* ---- SECTION 7: CATEGORIES (admin only) ------------------------- */}
          {isAdmin && (
            <SettingsSection
              id="section-categories"
              title="Categories"
              subtitle="Manage expense categories for your household."
            >
              <CategoriesSettingsSection />
            </SettingsSection>
          )}

          {/* ---- SECTION 7b: CHORE CATEGORIES (admin only) ------------------ */}
          {isAdmin && (
            <SettingsSection
              id="section-chore-categories"
              title="Chore Categories"
              subtitle="Manage chore categories and approve member suggestions."
            >
              <ChoreCategoriesSettingsSection />
            </SettingsSection>
          )}

          {/* ---- SECTION: PROMOTIONS ---------------------------------------- */}
          <SettingsSection
            id="section-promotions"
            title="Promotions"
            subtitle="Have a promo code? Enter it below to unlock free premium."
          >
            <SlabCard>
              <div className="p-4 space-y-4">
                {/* Redeem input */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) =>
                      setPromoInput(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRedeemPromo();
                      }
                    }}
                    placeholder="Enter promo code"
                    maxLength={32}
                    className="flex h-11 flex-1 rounded-xl px-3 text-sm"
                    style={{
                      backgroundColor: 'var(--roost-bg)',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      fontSize: '16px',
                      outline: 'none',
                    }}
                  />
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={handleRedeemPromo}
                    disabled={promoRedeeming || !promoInput.trim()}
                    className="flex h-11 items-center justify-center rounded-xl px-5 text-sm text-white"
                    style={{
                      backgroundColor: '#E24B4A',
                      border: '1.5px solid #E24B4A',
                      borderBottom: '3px solid rgba(0,0,0,0.2)',
                      fontWeight: 800,
                      opacity:
                        promoRedeeming || !promoInput.trim() ? 0.5 : 1,
                      cursor:
                        promoRedeeming || !promoInput.trim()
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {promoRedeeming ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Redeem'
                    )}
                  </motion.button>
                </div>

                {/* Active promo status */}
                {promoStatus?.redemptions &&
                  promoStatus.redemptions.length > 0 && (
                    <div className="space-y-3">
                      {promoStatus.redemptions.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 rounded-xl p-3"
                          style={{
                            backgroundColor: 'var(--roost-bg)',
                            border: '1.5px solid var(--roost-border)',
                            borderBottom: '3px solid #4338CA',
                          }}
                        >
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: '#6366F120',
                              border: '1px solid #6366F130',
                            }}
                          >
                            <Tag
                              size={18}
                              color="#6366F1"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className="text-sm"
                                style={{
                                  color: 'var(--roost-text-primary)',
                                  fontWeight: 700,
                                }}
                              >
                                Premium via promo code
                              </p>
                              <span
                                className="rounded-md px-2 py-0.5 text-xs text-white"
                                style={{
                                  backgroundColor: '#22C55E',
                                  fontWeight: 700,
                                }}
                              >
                                Active
                              </span>
                            </div>
                            <p
                              className="text-xs mt-0.5"
                              style={{
                                color: 'var(--roost-text-muted)',
                                fontWeight: 600,
                              }}
                            >
                              Code: {r.code} ·{' '}
                              {r.isLifetime || !r.premiumExpiresAt ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <InfinityIcon size={12} />
                                  Never expires
                                </span>
                              ) : (
                                <>
                                  Expires{' '}
                                  {(() => {
                                    try {
                                      return new Date(
                                        r.premiumExpiresAt
                                      ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      });
                                    } catch {
                                      return r.premiumExpiresAt;
                                    }
                                  })()}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Info note */}
                <p
                  className="text-xs"
                  style={{
                    color: 'var(--roost-text-muted)',
                    fontWeight: 600,
                  }}
                >
                  When your promotion expires, your household will return to
                  the free plan unless you subscribe.
                </p>
              </div>
            </SlabCard>
          </SettingsSection>

          {/* ---- SECTION: BILLING --------------------------------------------- */}
          <SettingsSection id="section-billing" title="Billing">
            <SlabCard>
              <div className="p-4">
                {isPremium ? (
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-xl px-3 py-1 text-sm text-white"
                      style={{ backgroundColor: '#22C55E', fontWeight: 700 }}
                    >
                      Premium
                    </span>
                    <p
                      className="text-sm"
                      style={{
                        color: 'var(--roost-text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      Premium plan active
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p
                        className="text-sm"
                        style={{
                          color: 'var(--roost-text-primary)',
                          fontWeight: 700,
                        }}
                      >
                        Free plan
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{
                          color: 'var(--roost-text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        Upgrade to Premium for $4/month — unlock the full Roost
                        experience for your whole household.
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ y: 1 }}
                      onClick={() => router.push('/settings/billing')}
                      className="flex h-11 w-full items-center justify-center rounded-xl text-sm text-white"
                      style={{
                        backgroundColor: '#C0160C',
                        border: '1.5px solid var(--roost-border)',
                        borderBottom: '3px solid rgba(0,0,0,0.2)',
                        fontWeight: 800,
                      }}
                    >
                      Upgrade to Premium
                    </motion.button>
                  </div>
                )}
                {isPremium && (
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => router.push('/settings/billing')}
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm"
                    style={{
                      backgroundColor: 'var(--roost-bg)',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                      color: 'var(--roost-text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    Manage billing
                  </motion.button>
                )}
              </div>
            </SlabCard>
          </SettingsSection>

          {/* ---- SECTION 8: DANGER ZONE (admin only) ------------------------ */}
          {isAdmin && (
            <SettingsSection id="section-danger" title="Danger Zone">
              <div
                className="overflow-hidden rounded-2xl"
                style={{
                  border: '1.5px solid #EF444430',
                  borderBottom: '4px solid #EF444460',
                  backgroundColor: 'var(--roost-surface)',
                }}
              >
                {/* Delete all data */}
                <div className="p-4">
                  <p
                    className="text-sm"
                    style={{ color: '#EF4444', fontWeight: 700 }}
                  >
                    Delete all household data
                  </p>
                  <p
                    className="text-xs mt-0.5 mb-3"
                    style={{
                      color: 'var(--roost-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Permanently deletes all chores, grocery lists, expenses,
                    notes, and calendar events. Members stay in the household.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteDataOpen(true);
                      setDeleteDataStep2(false);
                      setDeleteDataConfirm('');
                    }}
                    className="h-10 rounded-xl px-4 text-sm"
                    style={{
                      border: '1.5px solid #EF444430',
                      borderBottom: '3px solid #EF444445',
                      color: '#EF4444',
                      fontWeight: 700,
                    }}
                  >
                    Delete all data
                  </button>
                </div>

                {/* Delete household */}
                <div
                  className="p-4"
                  style={{ borderTop: '1px solid #EF444420' }}
                >
                  <p
                    className="text-sm"
                    style={{ color: '#EF4444', fontWeight: 700 }}
                  >
                    Delete household
                  </p>
                  <p
                    className="text-xs mt-0.5 mb-3"
                    style={{
                      color: 'var(--roost-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Permanently deletes the household and removes all members.
                    This cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteHouseOpen(true);
                      setDeleteHouseStep2(false);
                      setDeleteHouseConfirm('');
                    }}
                    className="h-10 rounded-xl px-4 text-sm"
                    style={{
                      border: '1.5px solid #EF444430',
                      borderBottom: '3px solid #EF444445',
                      color: '#EF4444',
                      fontWeight: 700,
                    }}
                  >
                    Delete household
                  </button>
                </div>
              </div>
            </SettingsSection>
          )}
        </div>

        {/* ---- Modals -------------------------------------------------------- */}

        {/* Regenerate code confirm */}
        <AlertDialog open={regenConfirmOpen} onOpenChange={setRegenConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle
                style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
              >
                Generate new invite code?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                The old code will stop working immediately. Anyone with the old
                code will not be able to join.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setRegenConfirmOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={regenerateCode}
                disabled={codeRegenerating}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--roost-text-primary)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid rgba(0,0,0,0.2)',
                  fontWeight: 800,
                }}
              >
                {codeRegenerating ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  'Generate'
                )}
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Transfer admin - member picker */}
        <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle
                style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
              >
                Transfer admin
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Select a member to become the new admin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 my-2">
              {members
                .filter(
                  (m) =>
                    m.role !== 'child' && m.userId !== sessionData?.user?.id,
                )
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTransferTarget(m.userId)}
                    className="flex w-full items-center gap-3 rounded-xl p-3"
                    style={{
                      backgroundColor:
                        transferTarget === m.userId
                          ? 'var(--roost-bg)'
                          : 'transparent',
                      border:
                        transferTarget === m.userId
                          ? '2px solid var(--roost-text-primary)'
                          : '1.5px solid var(--roost-border)',
                      borderBottom:
                        transferTarget === m.userId
                          ? '3px solid var(--roost-border-bottom)'
                          : '3px solid var(--roost-border-bottom)',
                    }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs text-white"
                      style={{
                        backgroundColor: m.avatarColor ?? '#6366f1',
                        fontWeight: 700,
                      }}
                    >
                      {initials(m.name)}
                    </div>
                    <p
                      className="text-sm"
                      style={{
                        color: 'var(--roost-text-primary)',
                        fontWeight: 700,
                      }}
                    >
                      {m.name}
                    </p>
                  </button>
                ))}
            </div>
            <AlertDialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => {
                  setTransferOpen(false);
                  setTransferTarget(null);
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => {
                  if (transferTarget) {
                    setTransferOpen(false);
                    setTransferConfirmOpen(true);
                  }
                }}
                disabled={!transferTarget}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--roost-text-primary)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid rgba(0,0,0,0.2)',
                  fontWeight: 800,
                }}
              >
                Next
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Transfer admin confirm */}
        <AlertDialog
          open={transferConfirmOpen}
          onOpenChange={setTransferConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle
                style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
              >
                Transfer admin to{' '}
                {members.find((m) => m.userId === transferTarget)?.name}?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                They will become the new admin and control the subscription. You
                will become a member.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setTransferConfirmOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={handleTransfer}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
                style={{
                  backgroundColor: 'var(--roost-text-primary)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid rgba(0,0,0,0.2)',
                  fontWeight: 800,
                }}
              >
                Transfer
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete data - step 1 */}
        <AlertDialog
          open={deleteDataOpen && !deleteDataStep2}
          onOpenChange={(v) => {
            if (!v) {
              setDeleteDataOpen(false);
              setDeleteDataConfirm('');
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: '#EF4444', fontWeight: 800 }}>
                Delete all data?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                This will permanently delete everything in your household. This
                cannot be undone. Type DELETE to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              type="text"
              value={deleteDataConfirm}
              onChange={(e) => setDeleteDataConfirm(e.target.value)}
              placeholder="Type DELETE"
              className={inputClass}
              style={{ ...inputStyle, marginTop: '8px' }}
            />
            <AlertDialogFooter className="gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteDataOpen(false);
                  setDeleteDataConfirm('');
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                disabled={deleteDataConfirm !== 'DELETE'}
                onClick={() => setDeleteDataStep2(true)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                style={{
                  backgroundColor: '#EF4444',
                  border: '1.5px solid #C93B3B',
                  borderBottom: '3px solid #A63030',
                  fontWeight: 800,
                }}
              >
                Delete everything
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete data - step 2 */}
        <AlertDialog
          open={deleteDataStep2}
          onOpenChange={(v) => !v && setDeleteDataStep2(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: '#EF4444', fontWeight: 800 }}>
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Last chance. Everything goes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteDataStep2(false);
                  setDeleteDataOpen(false);
                  setDeleteDataConfirm('');
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                disabled={deletingData}
                onClick={handleDeleteData}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
                style={{
                  backgroundColor: '#EF4444',
                  border: '1.5px solid #C93B3B',
                  borderBottom: '3px solid #A63030',
                  fontWeight: 800,
                }}
              >
                Yes, delete everything
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete household - step 1 */}
        <AlertDialog
          open={deleteHouseOpen && !deleteHouseStep2}
          onOpenChange={(v) => {
            if (!v) {
              setDeleteHouseOpen(false);
              setDeleteHouseConfirm('');
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: '#EF4444', fontWeight: 800 }}>
                Delete household?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                This will permanently delete the household and remove all
                members. This cannot be undone. Type DELETE to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              type="text"
              value={deleteHouseConfirm}
              onChange={(e) => setDeleteHouseConfirm(e.target.value)}
              placeholder="Type DELETE"
              className={inputClass}
              style={{ ...inputStyle, marginTop: '8px' }}
            />
            <AlertDialogFooter className="gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteHouseOpen(false);
                  setDeleteHouseConfirm('');
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                disabled={deleteHouseConfirm !== 'DELETE'}
                onClick={() => setDeleteHouseStep2(true)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                style={{
                  backgroundColor: '#EF4444',
                  border: '1.5px solid #C93B3B',
                  borderBottom: '3px solid #A63030',
                  fontWeight: 800,
                }}
              >
                Delete everything
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete household - step 2 */}
        <AlertDialog
          open={deleteHouseStep2}
          onOpenChange={(v) => !v && setDeleteHouseStep2(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: '#EF4444', fontWeight: 800 }}>
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Last chance. The household and all its data will be gone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteHouseStep2(false);
                  setDeleteHouseOpen(false);
                  setDeleteHouseConfirm('');
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                disabled={deletingHouse}
                onClick={handleDeleteHousehold}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
                style={{
                  backgroundColor: '#EF4444',
                  border: '1.5px solid #C93B3B',
                  borderBottom: '3px solid #A63030',
                  fontWeight: 800,
                }}
              >
                Yes, delete household
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Member sheet */}
        <MemberSheet
          member={selectedMember}
          householdId={householdId}
          onClose={() => setSelectedMember(null)}
          onRefetch={refetchMembers}
        />

        {/* Invite guest sheet */}
        <InviteGuestSheet
          open={inviteGuestOpen}
          onClose={() => setInviteGuestOpen(false)}
        />

        {/* Add child sheet */}
        <AddChildSheet
          open={addChildOpen}
          onClose={() => setAddChildOpen(false)}
        />

        {/* Upgrade prompt */}
        {!!upgradeCode && (
          <PremiumGate
            feature="guests"
            trigger="sheet"
            onClose={() => setUpgradeCode(null)}
          />
        )}
      </PageContainer>
    </motion.div>
  );
}
