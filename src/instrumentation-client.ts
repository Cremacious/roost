import {
  reportClientError,
  trackNavigationStart,
} from "@/lib/observability/client";

try {
  window.addEventListener("error", (event) => {
    reportClientError({
      source: "window.error",
      error: event.error instanceof Error ? event.error : undefined,
      message: event.message,
      pathname: window.location.pathname + window.location.search,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason =
      event.reason instanceof Error
        ? event.reason
        : new Error(typeof event.reason === "string" ? event.reason : "Unhandled promise rejection");

    reportClientError({
      source: "window.unhandledrejection",
      error: reason,
      pathname: window.location.pathname + window.location.search,
    });
  });
} catch {
  // Ignore instrumentation setup issues.
}

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse"
) {
  trackNavigationStart(url, navigationType);
}
