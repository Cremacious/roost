import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent this app from being embedded in iframes on other origins (clickjacking protection).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent browsers from MIME-sniffing a response away from the declared content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send origin + path when navigating same-origin; send only origin for cross-origin requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera and geolocation are used by the app (receipt scanning, weather). Microphone is not.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  // Note: Strict-Transport-Security (HSTS) is set automatically by Vercel for production
  // deployments on custom domains. No need to duplicate it here.
  // Note: Content-Security-Policy is intentionally omitted from this pass. The app uses
  // Next.js inline scripts, Stripe Checkout redirects, Recharts, and Tiptap — all of which
  // require careful policy crafting and end-to-end testing before adding CSP.
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
