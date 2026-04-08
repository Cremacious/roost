"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Loader2 } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";

const COLOR = "#22C55E";
const COLOR_DARK = "#16A34A";

interface ExportSheetProps {
  open: boolean;
  onClose: () => void;
}

type QuickRange = "this-month" | "last-month" | "last-3-months" | "all-time";
type ExportFormat = "csv" | "pdf";

function getQuickRange(range: QuickRange): { from: string; to: string } {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  if (range === "this-month") {
    return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: todayStr };
  }
  if (range === "last-month") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: format(lastMonth, "yyyy-MM-dd"), to: format(lastMonthEnd, "yyyy-MM-dd") };
  }
  if (range === "last-3-months") {
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    return { from: format(threeMonthsAgo, "yyyy-MM-dd"), to: todayStr };
  }
  // all-time: no from/to filters
  return { from: "", to: todayStr };
}

export default function ExportSheet({ open, onClose }: ExportSheetProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [activeRange, setActiveRange] = useState<QuickRange>("this-month");
  const [isExporting, setIsExporting] = useState(false);

  function applyQuickRange(range: QuickRange) {
    setActiveRange(range);
    const { from, to } = getQuickRange(range);
    setFromDate(from);
    setToDate(to);
  }

  const previewParams = new URLSearchParams();
  if (fromDate) previewParams.set("from", fromDate);
  if (toDate) previewParams.set("to", toDate);

  const { data: preview } = useQuery<{ count: number; total: number }>({
    queryKey: ["export-preview", fromDate, toDate],
    queryFn: async () => {
      const r = await fetch(`/api/expenses/export/preview?${previewParams}`);
      if (!r.ok) return { count: 0, total: 0 };
      return r.json();
    },
    staleTime: 30_000,
    enabled: open,
  });

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      params.set("format", exportFormat);

      const r = await fetch(`/api/expenses/export?${params}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Export failed");
      }

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roost-expenses-${format(new Date(), "yyyy-MM-dd")}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${preview?.count ?? 0} expense${(preview?.count ?? 0) !== 1 ? "s" : ""}`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error("Export failed", { description: msg });
    } finally {
      setIsExporting(false);
    }
  }

  const quickRanges: { key: QuickRange; label: string }[] = [
    { key: "this-month", label: "This month" },
    { key: "last-month", label: "Last month" },
    { key: "last-3-months", label: "Last 3 months" },
    { key: "all-time", label: "All time" },
  ];

  const inputStyle = {
    backgroundColor: "var(--roost-surface)",
    border: "1.5px solid var(--roost-border)",
    borderBottom: "3px solid var(--roost-border-bottom)",
    borderRadius: 14,
    color: "var(--roost-text-primary)",
    fontWeight: 600,
    padding: "0 12px",
    height: 44,
    width: "100%",
    outline: "none",
    fontSize: 14,
  } as React.CSSProperties;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "85dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />

        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Export expenses
          </SheetTitle>
        </SheetHeader>

        {/* Quick range pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {quickRanges.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => applyQuickRange(key)}
              className="rounded-full px-3 py-1.5 text-xs"
              style={{
                backgroundColor: activeRange === key ? COLOR : "var(--roost-bg)",
                color: activeRange === key ? "#fff" : "var(--roost-text-secondary)",
                border: `1.5px solid ${activeRange === key ? COLOR : "var(--roost-border)"}`,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date range inputs */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setActiveRange("this-month"); }}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setActiveRange("this-month"); }}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Format selector */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
            Format
          </label>
          <div className="flex gap-2">
            {(["csv", "pdf"] as ExportFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setExportFormat(f)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  backgroundColor: exportFormat === f ? COLOR : "var(--roost-bg)",
                  color: exportFormat === f ? "#fff" : "var(--roost-text-secondary)",
                  border: `1.5px solid ${exportFormat === f ? COLOR : "var(--roost-border)"}`,
                  borderBottom: `3px solid ${exportFormat === f ? COLOR_DARK : "var(--roost-border-bottom)"}`,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Preview summary */}
        {preview && (
          <div
            className="mb-5 rounded-xl px-4 py-3"
            style={{ backgroundColor: `${COLOR}10`, border: `1.5px solid ${COLOR}30` }}
          >
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              {preview.count} expense{preview.count !== 1 ? "s" : ""} totaling{" "}
              <span style={{ color: COLOR, fontWeight: 800 }}>${preview.total.toFixed(2)}</span>
            </p>
          </div>
        )}

        {/* Export button */}
        <motion.button
          type="button"
          whileTap={{ y: 2 }}
          onClick={handleExport}
          disabled={isExporting || (preview?.count ?? 0) === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontWeight: 800,
            opacity: isExporting || (preview?.count ?? 0) === 0 ? 0.6 : 1,
          }}
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export {preview?.count ?? 0} expense{(preview?.count ?? 0) !== 1 ? "s" : ""} as {exportFormat.toUpperCase()}
        </motion.button>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm"
          style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
        >
          Cancel
        </button>
      </SheetContent>
    </Sheet>
  );
}
