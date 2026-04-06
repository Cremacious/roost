"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  FileText,
  Home,
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
import { motion } from "framer-motion";

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
  { label: "Profile",   href: "/profile",   icon: User,            color: "#8B5CF6" },
  { label: "Settings",  href: "/settings",  icon: Settings,        color: "#6B7280" },
];

interface BottomNavProps {
  hasIncompleteChores?: boolean;
}

export default function BottomNav({ hasIncompleteChores = false }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

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
        </SheetContent>
      </Sheet>
    </>
  );
}
