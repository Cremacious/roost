'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Loader2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CHORE_ICON_MAP, CHORE_ICON_OPTIONS } from './choreIconMap';

// ---- Types ------------------------------------------------------------------

export interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  is_custom: boolean;
  status: string;
}

interface ChoreCategoryPickerProps {
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  isPremium: boolean;
  isAdmin: boolean;
  onUpgradeRequired?: (code: string) => void;
}

// ---- Color options ----------------------------------------------------------

const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#64748B', '#000000',
];

// ---- Icon helper ------------------------------------------------------------

export function ChoreIcon({ icon, color, size = 20 }: { icon: string; color: string; size?: number }) {
  const Icon = (CHORE_ICON_MAP[icon] ?? CHORE_ICON_MAP['CheckSquare']) as LucideIcon;
  return <Icon size={size} color={color} />;
}

// ---- Inline create/suggest form ---------------------------------------------

function InlineCategoryForm({
  isAdmin,
  onClose,
  onSuccess,
}: {
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: (category: ChoreCategory) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('CheckSquare');
  const [color, setColor] = useState('#EF4444');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isAdmin
        ? '/api/chore-categories'
        : '/api/chore-categories/suggest';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const err = new Error(d.error ?? 'Failed to save category') as Error & { code?: string };
        err.code = d.code;
        throw err;
      }
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['choreCategories'] });
      if (isAdmin) {
        toast.success('Category created');
        onSuccess(data.category);
      } else {
        toast.success('Suggestion sent to admin');
        onClose();
      }
    },
    onError: (err: Error) => toast.error('Failed to save', { description: err.message }),
  });

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--roost-surface)',
    border: '1.5px solid #E5E7EB',
    borderBottom: '3px solid #E5E7EB',
    color: 'var(--roost-text-primary)',
    fontWeight: 600,
    borderRadius: 10,
    padding: '8px 12px',
    width: '100%',
    fontSize: 13,
  };

  return (
    <div
      className="mt-3 space-y-3 rounded-2xl p-3"
      style={{
        backgroundColor: 'var(--roost-bg)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '3px solid var(--roost-border-bottom)',
      }}
    >
      <p className="text-xs" style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}>
        {isAdmin ? 'New category' : 'Suggest a category'}
      </p>

      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        style={inputStyle}
      />

      {/* Icon picker */}
      <div>
        <p className="mb-1.5 text-xs" style={{ color: '#374151', fontWeight: 700 }}>Icon</p>
        <div className="flex flex-wrap gap-1.5">
          {CHORE_ICON_OPTIONS.map((iconName) => {
            const Icon = CHORE_ICON_MAP[iconName]!;
            const active = icon === iconName;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  border: active ? `1.5px solid ${color}` : '1.5px solid #E5E7EB',
                  borderBottom: active ? `3px solid ${color}` : '3px solid #E5E7EB',
                  backgroundColor: active ? `${color}18` : 'var(--roost-surface)',
                }}
                title={iconName}
              >
                <Icon size={16} color={active ? color : '#6B7280'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <p className="mb-1.5 text-xs" style={{ color: '#374151', fontWeight: 700 }}>Color</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-7 w-7 rounded-full"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20` }}
        >
          <ChoreIcon icon={icon} color={color} size={16} />
        </div>
        <span className="text-sm" style={{ color: 'var(--roost-text-primary)', fontWeight: 700 }}>
          {name || 'Preview'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
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
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="h-9 flex-1 rounded-xl text-xs text-white"
          style={{
            backgroundColor: '#EF4444',
            border: '1.5px solid #EF4444',
            borderBottom: '3px solid #C93B3B',
            fontWeight: 700,
            opacity: !name.trim() || mutation.isPending ? 0.6 : 1,
          }}
        >
          {mutation.isPending ? (
            <Loader2 className="mx-auto size-4 animate-spin" />
          ) : isAdmin ? (
            'Create'
          ) : (
            'Suggest'
          )}
        </button>
      </div>
    </div>
  );
}

// ---- Main component ---------------------------------------------------------

export default function ChoreCategoryPicker({
  selectedId,
  onSelect,
  isPremium,
  isAdmin,
  onUpgradeRequired,
}: ChoreCategoryPickerProps) {
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<{ categories: ChoreCategory[] }>({
    queryKey: ['choreCategories'],
    queryFn: async () => {
      const r = await fetch('/api/chore-categories');
      if (!r.ok) throw new Error('Failed to load categories');
      return r.json();
    },
    staleTime: 60_000,
  });

  const categories = data?.categories ?? [];
  const defaults = categories.filter((c) => c.is_default);
  const custom = categories.filter((c) => c.is_custom);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-5 animate-spin" style={{ color: 'var(--roost-text-muted)' }} />
      </div>
    );
  }

  function renderTile(cat: ChoreCategory) {
    const active = selectedId === cat.id;
    return (
      <button
        key={cat.id}
        type="button"
        onClick={() => onSelect(active ? null : cat.id)}
        className="flex flex-col items-center gap-1 rounded-xl p-2"
        style={{
          border: active ? `1.5px solid ${cat.color}` : '1.5px solid var(--roost-border)',
          borderBottom: active ? `3px solid ${cat.color}` : '3px solid var(--roost-border-bottom)',
          backgroundColor: active ? `${cat.color}14` : 'var(--roost-surface)',
          minWidth: 0,
        }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${cat.color}20` }}
        >
          <ChoreIcon icon={cat.icon} color={cat.color} size={20} />
        </div>
        <span
          className="w-full truncate text-center text-[10px] leading-tight"
          style={{
            color: active ? cat.color : 'var(--roost-text-secondary)',
            fontWeight: 700,
          }}
        >
          {cat.name}
        </span>
      </button>
    );
  }

  return (
    <div>
      {/* None tile + defaults */}
      <div className="grid grid-cols-5 gap-2">
        {/* None tile */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex flex-col items-center gap-1 rounded-xl p-2"
          style={{
            border: selectedId === null ? '1.5px solid #6B7280' : '1.5px solid var(--roost-border)',
            borderBottom: selectedId === null ? '3px solid #6B7280' : '3px solid var(--roost-border-bottom)',
            backgroundColor: selectedId === null ? '#6B728014' : 'var(--roost-surface)',
            minWidth: 0,
          }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: '#6B728020' }}
          >
            <X size={20} color="#6B7280" />
          </div>
          <span
            className="w-full truncate text-center text-[10px] leading-tight"
            style={{ color: '#6B7280', fontWeight: 700 }}
          >
            None
          </span>
        </button>

        {defaults.map(renderTile)}
      </div>

      {/* Custom categories */}
      {custom.length > 0 && (
        <>
          <div className="my-3 h-px" style={{ backgroundColor: 'var(--roost-border)' }} />
          <div className="grid grid-cols-5 gap-2">
            {custom.map(renderTile)}
          </div>
        </>
      )}

      {/* Add / Suggest (premium-gated) */}
      <div className="mt-2">
        {!showForm ? (
          <button
            type="button"
            onClick={() => {
              if (!isPremium && onUpgradeRequired) {
                onUpgradeRequired('CHORE_CATEGORIES_PREMIUM');
                return;
              }
              setShowForm(true);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{
              border: '1.5px dashed var(--roost-border)',
              color: 'var(--roost-text-muted)',
              fontWeight: 700,
            }}
          >
            <Plus size={14} />
            {isAdmin ? '+ New category' : 'Suggest category'}
          </button>
        ) : (
          <InlineCategoryForm
            isAdmin={isAdmin}
            onClose={() => setShowForm(false)}
            onSuccess={(cat) => {
              setShowForm(false);
              onSelect(cat.id);
            }}
          />
        )}
      </div>
    </div>
  );
}
