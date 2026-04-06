"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { signUp } from "@/lib/auth/client";
import { CheckCircle2, CheckSquare, DollarSign, Eye, EyeOff, Loader2, ShoppingCart, XCircle } from "lucide-react";
import { motion } from "framer-motion";

// ---- Password strength ------------------------------------------------------

type Strength = "weak" | "fair" | "good" | "strong";

function getStrength(password: string): Strength {
  if (password.length < 8) return "weak";
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  if (hasUpper && hasNumber && hasSymbol) return "strong";
  if (hasNumber || hasSymbol) return "good";
  return "fair";
}

const STRENGTH_CONFIG: Record<Strength, { segments: number; label: string; color: string }> = {
  weak:   { segments: 1, label: "Weak",   color: "#EF4444" },
  fair:   { segments: 2, label: "Fair",   color: "#F97316" },
  good:   { segments: 3, label: "Good",   color: "#F59E0B" },
  strong: { segments: 4, label: "Strong", color: "#22C55E" },
};

// ---- Left panel features ----------------------------------------------------

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

// ---- Styles -----------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  border: "1.5px solid #F5C5C5",
  borderBottom: "3px solid #D4CFC9",
  color: "#1A0505",
  fontWeight: 600,
  backgroundColor: "transparent",
  borderRadius: 14,
  width: "100%",
  height: 48,
  padding: "0 16px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

// ---- Page -------------------------------------------------------------------

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = password.length > 0 ? getStrength(password) : null;
  const confirmTouched = confirm.length > 0;
  const passwordsMatch = password === confirm;
  const cfg = strength ? STRENGTH_CONFIG[strength] : null;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    if (!strength || strength === "weak") next.password = "Password must be at least 8 characters";
    if (!passwordsMatch) next.confirm = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    if (error) {
      toast.error(error.message ?? "Sign up failed", {
        description: "Check your details and try again.",
      });
      setLoading(false);
      return;
    }
    router.push("/onboarding");
  }

  const submitDisabled =
    loading || (confirmTouched && !passwordsMatch) || (!!strength && strength === "weak");

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
          backgroundColor: "#FFF5F5",
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
            <p style={{ fontWeight: 900, fontSize: 20, color: "#1A0505", marginTop: 8 }}>Roost</p>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1A0505", marginBottom: 4 }}>Create your account.</h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#5A2020", marginBottom: 28 }}>
            Let us get your household sorted.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1A0505", marginBottom: 6 }}>
                Your name
              </label>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="What should we call you?"
                style={inputStyle}
              />
              {errors.name && (
                <p style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", marginTop: 4 }}>{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1A0505", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                placeholder="you@example.com"
                style={inputStyle}
              />
              {errors.email && (
                <p style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", marginTop: 4 }}>{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1A0505", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                  placeholder="At least 8 characters"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9B6060", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {cfg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <div style={{ display: "flex", flex: 1, gap: 3 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: 4,
                          flex: 1,
                          borderRadius: 2,
                          backgroundColor: i < cfg.segments ? cfg.color : "#F5C5C5",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                </div>
              )}
              {errors.password && (
                <p style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", marginTop: 4 }}>{errors.password}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1A0505", marginBottom: 6 }}>
                Confirm password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }}
                  placeholder="Same as above"
                  style={{ ...inputStyle, paddingRight: 60 }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {confirmTouched && (
                    passwordsMatch
                      ? <CheckCircle2 size={15} color="#22C55E" />
                      : <XCircle size={15} color="#EF4444" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    style={{ color: "#9B6060", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {errors.confirm && (
                <p style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", marginTop: 4 }}>{errors.confirm}</p>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={submitDisabled}
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
                cursor: submitDisabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: submitDisabled ? 0.6 : 1,
                marginTop: 4,
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Create account"}
            </motion.button>
          </form>

          {/* Footer link */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link
              href="/login"
              style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", textDecoration: "none" }}
            >
              Already have an account? Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
