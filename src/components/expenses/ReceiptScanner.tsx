"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, ScanLine, Upload } from "lucide-react";
import { fileToBase64, validateReceiptImage } from "@/lib/utils/imageUpload";
import type { ParsedReceipt } from "@/lib/utils/googleVision";

const COLOR = "#22C55E";
const COLOR_DARK = "#159040";
const AMBER = "#F59E0B";
const AMBER_DARK = "#C87D00";

interface ReceiptScannerProps {
  onReceiptParsed: (receipt: ParsedReceipt) => void;
  onClose: () => void;
}

type ScanState = "idle" | "scanning" | "empty" | "error";

export default function ReceiptScanner({ onReceiptParsed, onClose }: ReceiptScannerProps) {
  const [state, setState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [emptyReceipt, setEmptyReceipt] = useState<ParsedReceipt | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File) {
    const validationError = validateReceiptImage(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setState("scanning");

    try {
      const imageBase64 = await fileToBase64(file);

      const response = await fetch("/api/expenses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not read receipt");
      }

      const { receipt } = await response.json();

      if (receipt.lineItems.length === 0) {
        // Vision worked but found no parseable items
        setEmptyReceipt(receipt);
        setState("empty");
      } else {
        onReceiptParsed(receipt);
      }
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function skipToManual() {
    onReceiptParsed({ lineItems: [], rawText: "" });
  }

  // ---- Scanning state --------------------------------------------------------

  if (state === "scanning") {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: `4px solid ${COLOR_DARK}`,
        }}
      >
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ScanLine size={48} style={{ color: COLOR }} />
        </motion.div>
        <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
          Reading your receipt...
        </p>
        <div
          className="h-1.5 w-48 overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--roost-border)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: COLOR }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  // ---- Empty state (Vision worked, no items parsed) --------------------------

  if (state === "empty") {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: `4px solid ${AMBER_DARK}`,
        }}
      >
        <ScanLine size={40} style={{ color: AMBER }} />
        <div>
          <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            We could not read the items.
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            The receipt scanned but we could not pick out individual items. You
            can add them manually or try a clearer photo.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => onReceiptParsed(emptyReceipt ?? { lineItems: [], rawText: "" })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
            style={{
              backgroundColor: AMBER,
              border: `1.5px solid ${AMBER}`,
              borderBottom: `3px solid ${AMBER_DARK}`,
              fontWeight: 800,
            }}
          >
            Add items manually
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => setState("idle")}
            className="flex h-11 w-full items-center justify-center rounded-xl text-sm"
            style={{
              backgroundColor: "var(--roost-surface)",
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
              color: "var(--roost-text-secondary)",
              fontWeight: 700,
            }}
          >
            Try again
          </motion.button>
        </div>
      </div>
    );
  }

  // ---- Error state (actual API/network failure) -------------------------------

  if (state === "error") {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: "4px solid #C93B3B",
        }}
      >
        <ScanLine size={40} style={{ color: "#EF4444" }} />
        <div>
          <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
            {errorMessage || "Could not read receipt"}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            Try a clearer photo or enter items manually.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => setState("idle")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              fontWeight: 800,
            }}
          >
            Try again
          </motion.button>
          <button
            type="button"
            onClick={skipToManual}
            className="text-sm"
            style={{ color: COLOR, fontWeight: 700 }}
          >
            Enter items manually instead
          </button>
        </div>
      </div>
    );
  }

  // ---- Idle state ------------------------------------------------------------

  return (
    <div
      className="flex flex-col items-center gap-5 rounded-2xl px-6 py-8 text-center"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "2px dashed var(--roost-border)",
      }}
    >
      <ScanLine size={48} style={{ color: COLOR }} />

      <div>
        <p className="text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Scan a receipt
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
          Take a photo or upload an image of your receipt. We will read the
          items automatically.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        {/* Camera input (mobile) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = "";
          }}
        />
        <motion.button
          type="button"
          whileTap={{ y: 1 }}
          onClick={() => cameraInputRef.current?.click()}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-sm text-white"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontWeight: 800,
          }}
        >
          <Camera className="size-4" />
          Take a photo
        </motion.button>

        {/* File input (desktop / gallery) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.heic"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = "";
          }}
        />
        <motion.button
          type="button"
          whileTap={{ y: 1 }}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-sm"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "3px solid var(--roost-border-bottom)",
            color: "var(--roost-text-primary)",
            fontWeight: 700,
          }}
        >
          <Upload className="size-4" />
          Upload from device
        </motion.button>
      </div>

      <button
        type="button"
        onClick={skipToManual}
        className="text-sm"
        style={{ color: COLOR, fontWeight: 700 }}
      >
        Or enter items manually
      </button>
    </div>
  );
}
