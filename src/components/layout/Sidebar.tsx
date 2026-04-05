"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RoostLogo from "@/components/shared/RoostLogo";
import {
  Bell,
  Calendar,
  CheckSquare,
  DollarSign,
  FileText,
  Home,
  Settings,
  ShoppingCart,
  UtensilsCrossed,
  CheckCircle2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/dashboard",  icon: Home,          activeColor: "#3B82F6" },
  { label: "Chores",     href: "/chores",      icon: CheckSquare,   activeColor: "#EF4444" },
  { label: "Grocery",    href: "/grocery",     icon: ShoppingCart,  activeColor: "#F59E0B" },
  { label: "Calendar",   href: "/calendar",    icon: Calendar,      activeColor: "#3B82F6" },
  { label: "Expenses",   href: "/expenses",    icon: DollarSign,    activeColor: "#22C55E" },
  { label: "Tasks",      href: "/tasks",       icon: CheckCircle2,  activeColor: "#EC4899" },
  { label: "Notes",      href: "/notes",       icon: FileText,      activeColor: "#A855F7" },
  { label: "Meals",      href: "/meals",       icon: UtensilsCrossed, activeColor: "#F97316" },
  { label: "Reminders",  href: "/reminders",   icon: Bell,          activeColor: "#06B6D4" },
];

interface SidebarProps {
  userInitials?: string;
  userAvatarColor?: string | null;
  userName?: string;
  userRole?: string;
}

export default function Sidebar({
  userInitials = "?",
  userAvatarColor,
  userName,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 hidden w-55 flex-col border-r py-4 md:flex"
      style={{
        backgroundColor: "var(--roost-surface)",
        borderRightColor: "var(--roost-border)",
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
              className="flex h-10 items-center gap-3 rounded-xl px-3 transition-colors hover:bg-accent"
              style={
                isActive
                  ? { backgroundColor: item.activeColor + "18" }
                  : undefined
              }
            >
              <Icon
                className="size-4 shrink-0"
                style={{
                  color: isActive
                    ? item.activeColor
                    : "var(--roost-text-secondary)",
                }}
              />
              <span
                className="text-sm truncate"
                style={{
                  color: isActive
                    ? item.activeColor
                    : "var(--roost-text-primary)",
                  fontWeight: isActive ? 700 : 600,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom: Settings + user */}
      <div className="px-2 pt-2" style={{ borderTop: "1px solid var(--roost-border)" }}>
        <Link
          href="/settings"
          className="flex h-10 items-center gap-3 rounded-xl px-3 transition-colors hover:bg-accent"
          style={{
            color: "var(--roost-text-secondary)",
            backgroundColor:
              pathname === "/settings" ? "var(--roost-border)" : undefined,
          }}
        >
          <Settings className="size-4 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
          <span
            className="text-sm"
            style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}
          >
            Settings
          </span>
        </Link>

        {/* User */}
        <div className="mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: userAvatarColor ?? "#6366f1" }}
          >
            {userInitials}
          </div>
          {(userName || userRole) && (
            <div className="min-w-0">
              {userName && (
                <p
                  className="truncate text-sm"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
                >
                  {userName}
                </p>
              )}
              {userRole && (
                <p
                  className="truncate text-xs capitalize"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  {userRole}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
