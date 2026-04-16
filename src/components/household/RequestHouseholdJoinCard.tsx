"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useHouseholdJoinRequests } from "@/lib/hooks/useHouseholdJoinRequests";

interface RequestHouseholdJoinCardProps {
  disabled?: boolean;
}

export default function RequestHouseholdJoinCard({
  disabled = false,
}: RequestHouseholdJoinCardProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useHouseholdJoinRequests();
  const [code, setCode] = useState("");

  const requestMutation = useMutation({
    mutationFn: async (joinCode: string) => {
      const response = await fetch("/api/household/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send join request");
      }

      return payload as {
        request: { householdName: string };
      };
    },
    onSuccess: async (payload) => {
      setCode("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["household-join-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      toast.success("Join request sent", {
        description: `The admin for ${payload.request.householdName} can now approve or reject it.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Could not send join request", {
        description: error.message,
      });
    },
  });

  const outgoing = data?.outgoing ?? [];

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border-bottom)",
      }}
    >
      <div className="px-4 py-4">
        <p
          className="text-sm"
          style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
        >
          Join another household by code
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
        >
          Enter a household code and the admin will get a request to approve or
          reject.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            maxLength={6}
            placeholder="ABC123"
            disabled={disabled || requestMutation.isPending}
            className="flex h-11 w-full rounded-xl border bg-transparent px-4 text-center font-mono text-lg tracking-[0.25em] uppercase focus:outline-none"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
              color: "var(--roost-text-primary)",
              fontWeight: 800,
              opacity: disabled ? 0.7 : 1,
            }}
          />
          <button
            type="button"
            disabled={disabled || requestMutation.isPending || code.trim().length < 6}
            onClick={() => requestMutation.mutate(code.trim())}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm text-white"
            style={{
              backgroundColor: "#EF4444",
              border: "1.5px solid #EF4444",
              borderBottom: "3px solid #C93B3B",
              fontWeight: 800,
              opacity:
                disabled || requestMutation.isPending || code.trim().length < 6
                  ? 0.65
                  : 1,
            }}
          >
            {requestMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send request
          </button>
        </div>
      </div>

      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid var(--roost-border)" }}
      >
        <p
          className="text-xs"
          style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}
        >
          Pending requests
        </p>

        {isLoading ? (
          <div
            className="mt-3 flex items-center gap-2 text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            <Loader2 className="size-4 animate-spin" />
            Loading your requests...
          </div>
        ) : outgoing.length === 0 ? (
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            No join requests pending right now.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {outgoing.map((request) => (
              <div
                key={request.id}
                className="rounded-xl px-3 py-3"
                style={{
                  backgroundColor: "var(--roost-bg)",
                  border: "1px solid var(--roost-border)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm"
                      style={{
                        color: "var(--roost-text-primary)",
                        fontWeight: 800,
                      }}
                    >
                      {request.householdName}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: "var(--roost-text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      Sent{" "}
                      {formatDistanceToNow(new Date(request.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-[11px]"
                    style={{
                      backgroundColor: "#F59E0B20",
                      color: "#B45309",
                      fontWeight: 800,
                    }}
                  >
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
