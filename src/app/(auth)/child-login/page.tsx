"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Delete, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIN_ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export default function ChildLoginPage() {
  const router = useRouter();
  const [householdCode, setHouseholdCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePinPress(key: string) {
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((p) => p + key);
    }
  }

  async function handleSubmit() {
    if (!householdCode.trim() || pin.length < 4) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/child-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdCode, pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Check your code and PIN and try again.", {
          description: "Ask a parent if you need help.",
        });
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.", {
        description: "Check your connection and try again.",
      });
      setLoading(false);
    }
  }

  const canSubmit = householdCode.trim().length === 6 && pin.length >= 4;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FFF5F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "var(--font-nunito)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 360 }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <Image
            src="/brand/roost-icon.png"
            alt="Roost"
            width={56}
            height={56}
            style={{ borderRadius: 16, objectFit: "cover" }}
          />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#1A0505",
            textAlign: "center",
            marginBottom: 6,
            lineHeight: 1.15,
          }}
        >
          Hey! Enter your code.
        </h1>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#5A2020",
            textAlign: "center",
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          Ask a parent for your household code and PIN.
        </p>

        {/* Household code input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1A0505", marginBottom: 6 }}>
            Household code
          </label>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={6}
            value={householdCode}
            onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
            placeholder="6-letter code from your housemate"
            style={{
              width: "100%",
              height: 56,
              border: "1.5px solid #F5C5C5",
              borderBottom: "3px solid #D4CFC9",
              borderRadius: 14,
              backgroundColor: "white",
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: "0.3em",
              textAlign: "center",
              color: "#1A0505",
              fontWeight: 700,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* PIN label + dots */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1A0505", marginBottom: 12, textAlign: "center" }}>
            PIN
          </label>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ scale: pin.length === i + 1 ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 0.15 }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor: i < pin.length ? "#EF4444" : "#F5C5C5",
                }}
              />
            ))}
          </div>
        </div>

        {/* PIN pad */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {PIN_ROWS.map((row, ri) => (
            <div key={`row-${ri}`} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {row.map((digit) => (
                <motion.button
                  key={`pin-${digit}`}
                  type="button"
                  onClick={() => handlePinPress(digit)}
                  whileTap={{ y: 1, scale: 0.97 }}
                  style={{
                    height: 70,
                    backgroundColor: "white",
                    border: "1.5px solid #F5C5C5",
                    borderBottom: "3px solid #D4CFC9",
                    borderRadius: 14,
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#1A0505",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {digit}
                </motion.button>
              ))}
            </div>
          ))}

          {/* Row 4: 0 + backspace */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <div />
            <motion.button
              type="button"
              onClick={() => handlePinPress("0")}
              whileTap={{ y: 1, scale: 0.97 }}
              style={{
                height: 70,
                backgroundColor: "white",
                border: "1.5px solid #F5C5C5",
                borderBottom: "3px solid #D4CFC9",
                borderRadius: 14,
                fontSize: 22,
                fontWeight: 900,
                color: "#1A0505",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              0
            </motion.button>
            <motion.button
              type="button"
              onClick={() => handlePinPress("del")}
              whileTap={{ y: 1, scale: 0.97 }}
              style={{
                height: 70,
                backgroundColor: "white",
                border: "1.5px solid #F5C5C5",
                borderBottom: "3px solid #D4CFC9",
                borderRadius: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1A0505",
              }}
            >
              <Delete size={20} />
            </motion.button>
          </div>
        </div>

        {/* Sign in button */}
        <AnimatePresence>
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              style={{ marginBottom: 20 }}
            >
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                whileTap={{ y: 2 }}
                style={{
                  width: "100%",
                  height: 52,
                  backgroundColor: "#EF4444",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 15,
                  borderRadius: 14,
                  border: "1.5px solid #EF4444",
                  borderBottom: "3px solid #C93B3B",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Adult link */}
        <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#9B6060" }}>
          Adult account?{" "}
          <Link
            href="/login"
            style={{ fontWeight: 700, color: "#EF4444", textDecoration: "none" }}
          >
            Sign in here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
