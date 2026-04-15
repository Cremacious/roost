"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { signIn } from "@/lib/auth/client";
import { getGoogleAuthRedirects } from "@/lib/auth/client-redirects";
import {
  ROOST_BRAND_BG,
  ROOST_BRAND_CARD_MUTED,
  ROOST_BRAND_CARD_TEXT,
} from "@/lib/brand";

type GoogleAuthButtonMode = "login" | "signup";

interface GoogleAuthButtonProps {
  disabled?: boolean;
  mode: GoogleAuthButtonMode;
}

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <path
        d="M21.805 12.23c0-.79-.068-1.551-.195-2.285H12v4.324h5.496a4.7 4.7 0 0 1-2.04 3.083v2.558h3.3c1.931-1.777 3.049-4.399 3.049-7.68Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.754 0 5.064-.913 6.75-2.49l-3.3-2.558c-.915.615-2.082.979-3.45.979-2.651 0-4.899-1.79-5.702-4.195H2.886v2.637A10.184 10.184 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.298 13.736A6.113 6.113 0 0 1 5.98 11.99c0-.607.11-1.197.318-1.746V7.607H2.886A10.012 10.012 0 0 0 1.82 11.99c0 1.604.385 3.123 1.066 4.383l3.412-2.637Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.05c1.496 0 2.84.515 3.899 1.528l2.924-2.924C17.06 3.013 14.749 2 12 2A10.184 10.184 0 0 0 2.886 7.607l3.412 2.637C7.101 7.84 9.349 6.05 12 6.05Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleAuthButton({ disabled = false, mode }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleAuth() {
    setLoading(true);

    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    const redirectConfig = getGoogleAuthRedirects({
      fallback: "/dashboard",
      newUserFallback: "/onboarding",
      pathname,
      searchParams,
    });

    const { data, error } = await signIn.social({
      provider: "google",
      callbackURL: redirectConfig.callbackURL,
      newUserCallbackURL: redirectConfig.newUserCallbackURL,
      errorCallbackURL: redirectConfig.errorCallbackURL,
      requestSignUp: mode === "signup",
    });

    if (error) {
      toast.error("Google sign-in failed", {
        description: error.message ?? "Please try again in a moment.",
      });
      setLoading(false);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleGoogleAuth}
      disabled={disabled || loading}
      whileTap={{ y: 2 }}
      style={{
        width: "100%",
        minHeight: 52,
        background:
          "linear-gradient(180deg, rgba(255,252,252,0.98) 0%, rgba(255,243,243,0.96) 100%)",
        color: ROOST_BRAND_BG,
        fontWeight: 900,
        fontSize: 14,
        borderRadius: 16,
        border: "1px solid rgba(255, 233, 233, 0.9)",
        borderBottom: "3px solid rgba(219, 173, 176, 0.95)",
        boxShadow: "0 16px 30px rgba(69, 10, 10, 0.12)",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: disabled || loading ? 0.68 : 1,
        padding: "0 16px",
      }}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ color: ROOST_BRAND_CARD_MUTED }}>
            Connecting to Google...
          </span>
        </>
      ) : (
        <>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.92)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 0 0 1px rgba(185, 28, 28, 0.08)",
            }}
          >
            <GoogleGlyph />
          </span>
          <span style={{ color: ROOST_BRAND_BG }}>
            {mode === "signup" ? "Create account with Google" : "Continue with Google"}
          </span>
          <span style={{ color: ROOST_BRAND_CARD_TEXT, opacity: 0.42 }}>in one tap</span>
        </>
      )}
    </motion.button>
  );
}
