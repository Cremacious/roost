"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/observability/client";

export default function ObservabilityProvider() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const search =
      typeof window !== "undefined" ? window.location.search : "";
    const currentUrl = `${pathname}${search}`;

    if (lastTrackedRef.current === currentUrl) return;
    lastTrackedRef.current = currentUrl;
    trackPageView(pathname, search);
  }, [pathname]);

  return null;
}
