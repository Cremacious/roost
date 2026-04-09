"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  Bell,
  Calendar,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  FileText,
  Home,
  Loader2,
  LogOut,
  MoreHorizontal,
  Settings,
  ShoppingCart,
  UtensilsCrossed,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { signOut } from "@/lib/auth/client";
import { applyTheme } from "@/components/providers/ThemeProvider";
import { DEFAULT_THEME } from "@/lib/constants/themes";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",     href: "/dashboard", icon: Home,        activeColor: "#EF4444" },
  { label: "Chores",   href: "/chores",    icon: CheckSquare, activeColor: "#EF4444" },
  { label: "Grocery",  href: "/grocery",   icon: ShoppingCart, activeColor: "#F59E0B" },
  { label: "Calendar", href: "/calendar",  icon: Calendar,    activeColor: "#3B82F6" },
];

const MORE_ITEMS = [
  { label: "Tasks",     href: "/tasks",     icon: CheckCircle2,    color: "#EC4899" },
  { label: "Notes",     href: "/notes",     icon: FileText,        color: "#A855F7" },
  { label: "Expenses",  href: "/expenses",  icon: DollarSign,      color: "#22C55E" },
  { label: "Meals",     href: "/meals",     icon: UtensilsCrossed, color: "#F97316" },
  { label: "Reminders", href: "/reminders", icon: Bell,            color: "#06B6D4" },
  { label: "Stats",     href: "/stats",     icon: BarChart2,       color: "#6366F1" },
  { label: "Profile",   href: "/profile",   icon: User,            color: "#8B5CF6" },
  { label: "Settings",  href: "/settings",  icon: Settings,        color: "#6B7280" },
];

interface BottomNavProps {
  hasIncompleteChores?: boolean;
}

export default function BottomNav({ hasIncompleteChores = false }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    applyTheme(DEFAULT_THEME);
    await signOut();
    router.push("/login");
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t md:hidden"
        style={{
          backgroundColor: "var(--roost-sidebar-bg)",
          borderTopColor: "var(--roost-sidebar-border)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-12"
            >
              <div className="relative">
                <Icon
                  className="size-5"
                  style={{ color: isActive ? item.activeColor : "var(--roost-sidebar-inactive-text)" }}
                />
                {item.label === "Chores" && hasIncompleteChores && (
                  <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#EF4444]" />
                )}
              </div>
              <span
                className="text-[10px]"
                style={{
                  color: isActive ? item.activeColor : "var(--roost-text-muted)",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More tab */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-12"
        >
          <MoreHorizontal
            className="size-5"
            style={{ color: "var(--roost-sidebar-inactive-text)" }}
          />
          <span
            className="text-[10px]"
            style={{ color: "var(--roost-sidebar-inactive-text)", fontWeight: 600 }}
          >
            More
          </span>
        </button>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pb-8 pt-2"
          style={{ backgroundColor: "var(--roost-surface)" }}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
          <SheetHeader className="mb-3 text-left">
            <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              More
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2">
            {MORE_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.15 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex h-14 items-center gap-3 rounded-xl px-4"
                    style={{
                      backgroundColor: isActive ? item.color + "18" : "var(--roost-bg)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: `3px solid ${isActive ? item.color + "40" : "var(--roost-border-bottom)"}`,
                    }}
                  >
                    <Icon className="size-4 shrink-0" style={{ color: item.color }} />
                    <span
                      className="text-sm"
                      style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
                    >
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Divider + Sign out */}
          <div
            className="mt-4 pt-4"
            style={{ borderTop: "1.5px solid var(--roost-border)" }}
          >
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setConfirmSignOut(true);
              }}
              className="flex h-14 w-full items-center gap-3 rounded-xl px-4"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-muted)",
              }}
            >
              <LogOut className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                Sign out
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
