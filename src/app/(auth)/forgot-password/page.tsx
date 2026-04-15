"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import {
  ROOST_BRAND_BG,
  ROOST_BRAND_CARD_MUTED,
  ROOST_BRAND_CARD_TEXT,
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error("Could not send reset email", {
        description:
          payload?.message ??
          payload?.error?.message ??
          payload?.error ??
          "Check your email setup and try again.",
      });
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
    toast.success("Check your inbox", {
      description: "If that email exists, a reset link is on the way.",
    });
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
          We will send a secure reset link so your household account is back in your hands.
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
            {sent ? <ShieldCheck size={22} color="white" /> : <Mail size={22} color="white" />}
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: ROOST_BRAND_CARD_TEXT, marginBottom: 6, letterSpacing: "-0.5px" }}>
            {sent ? "Check your email." : "Forgot your password?"}
          </h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: ROOST_BRAND_CARD_MUTED, marginBottom: 24, lineHeight: 1.5 }}>
            {sent
              ? "If the address exists in Roost, a reset link is on the way."
              : "Enter the email tied to your account and we will send a reset link."}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading || sent}
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
                cursor: loading || sent ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading || sent ? 0.7 : 1,
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : sent ? "Reset link sent" : "Send reset link"}
            </motion.button>
          </form>

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
