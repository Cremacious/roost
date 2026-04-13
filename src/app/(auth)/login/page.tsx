"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";
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
import { CalendarDays, CheckSquare, Coffee, DollarSign, Eye, EyeOff, Loader2, PiggyBank, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: CheckSquare,
    title: "Chores",
    desc: "Assign them. Track them. Stop nagging.",
  },
  {
    icon: ShoppingCart,
    title: "Groceries",
    desc: "One list. No more 3 versions of the same milk.",
  },
  {
    icon: DollarSign,
    title: "Expenses",
    desc: "Split the bills. Keep the friends.",
  },
  {
    icon: CalendarDays,
    title: "Calendar",
    desc: "Everyone's schedule. One place. No excuses.",
  },
  {
    icon: Coffee,
    title: "Meals",
    desc: 'Plan the week. Skip the "what\'s for dinner" panic.',
  },
  {
    icon: PiggyBank,
    title: "Allowances",
    desc: "Kids earn it. You approve it. Everyone learns.",
  },
];

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    if (inviteToken) {
      sessionStorage.setItem("pendingInviteToken", inviteToken);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      toast.error(error.message ?? "Sign in failed", {
        description: "Check your email and password and try again.",
      });
      setLoading(false);
      return;
    }
    const pendingToken = sessionStorage.getItem("pendingInviteToken");
    if (pendingToken) {
      sessionStorage.removeItem("pendingInviteToken");
      router.push(`/invite/${pendingToken}`);
    } else {
      router.push("/dashboard");
    }
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
      {/* Left panel — desktop only */}
      <div
        className="hidden md:flex"
        style={{
          width: "40%",
          backgroundColor: ROOST_BRAND_BG,
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          padding: "48px 40px",
        }}
      >
        {/* Brand block */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Image
            src={ROOST_ICON_SRC}
            alt="Roost"
            width={52}
            height={52}
            className="rounded-xl"
            style={{ objectFit: "cover" }}
          />
          <span style={{ fontWeight: 900, fontSize: 34, color: "white", letterSpacing: "-1px" }}>Roost</span>
        </div>
        <p style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.7)", marginBottom: 40 }}>
          Homes run better with Roost.
        </p>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color="white" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 15, color: "white", marginBottom: 3 }}>{title}</p>
                <p style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.35 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="px-6 py-10 md:px-9"
        style={{
          flex: 1,
          backgroundColor: ROOST_BRAND_SOFT_BG,
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
          {/* Mobile-only logo */}
          <div className="flex md:hidden" style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
            <Image
              src={ROOST_ICON_SRC}
              alt="Roost"
              width={40}
              height={40}
              style={{ borderRadius: 10, objectFit: "cover" }}
            />
            <span style={{ fontWeight: 900, fontSize: 20, color: ROOST_BRAND_CARD_TEXT }}>Roost</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: ROOST_BRAND_CARD_TEXT, marginBottom: 4, letterSpacing: "-0.5px" }}>
            Welcome back.
          </h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: ROOST_BRAND_CARD_MUTED, marginBottom: 28 }}>
            Your household is waiting.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ marginBottom: 6 }}>
                <label style={labelStyle}>Password</label>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
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

            {/* Submit */}
            <motion.button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
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
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
            </motion.button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: ROOST_BRAND_CARD_MUTED }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
          </div>

          {/* Footer links */}
          <div style={{ textAlign: "center" }}>
            <Link
              href="/signup"
              style={{ fontSize: 13, fontWeight: 700, color: "white", textDecoration: "none", display: "block" }}
            >
              New here? Create an account
            </Link>
            <Link
              href="/child-login"
              style={{ fontSize: 12, fontWeight: 600, color: ROOST_BRAND_CARD_MUTED, textDecoration: "none", display: "block", marginTop: 10 }}
            >
              Sign in as a child
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
