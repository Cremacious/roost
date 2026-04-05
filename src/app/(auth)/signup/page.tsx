"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signUp } from "@/lib/auth/client";
import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import RoostLogo from "@/components/shared/RoostLogo";

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

const inputClass =
  "flex h-12 w-full rounded-xl border bg-transparent px-4 text-sm placeholder:italic focus:outline-none transition-colors";

const inputStyle = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

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
      toast.error(error.message ?? "Sign up failed");
      setLoading(false);
      return;
    }
    router.push("/onboarding");
  }

  const submitDisabled =
    loading || (confirmTouched && !passwordsMatch) || (!!strength && strength === "weak");

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <RoostLogo size="lg" variant="dark" />
          <div>
            <h1
              className="text-3xl"
              style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
            >
              Create your account.
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
            >
              Let&apos;s get your household sorted.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              placeholder="What should we call you?"
              className={inputClass}
              style={inputStyle}
            />
            {errors.name && (
              <p className="text-sm text-destructive" style={{ fontWeight: 600 }}>{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              placeholder="you@example.com"
              className={inputClass}
              style={inputStyle}
            />
            {errors.email && (
              <p className="text-sm text-destructive" style={{ fontWeight: 600 }}>{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                placeholder="At least 8 characters"
                className={`${inputClass} pr-11`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--roost-text-muted)" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Strength bar: slab pill segments */}
            {cfg && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor: i < cfg.segments ? cfg.color : "var(--roost-border)",
                        borderBottom: i < cfg.segments ? `2px solid rgba(0,0,0,0.15)` : "2px solid transparent",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: cfg.color, fontWeight: 700 }}>
                  {cfg.label}
                </span>
              </div>
            )}
            {errors.password && (
              <p className="text-sm text-destructive" style={{ fontWeight: 600 }}>{errors.password}</p>
            )}
          </div>

          {/* Confirm */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }}
                placeholder="Same as above"
                className={`${inputClass} pr-16`}
                style={inputStyle}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {confirmTouched && (
                  passwordsMatch
                    ? <CheckCircle2 className="size-4" style={{ color: "#22C55E" }} />
                    : <XCircle className="size-4" style={{ color: "#EF4444" }} />
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  style={{ color: "var(--roost-text-muted)" }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {errors.confirm && (
              <p className="text-sm text-destructive" style={{ fontWeight: 600 }}>{errors.confirm}</p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={submitDisabled}
            whileTap={{ y: 2 }}
            className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
            style={{
              backgroundColor: "var(--roost-text-primary)",
              border: "1.5px solid var(--roost-text-primary)",
              borderBottom: "3px solid rgba(0,0,0,0.25)",
              fontWeight: 800,
            }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
          </motion.button>
        </form>

        <p
          className="text-center text-sm"
          style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4"
            style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
