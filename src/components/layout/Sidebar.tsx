"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Home,
  Settings,
  ShoppingCart,
  User,
  CheckSquare,
} from "lucide-react";

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
  { label: "Profile",  href: "/profile",   icon: User,         activeColor: "#8B5CF6" },
];

interface SidebarProps {
  userInitials?: string;
  userAvatarColor?: string | null;
}

export default function Sidebar({ userInitials = "?", userAvatarColor }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 hidden w-18 flex-col items-center border-r py-4 md:flex"
      style={{
        backgroundColor: "var(--roost-surface)",
        borderRightColor: "var(--roost-border)",
      }}
    >
      <div className="flex flex-1 flex-col items-center gap-1 pt-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-accent"
              style={isActive ? { backgroundColor: item.activeColor + "1a" } : undefined}
            >
              <Icon
                className="size-5"
                style={{
                  color: isActive
                    ? item.activeColor
                    : "var(--roost-text-secondary)",
                }}
              />
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Link
          href="/settings"
          title="Settings"
          className="flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-accent"
          style={{ color: "var(--roost-text-muted)" }}
        >
          <Settings className="size-5" />
        </Link>

        {/* User avatar */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: userAvatarColor ?? "#6366f1" }}
        >
          {userInitials}
        </div>
      </div>
    </aside>
  );
}
