'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Home, Zap, Wifi, Phone, ShoppingCart, UtensilsCrossed, Receipt, Car,
  Droplets, Flame, Tv, Dumbbell, Heart, Shirt, Dog, Baby, Wrench, Music,
  Plane, Gift, Coffee, Beer, Pill, Scissors, Bike, Bus, BookOpen,
  Gamepad2, Package, CreditCard, Plus, ChevronUp, ChevronDown, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---- Types ------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  is_custom: boolean;
  status: string;
}

interface CategoryPickerProps {
  value: string; // category id
  onChange: (categoryId: string) => void;
  isAdmin: boolean;
}

// ---- Icon map ---------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Zap, Wifi, Phone, ShoppingCart, UtensilsCrossed, Receipt, Car,
  Droplets, Flame, Tv, Dumbbell, Heart, Shirt, Dog, Baby, Wrench, Music,
  Plane, Gift, Coffee, Beer, Pill, Scissors, Bike, Bus, BookOpen,
  Gamepad2, Package, CreditCard,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#000000',
];

export function CategoryIcon({ icon, color, size = 20 }: { icon: string; color: string; size?: number }) {
  const Icon = ICON_MAP[icon] ?? Receipt;
  return <Icon size={size} color={color} />;
}

// ---- Inline add/suggest form ------------------------------------------------

function InlineCategoryForm({
  isAdmin,
  onClose,
  onSuccess,
}: {
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: (category: Category) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Receipt');
  const [color, setColor] = useState('#6B7280');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isAdmin
        ? '/api/expenses/categories'
        : '/api/expenses/categories/suggest';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to save category');
      }
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
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
          {ICON_OPTIONS.map((iconName) => {
            const Icon = ICON_MAP[iconName]!;
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
          <CategoryIcon icon={icon} color={color} size={16} />
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
            backgroundColor: '#22C55E',
            border: '1.5px solid #22C55E',
            borderBottom: '3px solid #16A34A',
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

export default function CategoryPicker({ value, onChange, isAdmin }: CategoryPickerProps) {
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ['expenseCategories'],
    queryFn: async () => {
      const r = await fetch('/api/expenses/categories');
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

  function renderTile(cat: Category) {
    const active = value === cat.id;
    return (
      <button
        key={cat.id}
        type="button"
        onClick={() => onChange(active ? '' : cat.id)}
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
          <CategoryIcon icon={cat.icon} color={cat.color} size={20} />
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
      {/* Default categories */}
      <div className="grid grid-cols-5 gap-2">
        {defaults.map(renderTile)}
      </div>

      {/* Custom categories */}
      {custom.length > 0 && (
        <>
          <div
            className="my-3 h-px"
            style={{ backgroundColor: 'var(--roost-border)' }}
          />
          <div className="grid grid-cols-5 gap-2">
            {custom.map(renderTile)}
          </div>
        </>
      )}

      {/* Add / Suggest tile */}
      <div className="mt-2">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
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
              onChange(cat.id);
            }}
          />
        )}
      </div>
    </div>
  );
}
