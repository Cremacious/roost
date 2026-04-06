"use client";

import { usePathname } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import ReminderBanner from "@/components/shared/ReminderBanner";
import dynamic from "next/dynamic";

const DevTools = dynamic(() => import("@/components/dev/DevTools"), { ssr: false });

const HIDE_NAV_ROUTES = ["/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = HIDE_NAV_ROUTES.includes(pathname);

  return (
    <>
      {!hideNav && <Sidebar />}
      {!hideNav && <TopBar />}

      <main
        className={
          hideNav
            ? "flex min-h-screen flex-col"
            : "flex min-h-screen flex-col pt-14 pb-16 md:pb-0 md:pl-55"
        }
      >
        {!hideNav && <ReminderBanner />}
        {children}
      </main>

      {!hideNav && <BottomNav />}
      {process.env.NODE_ENV === "development" && <DevTools />}
    </>
  );
}
