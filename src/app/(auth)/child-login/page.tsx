"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Delete, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MemberAvatar from "@/components/shared/MemberAvatar";
import {
  ROOST_BRAND_BG,
  ROOST_BRAND_CARD_MUTED,
  ROOST_BRAND_CARD_TEXT,
  ROOST_BRAND_MUTED,
  ROOST_BRAND_SOFT_BG,
  ROOST_BRAND_SURFACE,
  ROOST_BRAND_TEXT,
  ROOST_ICON_SRC,
} from "@/lib/brand";

// ---- Cookie helpers ---------------------------------------------------------

const HOUSE_CODE_COOKIE = "roost_house_code";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

// ---- Types ------------------------------------------------------------------

interface ChildUser {
  id: string;
  name: string;
  avatar_color: string | null;
}

// ---- PIN pad rows -----------------------------------------------------------

const PIN_ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

// ---- Page -------------------------------------------------------------------

export default function ChildLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [householdCode, setHouseholdCode] = useState("");
  const [children, setChildren] = useState<ChildUser[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildUser | null>(null);
  const [pin, setPin] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // On mount: check for saved house code cookie and auto-advance
  const fetchChildren = useCallback(async (code: string) => {
    setCodeLoading(true);
    try {
      const r = await fetch(`/api/auth/child-login?householdCode=${encodeURIComponent(code)}`);
      if (!r.ok) {
        if (step === 1) {
          toast.error("House code not found.", { description: "Check the code and try again." });
        } else {
          // Cookie was saved but code no longer valid — clear and restart
          deleteCookie(HOUSE_CODE_COOKIE);
          setHouseholdCode("");
          setStep(1);
        }
        return;
      }
      const data = await r.json();
      const kids: ChildUser[] = data.children ?? [];
      setChildren(kids);
      setCookie(HOUSE_CODE_COOKIE, code, 365);

      if (kids.length === 0) {
        toast.error("No child accounts in this household.", {
          description: "Ask a parent to add a child account in Settings.",
        });
        return;
      }

      if (kids.length === 1) {
        setSelectedChild(kids[0]);
        setStep(3);
      } else {
        setStep(2);
      }
    } catch {
      toast.error("Something went wrong.", { description: "Check your connection and try again." });
    } finally {
      setCodeLoading(false);
    }
  }, [step]);

  useEffect(() => {
    const saved = getCookie(HOUSE_CODE_COOKIE);
    if (saved) {
      setHouseholdCode(saved);
      void fetchChildren(saved);
    }
  }, [fetchChildren]);

  function handleCodeSubmit() {
    const code = householdCode.trim().toUpperCase();
    if (code.length !== 6) return;
    fetchChildren(code);
  }

  function handlePickChild(child: ChildUser) {
    setSelectedChild(child);
    setPin("");
    setStep(3);
  }

  function handleWrongHouse() {
    deleteCookie(HOUSE_CODE_COOKIE);
    setHouseholdCode("");
    setChildren([]);
    setSelectedChild(null);
    setPin("");
    setStep(1);
  }

  function handlePinPress(key: string) {
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      submitPin(next);
    }
  }

  async function submitPin(enteredPin: string) {
    if (!selectedChild) return;
    setLoginLoading(true);
    try {
      const r = await fetch("/api/auth/child-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdCode,
          childId: selectedChild.id,
          pin: enteredPin,
        }),
      });
      if (!r.ok) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
        toast.error("Wrong PIN. Try again.");
        return;
      }
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong.", { description: "Check your connection and try again." });
      setPin("");
    } finally {
      setLoginLoading(false);
    }
  }

  // ---- STEP 1: House code ---------------------------------------------------

  if (step === 1) {
    return (
      <div style={pageStyle}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          {/* Logo */}
          <Image
            src={ROOST_ICON_SRC}
            alt="Roost"
            width={56}
            height={56}
            style={{ borderRadius: 16, objectFit: "cover", marginBottom: 8 }}
          />
          <p style={{ fontWeight: 900, fontSize: 22, color: "white", marginBottom: 20 }}>Roost</p>

          <div style={panelStyle}>
            <h1 style={{ ...headingStyle, marginBottom: 6 }}>Hey! Enter your code.</h1>
            <p style={{ ...subStyle, marginBottom: 28 }}>Your household code and your secret PIN.</p>

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
              onKeyDown={(e) => e.key === "Enter" && householdCode.trim().length === 6 && handleCodeSubmit()}
              placeholder="XXXXXX"
              style={codeInputStyle}
            />

            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={handleCodeSubmit}
              disabled={householdCode.trim().length !== 6 || codeLoading}
              style={{
                ...slabButtonStyle,
                opacity: householdCode.trim().length !== 6 ? 0.5 : 1,
                marginTop: 12,
              }}
            >
              {codeLoading ? <Loader2 size={18} className="animate-spin" /> : "Let me in"}
            </motion.button>

            <a
              href="/login"
              style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: ROOST_BRAND_MUTED, marginTop: 14, textDecoration: "none", display: "block" }}
            >
              Back to grown-up sign in
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- STEP 2: Pick your name -----------------------------------------------

  if (step === 2) {
    return (
      <div style={pageStyle}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{ width: "100%", maxWidth: 360, ...panelStyle }}
        >
          <h1 style={headingStyle}>Who are you?</h1>
          <p style={subStyle}>Tap your name to log in.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {children.map((child) => (
              <motion.button
                key={child.id}
                type="button"
                whileTap={{ y: 2, scale: 0.98 }}
                onClick={() => handlePickChild(child)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  backgroundColor: "white",
                  border: "1.5px solid #F5C5C5",
                  borderBottom: "4px solid #DBADB0",
                  borderRadius: 18,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <MemberAvatar
                  name={child.name}
                  avatarColor={child.avatar_color ?? ROOST_BRAND_BG}
                  size="lg"
                />
                <span style={{ fontSize: 20, fontWeight: 800, color: ROOST_BRAND_TEXT }}>
                  {child.name}
                </span>
              </motion.button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleWrongHouse}
            style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: ROOST_BRAND_MUTED, marginTop: 4, background: "none", border: "none", cursor: "pointer", padding: 0, display: "block", width: "100%" }}
          >
            Wrong house?
          </button>
        </motion.div>
      </div>
    );
  }

  // ---- STEP 3: PIN entry ----------------------------------------------------

  return (
    <div style={pageStyle}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ width: "100%", maxWidth: 360, ...panelStyle }}
      >
        {selectedChild && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
            <MemberAvatar
              name={selectedChild.name}
              avatarColor={selectedChild.avatar_color ?? ROOST_BRAND_BG}
              size="lg"
            />
          </div>
        )}

        <h1 style={{ ...headingStyle, marginBottom: 4 }}>
          Enter your PIN{selectedChild ? `, ${selectedChild.name.split(" ")[0]}` : ""}.
        </h1>

        {/* PIN dot indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28, marginTop: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: pin.length === i + 1 ? [1, 1.3, 1] : 1,
                x: shake ? [0, -6, 6, -4, 4, 0] : 0,
              }}
              transition={{ duration: shake ? 0.4 : 0.15 }}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                backgroundColor: i < pin.length ? ROOST_BRAND_BG : "#F5C5C5",
              }}
            />
          ))}
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
                  disabled={loginLoading}
                  whileTap={{ y: 1, scale: 0.97 }}
                  style={pinButtonStyle}
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
              disabled={loginLoading}
              whileTap={{ y: 1, scale: 0.97 }}
              style={pinButtonStyle}
            >
              0
            </motion.button>
            <motion.button
              type="button"
              onClick={() => handlePinPress("del")}
              disabled={loginLoading}
              whileTap={{ y: 1, scale: 0.97 }}
              style={{ ...pinButtonStyle, fontSize: 16 }}
            >
              <Delete size={20} />
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {loginLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}
            >
              <Loader2 size={20} className="animate-spin" style={{ color: ROOST_BRAND_BG }} />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={children.length > 1 ? () => { setStep(2); setPin(""); } : handleWrongHouse}
          style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: ROOST_BRAND_MUTED, marginTop: 4, background: "none", border: "none", cursor: "pointer", padding: 0, display: "block", width: "100%" }}
        >
          {children.length > 1 ? "Not you?" : "Wrong house?"}
        </button>
      </motion.div>
    </div>
  );
}

// ---- Shared styles ----------------------------------------------------------

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: ROOST_BRAND_SOFT_BG,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 24px",
  fontFamily: "var(--font-nunito)",
};

const panelStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: ROOST_BRAND_SURFACE,
  borderRadius: 28,
  padding: "28px 24px",
  boxShadow: "0 28px 70px rgba(69, 10, 10, 0.24)",
  border: "1px solid rgba(127, 29, 29, 0.22)",
};

const headingStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: ROOST_BRAND_CARD_TEXT,
  textAlign: "center",
  marginBottom: 8,
  lineHeight: 1.15,
  letterSpacing: "-0.5px",
};

const subStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: ROOST_BRAND_CARD_MUTED,
  textAlign: "center",
  marginBottom: 28,
  lineHeight: 1.5,
};

const codeInputStyle: React.CSSProperties = {
  width: "100%",
  height: 64,
  border: "2px solid #F5C5C5",
  borderBottom: "4px solid #DBADB0",
  borderRadius: 14,
  backgroundColor: "white",
  fontSize: 22,
  letterSpacing: "6px",
  textAlign: "center",
  color: ROOST_BRAND_TEXT,
  fontWeight: 900,
  outline: "none",
  boxSizing: "border-box",
  display: "block",
};

const slabButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 56,
  backgroundColor: "white",
  color: ROOST_BRAND_BG,
  fontWeight: 800,
  fontSize: 16,
  borderRadius: 16,
  border: "none",
  borderBottom: "4px solid #E7B7B7",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const pinButtonStyle: React.CSSProperties = {
  height: 72,
  backgroundColor: "white",
  border: "1.5px solid #F5C5C5",
  borderBottom: "3px solid #DBADB0",
  borderRadius: 14,
  fontSize: 24,
  fontWeight: 900,
  color: ROOST_BRAND_TEXT,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
