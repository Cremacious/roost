"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { useHousehold } from "@/lib/hooks/useHousehold";
import RoostLogo from "@/components/shared/RoostLogo";
import MemberAvatar from "@/components/shared/MemberAvatar";
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
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: sessionData } = useSession();
  const { role } = useHousehold();

  const userName = sessionData?.user?.name ?? "";
  const avatarColor = (sessionData?.user as { avatar_color?: string })?.avatar_color ?? null;
  const userInitials = userName
    .split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "?";

  return (
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

      {/* Bottom: Settings + user info */}
      <div
        className="px-2 pt-3"
        style={{ borderTop: "1.5px solid var(--roost-sidebar-divider)" }}
      >
        <Link
          href="/settings"
          className="flex h-10 items-center gap-3 rounded-xl px-3 transition-colors"
          style={{
            backgroundColor:
              pathname === "/settings"
                ? "var(--roost-sidebar-active-bg)"
                : "transparent",
          }}
        >
          <Settings
            className="size-4 shrink-0"
            style={{
              color: pathname === "/settings"
                ? "var(--roost-sidebar-active-text)"
                : "var(--roost-sidebar-inactive-text)",
            }}
          />
          <span
            className="text-sm"
            style={{
              color: pathname === "/settings"
                ? "var(--roost-sidebar-active-text)"
                : "var(--roost-sidebar-inactive-text)",
              fontWeight: pathname === "/settings" ? 700 : 600,
            }}
          >
            Settings
          </span>
        </Link>

        {/* User info */}
        <div
          className="mt-2 flex items-center gap-2.5 px-3 py-2"
        >
          <MemberAvatar
            name={userName || "?"}
            color={avatarColor}
            size="sm"
          />
          <div className="min-w-0 flex-1">
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
        </div>
      </div>
    </aside>
  );
}
