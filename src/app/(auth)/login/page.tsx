"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const inputClass =
  "flex h-12 w-full rounded-xl border bg-transparent px-4 text-sm placeholder:italic focus:outline-none transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      toast.error(error.message ?? "Sign in failed");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

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
        {/* Logo + greeting */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
            style={{
              backgroundColor: "var(--roost-text-primary)",
              fontWeight: 900,
              border: "1.5px solid var(--roost-border)",
              borderBottom: "4px solid var(--roost-border-bottom)",
            }}
          >
            R
          </div>
          <div>
            <h1
              className="text-3xl"
              style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
            >
              Welcome back.
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
            >
              Your household is waiting.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm"
              style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              style={{
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 600,
              }}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Password
              </label>
              <button
                type="button"
                className="text-xs"
                style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={`${inputClass} pr-11`}
                style={{
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid var(--roost-border-bottom)",
                  color: "var(--roost-text-primary)",
                  fontWeight: 600,
                }}
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
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ y: 2 }}
            className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-60"
            style={{
              backgroundColor: "var(--roost-text-primary)",
              border: "1.5px solid var(--roost-text-primary)",
              borderBottom: "3px solid rgba(0,0,0,0.25)",
              fontWeight: 800,
            }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </motion.button>
        </form>

        {/* Footer links */}
        <div className="space-y-3 text-center">
          <p
            className="text-sm"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            New here?{" "}
            <Link
              href="/signup"
              className="underline underline-offset-4"
              style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
            >
              Create an account
            </Link>
          </p>
          <Link
            href="/child-login"
            className="block text-xs underline underline-offset-4"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            Sign in as a child
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
