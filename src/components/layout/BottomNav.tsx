"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  Home,
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

interface BottomNavProps {
  hasIncompleteChores?: boolean;
}

export default function BottomNav({ hasIncompleteChores = false }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-border bg-background md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[48px]"
          >
            <div className="relative">
              <Icon
                className="size-5"
                style={{ color: isActive ? item.activeColor : undefined }}
              />
              {item.label === "Chores" && hasIncompleteChores && (
                <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#EF4444]" />
              )}
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? item.activeColor : undefined }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
