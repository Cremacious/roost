import { buildContentSecurityPolicy } from "@/lib/security/csp";
import {
  getAdminAllowedIps,
  hashValue,
  isAdminIpAllowed,
  isSameOriginRequest,
} from "@/lib/security/request";

function createRequestLike(
  url: string,
  headers: Record<string, string> = {}
): Request {
  return {
    headers: new Headers(headers),
    url,
  } as Request;
}

describe("security helpers", () => {
  const originalAdminAllowedIps = process.env.ADMIN_ALLOWED_IPS;

  afterEach(() => {
    if (originalAdminAllowedIps === undefined) {
      delete process.env.ADMIN_ALLOWED_IPS;
    } else {
      process.env.ADMIN_ALLOWED_IPS = originalAdminAllowedIps;
    }
  });

  it("builds a CSP that keeps the required integrations available", () => {
    const csp = buildContentSecurityPolicy(false);

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self' https://api.stripe.com");
    expect(csp).toContain("https://api.open-meteo.com");
    expect(csp).toContain("frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://billing.stripe.com");
  });

  it("allows localhost dev sources in development CSP", () => {
    const csp = buildContentSecurityPolicy(true);

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("http://localhost:*");
    expect(csp).toContain("ws://localhost:*");
  });

  it("treats matching origin requests as trusted", () => {
    const request = createRequestLike("https://roost.test/api/admin/login", {
      origin: "https://roost.test",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects cross-origin requests", () => {
    const request = createRequestLike("https://roost.test/api/admin/login", {
      origin: "https://evil.test",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("respects admin IP allowlists when configured", () => {
    process.env.ADMIN_ALLOWED_IPS = "203.0.113.10, 198.51.100.20";

    expect(getAdminAllowedIps()).toEqual(["203.0.113.10", "198.51.100.20"]);

    const allowedRequest = createRequestLike("https://roost.test/admin", {
      "x-forwarded-for": "203.0.113.10",
    });
    const blockedRequest = createRequestLike("https://roost.test/admin", {
      "x-forwarded-for": "192.0.2.44",
    });

    expect(isAdminIpAllowed(allowedRequest)).toBe(true);
    expect(isAdminIpAllowed(blockedRequest)).toBe(false);
  });

  it("hashes sensitive values before reuse", () => {
    expect(hashValue("203.0.113.10")).toHaveLength(64);
    expect(hashValue("203.0.113.10")).not.toBe("203.0.113.10");
  });
});
