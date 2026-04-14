const STRIPE_ORIGINS = [
  "https://api.stripe.com",
  "https://js.stripe.com",
  "https://checkout.stripe.com",
  "https://billing.stripe.com",
];

const WEATHER_ORIGINS = ["https://api.open-meteo.com"];

function joinSources(sources: string[]): string {
  return sources.join(" ");
}

export function buildContentSecurityPolicy(isDevelopment: boolean): string {
  const connectSrc = [
    "'self'",
    ...STRIPE_ORIGINS,
    ...WEATHER_ORIGINS,
    ...(isDevelopment ? ["http://localhost:*", "ws://localhost:*"] : []),
  ];

  const directives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action ${joinSources(["'self'", "https://checkout.stripe.com", "https://billing.stripe.com"])}`,
    `script-src ${joinSources(["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : [])])}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src ${joinSources(connectSrc)}`,
    `frame-src ${joinSources(["'self'", "https://js.stripe.com", "https://checkout.stripe.com", "https://billing.stripe.com"])}`,
    `media-src 'self' blob:`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}
