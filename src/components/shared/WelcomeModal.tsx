"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Home, Users, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  onDismiss: () => void;
}

const TIPS = [
  {
    icon: Home,
    title: "Your household is ready",
    body: "Invite your housemates or family with your household code in Settings.",
  },
  {
    icon: Users,
    title: "Child accounts use a PIN",
    body: "Add child accounts in Settings. They log in with a 4-digit PIN at /child-login.",
  },
  {
    icon: ListChecks,
    title: "Start with chores",
    body: "Create recurring chores, assign them, and track who is keeping up.",
  },
];

export default function WelcomeModal({ onDismiss }: Props) {
  const [open, setOpen] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const queryClient = useQueryClient();

  async function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    try {
      await fetch("/api/user/dismiss-welcome", { method: "POST" });

      queryClient.setQueryData(
        ["dashboard-summary"],
        (current: Record<string, unknown> | undefined) =>
          current
            ? {
                ...current,
                hasSeenWelcome: true,
              }
            : current
      );
    } catch {
      // fire-and-forget
    }
    setOpen(false);
    onDismiss();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: "4px solid #EF4444",
          borderRadius: 20,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <DialogTitle className="sr-only">Welcome to Roost</DialogTitle>
        <DialogDescription className="sr-only">
          A quick overview of how to get started with your household in Roost.
        </DialogDescription>

        {/* Header */}
        <div
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: "1px solid var(--roost-border)" }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <div
              className="mb-3 flex size-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: "#FFF5F5",
                border: "1.5px solid #F5C5C5",
                borderBottom: "3px solid #EF4444",
              }}
            >
              <Home size={22} style={{ color: "#EF4444" }} />
            </div>
          </motion.div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "var(--roost-text-primary)",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            Welcome to Roost.
          </h2>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--roost-text-secondary)",
            }}
          >
            Homes run better with Roost.
          </p>
        </div>

        {/* Tips */}
        <div className="flex flex-col gap-0 px-6 py-4">
          {TIPS.map((tip, i) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: 0.1 + i * 0.06 }}
              className="flex items-start gap-3 py-3"
              style={{
                borderBottom:
                  i < TIPS.length - 1 ? "1px solid var(--roost-border)" : undefined,
              }}
            >
              <div
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: "#FFF5F5",
                  border: "1px solid #F5C5C5",
                }}
              >
                <tip.icon size={15} style={{ color: "#EF4444" }} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--roost-text-primary)",
                    marginBottom: 1,
                  }}
                >
                  {tip.title}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--roost-text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  {tip.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={handleDismiss}
            disabled={dismissing}
            style={{
              width: "100%",
              height: 52,
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
              gap: 8,
            }}
          >
            <CheckCircle2 size={17} />
            Got it, let&apos;s go
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
