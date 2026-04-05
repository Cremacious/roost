"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { useHousehold } from "@/lib/hooks/useHousehold";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function DevTools() {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const { household, role, isPremium, isLoading } = useHousehold();

  const user = sessionData?.user;

  async function handleTogglePremium() {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch("/api/dev/toggle-premium", { method: "POST" });
      if (!res.ok) throw new Error("Toggle failed");
      const data = await res.json();
      await queryClient.invalidateQueries();
      const newStatus = data.subscription_status;
      toast.success(newStatus === "premium" ? "Switched to Premium" : "Switched to Free", {
        description: `Household subscription is now ${newStatus}.`,
      });
    } catch {
      toast.error("Toggle failed", { description: "Could not update subscription status." });
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      {/* Collapsed pill */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          position: "fixed",
          bottom: 90,
          left: 16,
          background: "#F59E0B",
          borderBottom: "3px solid #C87D00",
          borderTop: "1.5px solid #F59E0B",
          borderLeft: "1.5px solid #F59E0B",
          borderRight: "1.5px solid #F59E0B",
          borderRadius: 20,
          padding: "6px 12px",
          fontFamily: "var(--font-nunito)",
          fontWeight: 800,
          fontSize: 12,
          color: "white",
          zIndex: 9999,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        DEV
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            bottom: 130,
            left: 16,
            width: 220,
            zIndex: 9999,
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "4px solid #C87D00",
            borderRadius: 16,
            padding: 16,
          }}
        >
          {/* Section: Premium toggle */}
          <p
            style={{
              fontFamily: "var(--font-nunito)",
              fontWeight: 800,
              fontSize: 11,
              color: "#C87D00",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Dev Tools
          </p>

          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 13, color: "var(--roost-text-primary)" }}>
              Premium
            </span>
            <Switch
              checked={isPremium}
              onCheckedChange={handleTogglePremium}
              disabled={toggling || isLoading}
            />
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "var(--roost-border)",
              marginBottom: 10,
            }}
          />

          {/* User info */}
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 11, color: "var(--roost-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            User
          </p>
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 12, color: "var(--roost-text-primary)", marginBottom: 2 }}>
            {user?.name ?? "Loading..."}
          </p>
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 600, fontSize: 11, color: "var(--roost-text-muted)", marginBottom: 2 }}>
            {user?.email ?? ""}
          </p>
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 600, fontSize: 11, color: "var(--roost-text-muted)", marginBottom: 10 }}>
            Role: {role ?? "none"}
          </p>

          <div
            style={{
              height: 1,
              backgroundColor: "var(--roost-border)",
              marginBottom: 10,
            }}
          />

          {/* Household info */}
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 11, color: "var(--roost-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Household
          </p>
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 12, color: "var(--roost-text-primary)", marginBottom: 2 }}>
            {household?.name ?? "No household"}
          </p>
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 600, fontSize: 11, color: "var(--roost-text-muted)" }}>
            {isPremium ? "Premium" : "Free tier"}
          </p>
        </div>
      )}
    </>
  );
}
