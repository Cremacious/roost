"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, Clock3, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useHouseholdJoinRequests } from "@/lib/hooks/useHouseholdJoinRequests";

interface HouseholdJoinRequestsCardProps {
  compact?: boolean;
}

export default function HouseholdJoinRequestsCard({
  compact = false,
}: HouseholdJoinRequestsCardProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useHouseholdJoinRequests();

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "approve" | "reject";
    }) => {
      const response = await fetch(`/api/household/join-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to update request");
      }

      return response.json();
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["household-join-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["household-members"] }),
        queryClient.invalidateQueries({ queryKey: ["households"] }),
      ]);

      toast.success(
        variables.action === "approve"
          ? "Join request approved"
          : "Join request rejected",
      );
    },
    onError: (error: Error) => {
      toast.error("Could not update join request", {
        description: error.message,
      });
    },
  });

  if (!data?.isAdmin && !isLoading) {
    return null;
  }

  const incoming = data?.incoming ?? [];

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border-bottom)",
      }}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <div>
          <p
            className="text-sm"
            style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
          >
            Home join requests
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
          >
            {isLoading
              ? "Checking for new household requests..."
              : incoming.length === 0
                ? "No one is waiting to join this home right now."
                : `${incoming.length} pending request${incoming.length === 1 ? "" : "s"} waiting for review.`}
          </p>
        </div>
        <span
          className="flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs"
          style={{
            backgroundColor: incoming.length > 0 ? "#EF4444" : "var(--roost-bg)",
            color: incoming.length > 0 ? "#ffffff" : "var(--roost-text-muted)",
            fontWeight: 800,
          }}
        >
          {incoming.length}
        </span>
      </div>

      {isLoading ? (
        <div
          className="flex items-center gap-2 px-4 py-4 text-sm"
          style={{
            borderTop: "1px solid var(--roost-border)",
            color: "var(--roost-text-muted)",
            fontWeight: 600,
          }}
        >
          <Loader2 className="size-4 animate-spin" />
          Loading join requests...
        </div>
      ) : incoming.length === 0 ? (
        <div
          className="px-4 py-4 text-sm"
          style={{
            borderTop: "1px solid var(--roost-border)",
            color: "var(--roost-text-muted)",
            fontWeight: 600,
          }}
        >
          When someone enters this household code from Settings, their request
          will show up here for approval.
        </div>
      ) : (
        incoming.map((request, index) => {
          const isUpdating =
            actionMutation.isPending && actionMutation.variables?.id === request.id;

          return (
            <div
              key={request.id}
              className="px-4 py-4"
              style={{
                borderTop: "1px solid var(--roost-border)",
              }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p
                    className="truncate text-sm"
                    style={{
                      color: "var(--roost-text-primary)",
                      fontWeight: 800,
                    }}
                  >
                    {request.requesterName}
                  </p>
                  {request.requesterEmail && (
                    <p
                      className="truncate text-xs"
                      style={{
                        color: "var(--roost-text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {request.requesterEmail}
                    </p>
                  )}
                  <div
                    className="mt-2 flex items-center gap-1.5 text-xs"
                    style={{
                      color: "var(--roost-text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    <Clock3 className="size-3.5" />
                    Requested{" "}
                    {formatDistanceToNow(new Date(request.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      actionMutation.mutate({
                        id: request.id,
                        action: "reject",
                      })
                    }
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm"
                    style={{
                      border: "1.5px solid #EF444430",
                      borderBottom: "3px solid #EF444445",
                      color: "#B91C1C",
                      fontWeight: 700,
                      opacity: isUpdating ? 0.7 : 1,
                    }}
                  >
                    {isUpdating && actionMutation.variables?.action === "reject" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      actionMutation.mutate({
                        id: request.id,
                        action: "approve",
                      })
                    }
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm text-white"
                    style={{
                      backgroundColor: "#22C55E",
                      border: "1.5px solid #22C55E",
                      borderBottom: "3px solid #16A34A",
                      fontWeight: 800,
                      opacity: isUpdating ? 0.7 : 1,
                    }}
                  >
                    {isUpdating && actionMutation.variables?.action === "approve" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Approve
                  </button>
                </div>
              </div>

              {!compact && index === incoming.length - 1 && (
                <p
                  className="mt-3 text-xs"
                  style={{
                    color: "var(--roost-text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Approving adds them as a full member of this household.
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
