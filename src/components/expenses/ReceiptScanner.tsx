"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, Crop, Maximize2, ScanLine, Square, Sun, Upload } from "lucide-react";
import { fileToBase64, validateReceiptImage } from "@/lib/utils/imageUpload";
import type { ParsedReceipt } from "@/lib/utils/azureReceipts";

const COLOR = "#22C55E";
const COLOR_DARK = "#159040";
const AMBER = "#F59E0B";
const AMBER_DARK = "#C87D00";

const SESSION_KEY = "roost-receipt-tips-dismissed";

interface ReceiptScannerProps {
  onReceiptParsed: (receipt: ParsedReceipt) => void;
  onClose: () => void;
}

type ScanState = "idle" | "scanning" | "empty" | "error";

export default function ReceiptScanner({ onReceiptParsed, onClose }: ReceiptScannerProps) {
  const [state, setState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [emptyReceipt, setEmptyReceipt] = useState<ParsedReceipt | null>(null);
  const [showTips, setShowTips] = useState(
    () => typeof window !== "undefined" && !sessionStorage.getItem(SESSION_KEY)
  );
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Which input to trigger after tips are dismissed
  const pendingInput = useRef<"camera" | "file" | null>(null);

  function dismissTips(input?: "camera" | "file") {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShowTips(false);
    if (input === "camera") cameraInputRef.current?.click();
    else if (input === "file") fileInputRef.current?.click();
  }

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
    onReceiptParsed({ lineItems: [] });
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

  // ---- Empty state (scanned, no items found) ----------------------------------

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
          <ul className="mt-2 space-y-1 text-left text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            <li>Place receipt on a plain dark surface</li>
            <li>Ensure good lighting with no shadows</li>
            <li>Hold camera directly above the receipt</li>
            <li>Avoid busy backgrounds</li>
          </ul>
        </div>
        <div className="flex w-full flex-col gap-2">
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => onReceiptParsed(emptyReceipt ?? { lineItems: [] })}
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
              border: "1.5px solid #E5E7EB",
              borderBottom: "3px solid #E5E7EB",
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

  // ---- Error state -----------------------------------------------------------

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
    <div className="flex flex-col gap-4">
      {/* Hidden file inputs */}
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

      {/* Tips overlay */}
      {showTips ? (
        <div
          className="flex flex-col gap-4 rounded-2xl px-6 py-6"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: `4px solid ${COLOR_DARK}`,
          }}
        >
          <div className="flex items-center gap-2">
            <ScanLine size={22} style={{ color: COLOR }} />
            <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              For best results
            </p>
          </div>

          <div className="space-y-3">
            {[
              { Icon: Sun, text: "Good lighting, no shadows" },
              { Icon: Maximize2, text: "Camera directly above receipt" },
              { Icon: Square, text: "Plain dark surface behind receipt" },
              { Icon: Crop, text: "Entire receipt in frame" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${COLOR}18`, border: `1px solid ${COLOR}30` }}
                >
                  <Icon size={15} style={{ color: COLOR }} />
                </div>
                <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => dismissTips("camera")}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 800,
              }}
            >
              <Camera className="size-4" />
              Got it, take a photo
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => dismissTips("file")}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid #E5E7EB",
                borderBottom: "3px solid #E5E7EB",
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
      ) : (
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
              Take a photo or upload an image. We will read the items automatically.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
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
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid #E5E7EB",
                borderBottom: "3px solid #E5E7EB",
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
      )}
    </div>
  );
}
