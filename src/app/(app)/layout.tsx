import QueryProvider from "@/components/shared/QueryProvider";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {/* Sidebar — tablet/desktop only */}
      <Sidebar />

      {/* Top bar */}
      <TopBar />

      {/* Main content */}
      <main className="flex min-h-screen flex-col pt-14 pb-16 md:pb-0 md:pl-[72px]">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </QueryProvider>
  );
}
