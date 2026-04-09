"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { signOut } from "@/lib/auth/client";
import { useHousehold } from "@/lib/hooks/useHousehold";
import RoostLogo from "@/components/shared/RoostLogo";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { applyTheme } from "@/components/providers/ThemeProvider";
import { DEFAULT_THEME } from "@/lib/constants/themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart2,
  Bell,
  Calendar,
  CheckSquare,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Settings,
  ShoppingCart,
  UtensilsCrossed,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard",  icon: Home          },
  { label: "Chores",    href: "/chores",      icon: CheckSquare   },
  { label: "Grocery",   href: "/grocery",     icon: ShoppingCart  },
  { label: "Calendar",  href: "/calendar",    icon: Calendar      },
  { label: "Expenses",  href: "/expenses",    icon: DollarSign    },
  { label: "Tasks",     href: "/tasks",       icon: CheckCircle2  },
  { label: "Notes",     href: "/notes",       icon: FileText      },
  { label: "Meals",     href: "/meals",       icon: UtensilsCrossed },
  { label: "Reminders", href: "/reminders",   icon: Bell          },
  { label: "Stats",     href: "/stats",       icon: BarChart2     },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionData } = useSession();
  const { role } = useHousehold();

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [hoverSignOut, setHoverSignOut] = useState(false);

  // avatar_color lives in the custom users table, not in better-auth's session.
  // Read it from the same ["user-profile"] query that settings/page.tsx invalidates on save.
  const { data: profileData } = useQuery<{ user: { avatar_color?: string | null } }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const r = await fetch("/api/user/profile");
      if (!r.ok) return { user: {} };
      return r.json();
    },
    staleTime: 60_000,
  });

  const userName = sessionData?.user?.name ?? "";
  const avatarColor = profileData?.user?.avatar_color ?? null;

  async function handleSignOut() {
    setSigningOut(true);
    applyTheme(DEFAULT_THEME);
    await signOut();
    router.push("/login");
  }

  return (
    <>
      <aside
        className="fixed left-0 top-0 bottom-0 z-40 hidden w-55 flex-col py-4 md:flex"
        style={{
          backgroundColor: "var(--roost-sidebar-bg)",
          borderRight: "1.5px solid var(--roost-sidebar-border)",
        }}
      >
        {/* Logo */}
        <div className="px-4 pb-5">
          <RoostLogo size="sm" />
        </div>

        {/* Nav */}
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-xl px-3 transition-colors"
                style={
                  isActive
                    ? { backgroundColor: "var(--roost-sidebar-active-bg)" }
                    : undefined
                }
              >
                <Icon
                  className="size-4 shrink-0"
                  style={{
                    color: isActive
                      ? "var(--roost-sidebar-active-text)"
                      : "var(--roost-sidebar-inactive-text)",
                  }}
                />
                <span
                  className="text-sm truncate"
                  style={{
                    color: isActive
                      ? "var(--roost-sidebar-active-text)"
                      : "var(--roost-sidebar-inactive-text)",
                    fontWeight: isActive ? 700 : 600,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bottom: user block + sign out */}
        <div
          className="px-2 pt-3"
          style={{ borderTop: "1.5px solid var(--roost-sidebar-divider)" }}
        >
          {/* Clickable user block — navigates to Settings */}
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex w-full items-center gap-2.5 transition-colors"
            style={{
              padding: "10px 8px",
              borderRadius: 14,
              background: pathname === "/settings" ? "var(--roost-sidebar-active-bg)" : "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (pathname !== "/settings") {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--roost-bg)";
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/settings") {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }
            }}
          >
            <MemberAvatar
              name={userName || "?"}
              avatarColor={avatarColor}
              size="sm"
            />
            <div className="min-w-0 flex-1 text-left">
              {userName && (
                <p
                  className="truncate text-[13px]"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
                >
                  {userName}
                </p>
              )}
              {role && (
                <p
                  className="truncate text-[11px] capitalize"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  {role}
                </p>
              )}
            </div>
            <Settings
              style={{
                width: 15,
                height: 15,
                flexShrink: 0,
                color: pathname === "/settings"
                  ? "var(--roost-sidebar-active-text)"
                  : "var(--roost-sidebar-inactive-text)",
              }}
            />
          </button>

          {/* Sign out button */}
          <button
            type="button"
            data-testid="sign-out-btn"
            onClick={() => setConfirmSignOut(true)}
            onMouseEnter={() => setHoverSignOut(true)}
            onMouseLeave={() => setHoverSignOut(false)}
            className="mt-1 flex w-full items-center gap-2 rounded-[10px] px-2.5"
            style={{
              height: 34,
              background: hoverSignOut ? "rgba(239,68,68,0.08)" : "transparent",
              color: hoverSignOut ? "#EF4444" : "var(--roost-text-muted)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              border: "none",
            }}
          >
            <LogOut
              style={{
                width: 13,
                height: 13,
                flexShrink: 0,
                color: hoverSignOut ? "#EF4444" : "var(--roost-text-muted)",
              }}
            />
            Sign out
          </button>
        </div>
      </aside>

      {/* Sign out confirmation dialog */}
      <Dialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <DialogContent style={{ backgroundColor: "var(--roost-surface)" }}>
          <DialogHeader>
            <DialogTitle
              style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
            >
              Sign out?
            </DialogTitle>
          </DialogHeader>
          <p
            className="text-sm"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            You will need to sign back in to access your household.
          </p>
          <DialogFooter className="mt-2 flex gap-2">
            <motion.button
              type="button"
              onClick={() => setConfirmSignOut(false)}
              whileTap={{ y: 1 }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-secondary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              whileTap={{ y: 1 }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
              style={{
                backgroundColor: "#EF4444",
                border: "1.5px solid #EF4444",
                borderBottom: "3px solid #C93B3B",
                fontWeight: 800,
              }}
            >
              {signingOut ? <Loader2 className="size-4 animate-spin" /> : "Sign out"}
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
