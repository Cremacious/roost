import type { Metadata } from "next";
import QueryProvider from "@/components/shared/QueryProvider";
import AppShell from "@/components/layout/AppShell";
import { ScrollToTop } from "@/components/providers/ScrollToTop";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ScrollToTop />
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
