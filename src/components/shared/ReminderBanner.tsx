"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

const COLOR = "#06B6D4";
const SESSION_KEY = "roost-reminder-banner-dismissed";

interface DueReminder {
  id: string;
  title: string;
}

interface DueResponse {
  due: DueReminder[];
}

export default function ReminderBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // start dismissed to avoid flash

  useEffect(() => {
    // Check sessionStorage after mount (client-only)
    const isDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(isDismissed);
  }, []);

  const { data } = useQuery<DueResponse>({
    queryKey: ["reminders-due"],
    queryFn: async () => {
      const r = await fetch("/api/reminders/due");
      if (!r.ok) return { due: [] };
      return r.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const due = data?.due ?? [];

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  }

  if (dismissed || due.length === 0) return null;

  const message =
    due.length === 1
      ? `Reminder: ${due[0].title}`
      : `${due.length} reminders due today`;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{
        backgroundColor: `${COLOR}10`,
        borderBottom: `2px solid ${COLOR}`,
      }}
    >
      <Bell className="size-4 shrink-0" style={{ color: COLOR }} />

      <p className="flex-1 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
        {message}
      </p>

      <button
        type="button"
        onClick={() => router.push("/reminders")}
        className="flex h-8 items-center rounded-lg px-3 text-xs text-white shrink-0"
        style={{
          backgroundColor: COLOR,
          border: `1.5px solid ${COLOR}`,
          borderBottom: `2px solid #0891B2`,
          fontWeight: 700,
        }}
      >
        View
      </button>

      <button
        type="button"
        onClick={dismiss}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ color: "var(--roost-text-muted)" }}
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
