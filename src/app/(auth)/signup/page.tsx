"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { signUp } from "@/lib/auth/client";
import { CalendarDays, CheckCircle2, CheckSquare, Coffee, DollarSign, Eye, EyeOff, Loader2, PiggyBank, ShoppingCart, XCircle } from "lucide-react";
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

// ---- Styles -----------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#7A3F3F",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  border: "1.5px solid #F5C5C5",
  borderBottom: "3px solid #DBADB0",
  color: "#1A0505",
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    if (inviteToken) {
      sessionStorage.setItem("pendingInviteToken", inviteToken);
    }
  }, []);

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
    const pendingToken = sessionStorage.getItem("pendingInviteToken");
    if (pendingToken) {
      sessionStorage.removeItem("pendingInviteToken");
      router.push(`/invite/${pendingToken}`);
    } else {
      router.push("/onboarding");
    }
  }

  const submitDisabled =
    loading || (confirmTouched && !passwordsMatch) || (!!strength && strength === "weak");

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-nunito)" }}>
      {/* Left panel — desktop only */}
      <div
        className="hidden md:flex"
        style={{
          width: "40%",
          backgroundColor: "#EF4444",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "40px 36px",
        }}
      >
        {/* Brand block */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Image
            src="/brand/roost-icon.png"
            alt="Roost"
            width={42}
            height={42}
            className="rounded-xl"
            style={{ objectFit: "cover" }}
          />
          <span style={{ fontWeight: 900, fontSize: 26, color: "white", letterSpacing: "-0.5px" }}>Roost</span>
        </div>
        <p style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 36 }}>
          Home, sorted.
        </p>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={13} color="white" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 12, color: "white", marginBottom: 1 }}>{title}</p>
                <p style={{ fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.62)", lineHeight: 1.35 }}>{desc}</p>
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
          backgroundColor: "#FFF5F5",
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
          style={{ width: "100%", maxWidth: 400 }}
        >
          {/* Mobile-only logo */}
          <div className="flex md:hidden" style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
            <Image
              src="/brand/roost-icon.png"
              alt="Roost"
              width={40}
              height={40}
              style={{ borderRadius: 10, objectFit: "cover" }}
            />
            <span style={{ fontWeight: 900, fontSize: 20, color: "#1A0505" }}>Roost</span>
          </div>

          {/* Step indicator */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            <div style={{ width: 28, height: 5, borderRadius: 3, backgroundColor: "#C93B3B" }} />
            <div style={{ width: 28, height: 5, borderRadius: 3, backgroundColor: "#EF4444" }} />
            <div style={{ width: 28, height: 5, borderRadius: 3, backgroundColor: "#F5C5C5" }} />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1A0505", marginBottom: 4, letterSpacing: "-0.5px" }}>
            Create your account.
          </h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#7A3F3F", marginBottom: 28 }}>
            Let us get your household sorted.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Your name</label>
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
              <label style={labelStyle}>Email</label>
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
              <label style={labelStyle}>Password</label>
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
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9B6060",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
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
              <label style={labelStyle}>Confirm password</label>
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
              data-testid="signup-submit"
              disabled={submitDisabled}
              whileTap={{ y: 2 }}
              style={{
                width: "100%",
                height: 50,
                backgroundColor: "#EF4444",
                color: "white",
                fontWeight: 800,
                fontSize: 14,
                borderRadius: 14,
                border: "none",
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
              style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", textDecoration: "none" }}
            >
              Already have an account? Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
