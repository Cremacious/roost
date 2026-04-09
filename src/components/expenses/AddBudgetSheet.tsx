'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import DraggableSheet from '@/components/shared/DraggableSheet';
import CategoryPicker from '@/components/expenses/CategoryPicker';
import type { Category } from '@/components/expenses/CategoryPicker';

const COLOR = '#22C55E';
const COLOR_DARK = '#16A34A';

const RESET_OPTIONS = [
  { value: 'monthly', label: 'Monthly (auto-reset)' },
  { value: 'manual', label: 'Manual reset' },
] as const;

interface AddBudgetSheetProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  existingCategoryIds: string[]; // categories that already have a budget
}

export default function AddBudgetSheet({
  open,
  onClose,
  isAdmin,
  existingCategoryIds,
}: AddBudgetSheetProps) {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [resetType, setResetType] = useState<'monthly' | 'manual'>('monthly');
  const [threshold, setThreshold] = useState(80);

  function reset() {
    setCategoryId('');
    setAmount('');
    setResetType('monthly');
    setThreshold(80);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!categoryId) throw new Error('Please select a category');
      if (!amt || amt <= 0) throw new Error('Amount must be greater than 0');

      const r = await fetch('/api/expenses/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: amt,
          resetType,
          warningThreshold: threshold,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to create budget');
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget created');
      reset();
      onClose();
    },
    onError: (err: Error) => toast.error('Failed to save', { description: err.message }),
  });

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--roost-surface)',
    border: '1.5px solid #E5E7EB',
    borderBottom: '3px solid #E5E7EB',
    color: 'var(--roost-text-primary)',
    fontWeight: 600,
    borderRadius: 12,
    paddingLeft: 36,
    paddingRight: 12,
    height: 48,
    width: '100%',
    fontSize: 14,
  };

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
        <div
          className="px-4 pb-8"
          style={{ maxHeight: 'calc(88dvh - 60px)' }}
        >
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Set a budget
        </p>

        <div className="space-y-5">
          {/* Category */}
          <div>
            <label className="mb-2 block text-xs" style={{ color: '#374151', fontWeight: 700 }}>
              Category
            </label>
            <CategoryPicker value={categoryId} onChange={setCategoryId} isAdmin={isAdmin} />
            {existingCategoryIds.includes(categoryId) && categoryId && (
              <p className="mt-1.5 text-xs" style={{ color: '#EF4444', fontWeight: 600 }}>
                A budget for this category already exists.
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: '#374151', fontWeight: 700 }}>
              Budget amount
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: '#374151', fontWeight: 700 }}
              >
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Reset type */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: '#374151', fontWeight: 700 }}>
              Reset
            </label>
            <div className="flex gap-2">
              {RESET_OPTIONS.map(({ value, label }) => {
                const active = resetType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setResetType(value)}
                    className="h-10 flex-1 rounded-xl text-xs"
                    style={{
                      border: active ? `1.5px solid ${COLOR}` : '1.5px solid #E5E7EB',
                      borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid #E5E7EB',
                      backgroundColor: active ? `${COLOR}18` : 'transparent',
                      color: active ? COLOR : 'var(--roost-text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning threshold */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: '#374151', fontWeight: 700 }}>
              Warn me at
            </label>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: COLOR }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}>
              Alert when {threshold}% is used
            </p>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !categoryId || !amount || existingCategoryIds.includes(categoryId)}
            className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              fontWeight: 800,
              opacity: saveMutation.isPending || !categoryId || !amount || existingCategoryIds.includes(categoryId) ? 0.6 : 1,
            }}
          >
            {saveMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : 'Save budget'}
          </button>
        </div>
        </div>{/* end inner scroll wrapper */}
    </DraggableSheet>
  );
}
