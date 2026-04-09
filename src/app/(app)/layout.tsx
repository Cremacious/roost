import QueryProvider from "@/components/shared/QueryProvider";
import AppShell from "@/components/layout/AppShell";
import { ScrollToTop } from "@/components/providers/ScrollToTop";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ScrollToTop />
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
