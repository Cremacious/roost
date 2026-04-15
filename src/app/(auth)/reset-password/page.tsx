"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import { validateStrongPassword } from "@/lib/auth/password-policy";
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: ROOST_BRAND_CARD_TEXT,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  border: "1.5px solid #F5C5C5",
  borderBottom: "3px solid #DBADB0",
  color: ROOST_BRAND_TEXT,
  fontWeight: 600,
  backgroundColor: "white",
  borderRadius: 12,
  width: "100%",
  height: 48,
  padding: "0 16px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function getResetPasswordParams(): { error: string | null; token: string | null } {
  if (typeof window === "undefined") {
    return {
      error: null,
      token: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    error: params.get("error"),
    token: params.get("token"),
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token] = useState<string | null>(() => getResetPasswordParams().token);
  const [tokenError] = useState<string | null>(() => getResetPasswordParams().error);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = useMemo(() => validateStrongPassword(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isTokenInvalid = tokenError === "INVALID_TOKEN" || !token;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!token) {
      setError("This reset link is invalid or expired.");
      return;
    }

    const strengthError = validateStrongPassword(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        newPassword: password,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload?.message ??
        payload?.error?.message ??
        payload?.error ??
        "This reset link is invalid or expired.";
      setError(message);
      toast.error("Could not reset password", {
        description: message,
      });
      setLoading(false);
      return;
    }

    setComplete(true);
    setLoading(false);
    toast.success("Password updated", {
      description: "You can sign in with your new password now.",
    });
    window.setTimeout(() => router.push("/login"), 1400);
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "var(--font-nunito)",
        backgroundColor: ROOST_BRAND_SOFT_BG,
      }}
    >
      <div
        className="hidden md:flex"
        style={{
          width: "40%",
          backgroundColor: ROOST_BRAND_BG,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 40px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Image
            src={ROOST_ICON_SRC}
            alt="Roost"
            width={52}
            height={52}
            priority
            sizes="52px"
            style={{ objectFit: "cover", width: 52, height: "auto", borderRadius: 14 }}
          />
          <span style={{ fontWeight: 900, fontSize: 34, letterSpacing: "-1px" }}>Roost</span>
        </div>
        <p style={{ maxWidth: 320, textAlign: "center", fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.78)" }}>
          Choose a new password and get your household back on track.
        </p>
      </div>

      <div
        className="px-6 py-10 md:px-9"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: ROOST_BRAND_SURFACE,
            borderRadius: 28,
            padding: "28px 24px",
            boxShadow: "0 28px 70px rgba(69, 10, 10, 0.24)",
            border: "1px solid rgba(127, 29, 29, 0.22)",
          }}
        >
          <div className="flex md:hidden" style={{ alignItems: "center", gap: 10, marginBottom: 24 }}>
            <Image
              src={ROOST_ICON_SRC}
              alt="Roost"
              width={40}
              height={40}
              priority
              sizes="40px"
              style={{ borderRadius: 10, objectFit: "cover", width: 40, height: "auto" }}
            />
            <span style={{ fontWeight: 900, fontSize: 20, color: ROOST_BRAND_CARD_TEXT }}>Roost</span>
          </div>

          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <LockKeyhole size={22} color="white" />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: ROOST_BRAND_CARD_TEXT, marginBottom: 6, letterSpacing: "-0.5px" }}>
            {complete ? "Password reset." : "Set a new password."}
          </h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: ROOST_BRAND_CARD_MUTED, marginBottom: 24, lineHeight: 1.5 }}>
            {complete
              ? "Your new password is saved. We are sending you back to sign in."
              : "Use something strong and memorable for you, not for anyone else."}
          </p>

          {isTokenInvalid && !complete ? (
            <div
              style={{
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
                padding: "16px 18px",
                color: ROOST_BRAND_CARD_TEXT,
              }}
            >
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>This reset link is no longer valid.</p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: ROOST_BRAND_CARD_MUTED }}>
                Request a fresh link and we will send you a new one.
              </p>
              <Link
                href="/forgot-password"
                style={{ display: "inline-block", marginTop: 14, color: "white", fontWeight: 700, textDecoration: "none" }}
              >
                Request another reset email
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>New password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 chars, with a symbol"
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    tabIndex={-1}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: ROOST_BRAND_MUTED,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Confirm password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Type it again"
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    tabIndex={-1}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: ROOST_BRAND_MUTED,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {(error || (password.length > 0 && passwordError) || (confirmPassword.length > 0 && !passwordsMatch)) && (
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#FFE2E2" }}>
                  {error ?? passwordError ?? "Passwords do not match"}
                </p>
              )}

              <motion.button
                type="submit"
                disabled={loading || complete}
                whileTap={{ y: 2 }}
                style={{
                  width: "100%",
                  height: 50,
                  backgroundColor: "white",
                  color: ROOST_BRAND_BG,
                  fontWeight: 800,
                  fontSize: 14,
                  borderRadius: 14,
                  border: "none",
                  borderBottom: "3px solid #E7B7B7",
                  cursor: loading || complete ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: loading || complete ? 0.7 : 1,
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : complete ? "Password updated" : "Save new password"}
              </motion.button>
            </form>
          )}

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link
              href="/login"
              style={{ fontSize: 13, fontWeight: 700, color: "white", textDecoration: "none" }}
            >
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
