"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, RotateCcw, X } from "lucide-react";
import MemberAvatar from "@/components/shared/MemberAvatar";
import type { ParsedReceipt } from "@/lib/utils/googleVision";

const COLOR = "#22C55E";
const COLOR_DARK = "#159040";

// ---- Types ------------------------------------------------------------------

export interface LineItemAssignment {
  description: string;
  amount: number;
  assignedTo: string[]; // empty = split equally among all
}

interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
}

interface LineItemEditorProps {
  receipt: ParsedReceipt;
  members: Member[];
  onConfirm: (items: LineItemAssignment[]) => void;
  onRescan: () => void;
}

// ---- Row component ----------------------------------------------------------

function ItemRow({
  item,
  members,
  onChange,
  onRemove,
}: {
  item: LineItemAssignment;
  members: Member[];
  onChange: (updated: LineItemAssignment) => void;
  onRemove: () => void;
}) {
  function toggleMember(userId: string) {
    const next = item.assignedTo.includes(userId)
      ? item.assignedTo.filter((id) => id !== userId)
      : [...item.assignedTo, userId];
    onChange({ ...item, assignedTo: next });
  }

  const isSplitEqually = item.assignedTo.length === 0;

  return (
    <div
      className="rounded-2xl px-3 py-3"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "3px solid #159040",
      }}
    >
      {/* Description + amount row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          placeholder="Item description"
          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
        />
        <div className="relative shrink-0">
          <span
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
          >
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.amount || ""}
            onChange={(e) => onChange({ ...item, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            className="h-9 w-24 rounded-xl pl-6 pr-2 text-sm focus:outline-none"
            style={{
              border: "1.5px solid #E5E7EB",
              borderBottom: "2px solid #E5E7EB",
              color: "var(--roost-text-primary)",
              fontWeight: 800,
              backgroundColor: "var(--roost-surface)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ color: "var(--roost-text-muted)" }}
          aria-label="Remove item"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Assignment row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* "Split" all pill */}
        <button
          type="button"
          onClick={() => onChange({ ...item, assignedTo: [] })}
          className="flex h-7 items-center rounded-full px-2.5 text-xs"
          style={{
            backgroundColor: isSplitEqually ? `${COLOR}18` : "var(--roost-border)",
            border: isSplitEqually ? `1px solid ${COLOR}40` : "1px solid transparent",
            color: isSplitEqually ? COLOR : "var(--roost-text-muted)",
            fontWeight: 700,
          }}
        >
          Split
        </button>

        {/* Member toggle pills */}
        {members.map((m) => {
          const assigned = item.assignedTo.includes(m.userId);
          return (
            <button
              key={m.userId}
              type="button"
              onClick={() => toggleMember(m.userId)}
              className="flex h-7 items-center gap-1 rounded-full pl-1 pr-2.5 text-xs"
              style={{
                backgroundColor: assigned ? `${COLOR}18` : "var(--roost-border)",
                border: assigned ? `1px solid ${COLOR}40` : "1px solid transparent",
                color: assigned ? COLOR : "var(--roost-text-muted)",
                fontWeight: 700,
              }}
            >
              <MemberAvatar name={m.name} avatarColor={m.avatarColor} size="sm" />
              {m.name.split(" ")[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Main component ---------------------------------------------------------

export default function LineItemEditor({
  receipt,
  members,
  onConfirm,
  onRescan,
}: LineItemEditorProps) {
  const [items, setItems] = useState<LineItemAssignment[]>(() =>
    receipt.lineItems.length > 0
      ? receipt.lineItems.map((li) => ({
          description: li.description,
          amount: li.amount,
          assignedTo: [],
        }))
      : [{ description: "", amount: 0, assignedTo: [] }]
  );

  const itemsTotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const detectedTotal = receipt.total ?? null;
  const totalMismatch =
    detectedTotal !== null && Math.abs(itemsTotal - detectedTotal) > 0.01;

  function updateItem(index: number, updated: LineItemAssignment) {
    setItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", amount: 0, assignedTo: [] }]);
  }

  function handleConfirm() {
    const invalid = items.find((i) => !i.description.trim() || i.amount <= 0);
    if (invalid) {
      return;
    }
    onConfirm(items);
  }

  const canConfirm = items.length > 0 && items.every((i) => i.description.trim() && i.amount > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Receipt header */}
      <div>
        {receipt.merchant && (
          <p
            className="text-base"
            style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
          >
            {receipt.merchant}
          </p>
        )}
        {receipt.date && (
          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            {receipt.date}
          </p>
        )}
      </div>

      {/* Warning if no line items detected */}
      {receipt.lineItems.length === 0 && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: "#F59E0B18",
            border: "1px solid #F59E0B40",
          }}
        >
          <p className="text-xs" style={{ color: "#92400E", fontWeight: 700 }}>
            We could not read individual items from this receipt. Add them manually below or
            enter a total amount.
          </p>
        </div>
      )}

      {/* Assignment hint */}
      <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
        Tap member names to assign items. Unassigned items are split equally.
      </p>

      {/* Item rows */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <ItemRow
            key={i}
            item={item}
            members={members}
            onChange={(updated) => updateItem(i, updated)}
            onRemove={() => removeItem(i)}
          />
        ))}
      </div>

      {/* Add item */}
      <button
        type="button"
        onClick={addItem}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm"
        style={{ color: COLOR, fontWeight: 700 }}
      >
        <Plus className="size-4" />
        Add item
      </button>

      {/* Totals */}
      <div
        className="rounded-xl px-4 py-3"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            Items total
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
          >
            ${itemsTotal.toFixed(2)}
          </span>
        </div>
        {detectedTotal !== null && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              Receipt total
            </span>
            <span
              className="text-sm"
              style={{
                color: totalMismatch ? "#F59E0B" : "var(--roost-text-muted)",
                fontWeight: 800,
              }}
            >
              ${detectedTotal.toFixed(2)}
            </span>
          </div>
        )}
        {totalMismatch && (
          <p className="mt-1.5 text-xs" style={{ color: "#F59E0B", fontWeight: 700 }}>
            Items and receipt total differ by ${Math.abs(itemsTotal - detectedTotal!).toFixed(2)}.
            Check for missing items or tip.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <motion.button
          type="button"
          whileTap={{ y: 1 }}
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontWeight: 800,
            opacity: canConfirm ? 1 : 0.5,
          }}
        >
          Confirm and split
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ y: 1 }}
          onClick={onRescan}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid #E5E7EB",
            borderBottom: "3px solid #E5E7EB",
            color: "var(--roost-text-secondary)",
            fontWeight: 700,
          }}
        >
          <RotateCcw className="size-3.5" />
          Rescan
        </motion.button>
      </div>
    </div>
  );
}
