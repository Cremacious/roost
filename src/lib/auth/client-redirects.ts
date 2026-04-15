const PENDING_INVITE_STORAGE_KEY = "pendingInviteToken";

function sanitizeRelativePath(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

export function persistPendingInviteToken(searchParams: URLSearchParams): void {
  const inviteToken = searchParams.get("invite");
  if (!inviteToken || typeof window === "undefined") return;

  window.sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, inviteToken);
}

export function getPendingInviteRedirect(): string | null {
  if (typeof window === "undefined") return null;

  const pendingToken = window.sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY);
  if (!pendingToken) return null;

  return `/invite/${encodeURIComponent(pendingToken)}`;
}

export function consumePendingInviteRedirect(): string | null {
  if (typeof window === "undefined") return null;

  const pendingToken = window.sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY);
  if (!pendingToken) return null;

  window.sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
  return `/invite/${encodeURIComponent(pendingToken)}`;
}

export function getSafeCallbackUrl(searchParams: URLSearchParams): string | null {
  return sanitizeRelativePath(searchParams.get("callbackUrl"));
}

export function getPostAuthRedirect(
  searchParams: URLSearchParams,
  fallback: string,
): string {
  return getPendingInviteRedirect() ?? getSafeCallbackUrl(searchParams) ?? fallback;
}

export function getGoogleAuthRedirects(options: {
  fallback: string;
  newUserFallback: string;
  pathname: string;
  searchParams: URLSearchParams;
}): {
  callbackURL: string;
  errorCallbackURL: string;
  newUserCallbackURL: string;
} {
  const { fallback, newUserFallback, pathname, searchParams } = options;

  const callbackURL = getPostAuthRedirect(searchParams, fallback);
  const newUserCallbackURL = getPendingInviteRedirect() ?? newUserFallback;
  const search = searchParams.toString();

  return {
    callbackURL,
    errorCallbackURL: search ? `${pathname}?${search}` : pathname,
    newUserCallbackURL,
  };
}
