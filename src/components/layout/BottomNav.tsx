"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Home,
  MoreHorizontal,
  Settings,
  ShoppingCart,
  User,
  CheckSquare,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",     href: "/dashboard", icon: Home,         activeColor: "#3B82F6" },
  { label: "Chores",   href: "/chores",    icon: CheckSquare,  activeColor: "#EF4444" },
  { label: "Grocery",  href: "/grocery",   icon: ShoppingCart, activeColor: "#F59E0B" },
  { label: "Calendar", href: "/calendar",  icon: Calendar,     activeColor: "#3B82F6" },
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
          backgroundColor: "var(--roost-surface)",
          borderTopColor: "var(--roost-topbar-border)",
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
                  style={{
                    color: isActive
                      ? item.activeColor
                      : "var(--roost-text-muted)",
                  }}
                />
                {item.label === "Chores" && hasIncompleteChores && (
                  <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#EF4444]" />
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isActive
                    ? item.activeColor
                    : "var(--roost-text-muted)",
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
            style={{ color: "var(--roost-text-muted)" }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: "var(--roost-text-muted)" }}
          >
            More
          </span>
        </button>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pb-8 pt-4"
          style={{ backgroundColor: "var(--roost-surface)" }}
        >
          <SheetHeader className="mb-4">
            <SheetTitle style={{ color: "var(--roost-text-primary)" }}>
              More
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={() => setMoreOpen(false)}
              className="flex h-12 items-center gap-3 rounded-xl px-3 transition-colors hover:bg-accent"
            >
              <User
                className="size-5"
                style={{ color: "var(--roost-text-secondary)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--roost-text-primary)" }}
              >
                Profile
              </span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="flex h-12 items-center gap-3 rounded-xl px-3 transition-colors hover:bg-accent"
            >
              <Settings
                className="size-5"
                style={{ color: "var(--roost-text-secondary)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--roost-text-primary)" }}
              >
                Settings
              </span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
