"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signUp } from "@/lib/auth/client";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
} from "lucide-react";

type Strength = "weak" | "fair" | "good" | "strong";

function getStrength(password: string): Strength {
  if (password.length < 8) return "weak";
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  if (hasUpper && (hasNumber || hasSymbol) && hasNumber && hasSymbol) return "strong";
  if (hasNumber || hasSymbol) return "good";
  return "fair";
}

const strengthConfig: Record<Strength, { segments: number; label: string; color: string; textColor: string }> = {
  weak:   { segments: 1, label: "Weak",   color: "bg-red-500",    textColor: "text-red-500" },
  fair:   { segments: 2, label: "Fair",   color: "bg-orange-500", textColor: "text-orange-500" },
  good:   { segments: 3, label: "Good",   color: "bg-yellow-500", textColor: "text-yellow-500" },
  strong: { segments: 4, label: "Strong", color: "bg-green-500",  textColor: "text-green-500" },
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

  const submitDisabled = loading || (confirmTouched && !passwordsMatch) || (!!strength && strength === "weak");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">Get started with Roost</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: "" })); }}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: "" })); }}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: "" })); }}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {strength && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i < strengthConfig[strength].segments
                          ? strengthConfig[strength].color
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strengthConfig[strength].textColor}`}>
                  {strengthConfig[strength].label}
                </span>
              </div>
            )}
            {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors((prev) => ({ ...prev, confirm: "" })); }}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 pr-16 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {confirmTouched && (
                  passwordsMatch
                    ? <CheckCircle2 className="size-4 text-green-500" />
                    : <XCircle className="size-4 text-red-500" />
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-muted-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {errors.confirm && <p className="text-destructive text-sm">{errors.confirm}</p>}
          </div>

          <button
            type="submit"
            disabled={submitDisabled}
            className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
