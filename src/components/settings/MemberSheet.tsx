"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { UserMinus } from "lucide-react";
import DraggableSheet from "@/components/shared/DraggableSheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
// ---- Types ------------------------------------------------------------------

export interface SheetMember {
  id: string; // household_members.id
  userId: string;
  name: string;
  email: string | null;
  role: string;
  avatarColor: string | null;
  joinedAt: string | null;
  expiresAt?: string | null;
}

interface Permission {
  permission: string;
  enabled: boolean;
}

// ---- Constants --------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = { child: "Child", member: "Member", admin: "Admin", guest: "Guest" };
const ROLE_KEYS = ["child", "member", "admin"] as const; // Guest role is not manually assignable

const PERMISSION_LABELS: { key: string; label: string; childLocked: boolean }[] = [
  { key: "expenses.view", label: "Can view expenses", childLocked: true },
  { key: "expenses.add", label: "Can add expenses", childLocked: true },
  { key: "chores.add", label: "Can add chores", childLocked: false },
  { key: "chores.edit", label: "Can edit and delete chores", childLocked: false },
  { key: "grocery.add", label: "Can add grocery items", childLocked: false },
  { key: "grocery.create_list", label: "Can create grocery lists", childLocked: true },
  { key: "calendar.add", label: "Can add calendar events", childLocked: false },
  { key: "calendar.edit", label: "Can edit and delete events", childLocked: false },
  { key: "tasks.add", label: "Can add tasks", childLocked: false },
  { key: "notes.add", label: "Can add notes", childLocked: false },
  { key: "meals.plan", label: "Can add meals to planner", childLocked: false },
  { key: "meals.suggest", label: "Can suggest meals", childLocked: false },
];

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ---- Component --------------------------------------------------------------

export default function MemberSheet({
  member,
  householdId,
  onClose,
  onRefetch,
}: {
  member: SheetMember | null;
  householdId: string;
  onClose: () => void;
  onRefetch: () => void;
}) {
  const queryClient = useQueryClient();
  const open = member !== null;

  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const permissionsKey = member ? ["member-permissions", member.id] : null;

  const { data: permissionsData } = useQuery<{ permissions: Permission[] }>({
    queryKey: permissionsKey ?? ["member-permissions-none"],
    queryFn: async () => {
      const r = await fetch(`/api/household/members/${member!.id}/permissions`);
      if (!r.ok) throw new Error("Failed to load permissions");
      return r.json();
    },
    enabled: !!member,
    staleTime: 30_000,
  });

  const roleMutation = useMutation({
    mutationFn: async (role: string) => {
      const r = await fetch(`/api/household/members/${member!.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to change role");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      onRefetch();
      toast.success("Role updated");
    },
    onError: (err: Error) =>
      toast.error("Could not update role", { description: err.message }),
  });

  const permissionMutation = useMutation({
    mutationFn: async ({ permission, enabled }: { permission: string; enabled: boolean }) => {
      const r = await fetch(`/api/household/members/${member!.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission, enabled }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update permission");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionsKey ?? [] });
    },
    onError: (err: Error) => {
      toast.error("Could not update permission", { description: err.message });
      queryClient.invalidateQueries({ queryKey: permissionsKey ?? [] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (pin: string) => {
      const r = await fetch(`/api/household/members/${member!.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update PIN");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success("PIN updated");
      setPinSheetOpen(false);
      setNewPin("");
      setConfirmPin("");
    },
    onError: (err: Error) =>
      toast.error("Could not update PIN", { description: err.message }),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/household/members/${member!.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to remove member");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      onRefetch();
      onClose();
      toast.success("Member removed");
    },
    onError: (err: Error) =>
      toast.error("Could not remove member", { description: err.message }),
  });

  if (!member) return null;

  const permissions = permissionsData?.permissions ?? [];
  const permMap = new Map(permissions.map((p) => [p.permission, p.enabled]));
  const isChild = member.role === "child";

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()}>
          <div className="px-4 pb-8" style={{ maxHeight: "calc(92dvh - 60px)" }}>
          <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Member Settings
          </p>
          <div className="space-y-6">
            {/* Member info */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg text-white"
                style={{
                  backgroundColor: member.avatarColor ?? "#6366f1",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid var(--roost-border-bottom)",
                  fontWeight: 800,
                }}
              >
                {initials(member.name)}
              </div>
              <div className="min-w-0">
                <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  {member.name}
                </p>
                {member.email && !isChild && (
                  <p className="truncate text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                    {member.email}
                  </p>
                )}
                {member.joinedAt && (
                  <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                Role
              </p>
              <div className="flex gap-2">
                {ROLE_KEYS.map((role) => {
                  const active = member.role === role;
                  return (
                    <motion.button
                      key={role}
                      type="button"
                      whileTap={{ y: 1 }}
                      onClick={() => {
                        if (active) return;
                        if (role === "child") {
                          setPendingRole(role);
                          setRoleConfirmOpen(true);
                        } else {
                          roleMutation.mutate(role);
                        }
                      }}
                      disabled={roleMutation.isPending}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                      style={{
                        backgroundColor: active ? "#E24B4A" : "var(--roost-surface)",
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: "3px solid var(--roost-border-bottom)",
                        color: active ? "#fff" : "var(--roost-text-secondary)",
                        fontWeight: 700,
                      }}
                    >
                      {ROLE_LABELS[role]}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <div>
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                  Permissions
                </p>
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Fine-tune what this member can do.
                </p>
              </div>
              <div
                className="overflow-hidden rounded-2xl"
                style={{
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "4px solid var(--roost-border-bottom)",
                  backgroundColor: "var(--roost-surface)",
                  // @ts-expect-error CSS custom property
                  "--primary": "#E24B4A",
                }}
              >
                {PERMISSION_LABELS.map((p, i) => {
                  const locked = isChild && p.childLocked;
                  const enabled = permMap.get(p.key) ?? (!isChild || !p.childLocked);
                  return (
                    <div
                      key={p.key}
                      className="flex min-h-12 items-center justify-between gap-3 px-4"
                      style={{ borderTop: i > 0 ? "1px solid var(--roost-border)" : undefined }}
                    >
                      <span
                        className="text-sm"
                        style={{
                          color: locked ? "var(--roost-text-muted)" : "var(--roost-text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {p.label}
                      </span>
                      <Switch
                        checked={enabled}
                        disabled={locked || permissionMutation.isPending}
                        onCheckedChange={(val) => {
                          if (locked) return;
                          permissionMutation.mutate({ permission: p.key, enabled: val });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Child PIN */}
            {isChild && (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                  Child PIN
                </p>
                <div
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "4px solid var(--roost-border-bottom)",
                  }}
                >
                  <div>
                    <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                      This is the PIN {member.name.split(" ")[0]} uses to log in.
                    </p>
                    <div className="mt-1 flex gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: "var(--roost-text-muted)" }}
                        />
                      ))}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => setPinSheetOpen(true)}
                    className="h-9 rounded-xl px-3 text-sm"
                    style={{
                      backgroundColor: "var(--roost-bg)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid var(--roost-border-bottom)",
                      color: "var(--roost-text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    Change PIN
                  </motion.button>
                </div>
              </div>
            )}

            {/* Rewards info */}
            {isChild && (
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "4px solid var(--roost-border-bottom)",
                }}
              >
                <p className="mb-1 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                  Rewards
                </p>
                <p className="text-xs" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  Set up rewards for {member.name.split(" ")[0]} on the Chores page. You can offer money, gifts, or activities based on any completion period.
                </p>
              </div>
            )}

            {/* Remove member */}
            {member.role !== "admin" && (
              <button
                type="button"
                onClick={() => setRemoveConfirmOpen(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
                style={{
                  border: "1.5px solid #EF444430",
                  borderBottom: "3px solid #EF444445",
                  color: "#EF4444",
                  fontWeight: 700,
                }}
              >
                <UserMinus className="size-4" />
                Remove from household
              </button>
            )}
          </div>
          </div>
      </DraggableSheet>

      {/* Role change to child confirm */}
      <AlertDialog open={roleConfirmOpen} onOpenChange={setRoleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Change to child account?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              This will remove their access to expenses, notes, and tasks. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="flex-1 h-11 rounded-xl text-sm"
              style={{
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
              onClick={() => setPendingRole(null)}
            >
              Cancel
            </AlertDialogCancel>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                if (pendingRole) roleMutation.mutate(pendingRole);
                setRoleConfirmOpen(false);
                setPendingRole(null);
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: "var(--roost-text-primary)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid rgba(0,0,0,0.2)",
                fontWeight: 800,
              }}
            >
              Change to child
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove confirm */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Remove {member.name}?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              They will lose access to this household immediately. Their expense history will show as Former Member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="flex-1 h-11 rounded-xl text-sm"
              style={{
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </AlertDialogCancel>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                setRemoveConfirmOpen(false);
                removeMutation.mutate();
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: "#EF4444",
                border: "1.5px solid #C93B3B",
                borderBottom: "3px solid #A63030",
                fontWeight: 800,
              }}
            >
              Remove
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN change sheet */}
      <DraggableSheet open={pinSheetOpen} onOpenChange={(v) => !v && setPinSheetOpen(false)}>
        <div className="px-4 pb-8">
          <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Change PIN
          </p>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Set a new 4-digit PIN for {member.name.split(" ")[0]}.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                New PIN
              </label>
              <input
                type="number"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.slice(0, 4))}
                placeholder="4 digits"
                className="flex h-12 w-full rounded-xl bg-transparent px-4 text-sm focus:outline-none"
                style={{
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid var(--roost-border-bottom)",
                  color: "var(--roost-text-primary)",
                  fontWeight: 600,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                Confirm PIN
              </label>
              <input
                type="number"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.slice(0, 4))}
                placeholder="Same as above"
                className="flex h-12 w-full rounded-xl bg-transparent px-4 text-sm focus:outline-none"
                style={{
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: "3px solid var(--roost-border-bottom)",
                  color: "var(--roost-text-primary)",
                  fontWeight: 600,
                }}
              />
            </div>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              disabled={
                newPin.length !== 4 ||
                confirmPin.length !== 4 ||
                newPin !== confirmPin ||
                pinMutation.isPending
              }
              onClick={() => pinMutation.mutate(newPin)}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
              style={{
                backgroundColor: "var(--roost-text-primary)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid rgba(0,0,0,0.2)",
                fontWeight: 800,
              }}
            >
              Save PIN
            </motion.button>
          </div>
        </div>
      </DraggableSheet>
    </>
  );
}
