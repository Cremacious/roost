'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import DraggableSheet from '@/components/shared/DraggableSheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { CategoryIcon } from '@/components/expenses/CategoryPicker';

const COLOR = '#22C55E';
const COLOR_DARK = '#16A34A';

const RESET_OPTIONS = [
  { value: 'monthly', label: 'Monthly (auto-reset)' },
  { value: 'manual', label: 'Manual reset' },
] as const;

export interface BudgetData {
  id: string;
  category_id: string;
  category: { name: string; icon: string; color: string };
  amount: number;
  reset_type: string | null;
  warning_threshold: number | null;
  period_start: string | null;
  current_spent: number;
  percentage: number;
  status: 'ok' | 'warning' | 'over';
  daysUntilReset: number | null;
}

interface EditBudgetSheetProps {
  open: boolean;
  onClose: () => void;
  budget: BudgetData | null;
}

export default function EditBudgetSheet({ open, onClose, budget }: EditBudgetSheetProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [resetType, setResetType] = useState<'monthly' | 'manual'>('monthly');
  const [threshold, setThreshold] = useState(80);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!open || !budget) return;
    setAmount(budget.amount.toFixed(2));
    setResetType((budget.reset_type as 'monthly' | 'manual') ?? 'monthly');
    setThreshold(budget.warning_threshold ?? 80);
  }, [open, budget]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error('Amount must be greater than 0');
      const r = await fetch(`/api/expenses/budgets/${budget!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, resetType, warningThreshold: threshold }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to update budget');
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget updated');
      onClose();
    },
    onError: (err: Error) => toast.error('Failed to update', { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/expenses/budgets/${budget!.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to delete budget');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget removed');
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error('Failed to delete', { description: err.message }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/expenses/budgets/${budget!.id}/reset`, { method: 'POST' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to reset budget');
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget period reset');
      onClose();
    },
    onError: (err: Error) => toast.error('Failed to reset', { description: err.message }),
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

  if (!budget) return null;

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
        <div className="px-4 pb-8" style={{ maxHeight: "calc(88dvh - 60px)" }}>
          <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
            Edit budget
          </p>

          {/* Category display (not editable) */}
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: `${budget.category.color}14`,
              border: `1.5px solid ${budget.category.color}30`,
              borderBottom: `3px solid ${budget.category.color}50`,
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: `${budget.category.color}25` }}
            >
              <CategoryIcon icon={budget.category.icon} color={budget.category.color} size={18} />
            </div>
            <span style={{ color: budget.category.color, fontWeight: 800, fontSize: 15 }}>
              {budget.category.name}
            </span>
          </div>

          <div className="space-y-5">
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

            {/* Manual reset button */}
            {resetType === 'manual' && (
              <button
                type="button"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="h-10 w-full rounded-xl text-sm"
                style={{
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                {resetMutation.isPending ? <Loader2 className="mx-auto size-4 animate-spin" /> : 'Reset period now'}
              </button>
            )}

            {/* Save */}
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !amount}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 800,
                opacity: updateMutation.isPending || !amount ? 0.6 : 1,
              }}
            >
              {updateMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : 'Save changes'}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm"
              style={{ color: '#EF4444', fontWeight: 700 }}
            >
              <Trash2 className="size-4" />
              Remove budget
            </button>
          </div>
        </div>
      </DraggableSheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {budget.category.name} budget. Your expense history is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
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
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="h-10 rounded-xl px-4 text-sm text-white"
              style={{
                backgroundColor: '#EF4444',
                border: '1.5px solid #EF4444',
                borderBottom: '3px solid #A63030',
                fontWeight: 800,
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Remove'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
