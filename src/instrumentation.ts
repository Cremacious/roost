import type { Instrumentation } from "next";
import { reportRequestError } from "@/lib/observability/server";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const normalizedError =
    error instanceof Error
      ? Object.assign(error, {
          digest:
            typeof (error as { digest?: unknown }).digest === "string"
              ? (error as { digest?: string }).digest
              : undefined,
        })
      : new Error(typeof error === "string" ? error : "Unknown request error");

  await reportRequestError({
    error: normalizedError,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
