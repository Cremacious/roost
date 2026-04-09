"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";
import { CheckSquare, DollarSign, Eye, EyeOff, Loader2, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: CheckSquare,
    title: "Chores sorted",
    desc: "Assign, track, and actually get them done.",
  },
  {
    icon: ShoppingCart,
    title: "Groceries covered",
    desc: "One list the whole house uses.",
  },
  {
    icon: DollarSign,
    title: "Bills split fairly",
    desc: "No more awkward money conversations.",
  },
];

const inputStyle: React.CSSProperties = {
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #D1D5DB",
  color: "#111827",
  fontWeight: 600,
  backgroundColor: "transparent",
  borderRadius: 14,
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for pending invite token on mount
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
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-nunito)" }}>
      {/* Left panel — desktop only */}
      <div
        className="hidden sm:flex"
        style={{
          width: "40%",
          backgroundColor: "#EF4444",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        {/* Logo */}
        <Image
          src="/brand/roost-icon.png"
          alt="Roost"
          width={48}
          height={48}
          style={{ borderRadius: 14, objectFit: "cover" }}
        />
        <p style={{ fontWeight: 900, fontSize: 28, color: "white", marginTop: 12, marginBottom: 6 }}>Roost</p>
        <p style={{ fontWeight: 700, fontSize: 16, color: "rgba(255,255,255,0.8)", marginBottom: 40 }}>
          Home, sorted.
        </p>

        {/* Feature highlights */}
        <div style={{ width: "100%", maxWidth: 280 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={15} color="white" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "white", marginBottom: 2 }}>{title}</p>
                <p style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          minHeight: "100vh",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 400 }}
        >
          {/* Mobile-only logo */}
          <div className="flex sm:hidden" style={{ flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <Image
              src="/brand/roost-icon.png"
              alt="Roost"
              width={48}
              height={48}
              style={{ borderRadius: 14, objectFit: "cover" }}
            />
            <p style={{ fontWeight: 900, fontSize: 20, color: "#111827", marginTop: 8 }}>Roost</p>
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", marginBottom: 4 }}>Welcome back.</h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 28 }}>
            Your household is waiting.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...inputStyle, width: "100%", height: 48, padding: "0 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Password</label>
                <button type="button" style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  style={{ ...inputStyle, width: "100%", height: 48, padding: "0 44px 0 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", background: "none", border: "none", cursor: "pointer" }}
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
                backgroundColor: "#EF4444",
                color: "white",
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 14,
                border: "1.5px solid #EF4444",
                borderBottom: "3px solid #C93B3B",
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
            <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6B7280" }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          </div>

          {/* Footer links */}
          <div style={{ textAlign: "center" }}>
            <Link
              href="/signup"
              style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", textDecoration: "none", display: "block", marginBottom: 16 }}
            >
              New here? Create an account
            </Link>
            <Link
              href="/child-login"
              style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", textDecoration: "none", display: "block" }}
            >
              Sign in as a child
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
