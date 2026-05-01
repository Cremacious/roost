import type { Metadata } from "next";
import { getAppUrl } from "@/lib/env";

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type SeoPage = {
  slug: string;
  path: string;
  title: string;
  description: string;
  heroTitle: string;
  heroDescription: string;
  eyebrow: string;
  keywords: string[];
  intent: string[];
  sections: SeoSection[];
  faqs: SeoFaq[];
  relatedPaths: string[];
  type: "solution" | "guide" | "compare";
  publishedAt?: string;
  updatedAt?: string;
};

export const SITE_NAME = "Roost";
export const SITE_TAGLINE = "Homes run better with Roost.";
export const SITE_DESCRIPTION =
  "Roost is a household management app for families and roommates with chores, shared grocery lists, bill splitting, reminders, meal planning, allowances, and a shared calendar.";
export const DEFAULT_OG_IMAGE = "/opengraph-image";

export const DEFAULT_KEYWORDS = [
  "household management app",
  "roommate app",
  "family organizer app",
  "shared grocery list app",
  "chore app",
  "bill splitting app",
];

export function getCanonicalUrl(path: string): string {
  const normalizedPath =
    path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${getAppUrl()}${normalizedPath}`;
}

export function buildPublicMetadata(page: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
}): Metadata {
  const canonical = getCanonicalUrl(page.path);
  const title = page.title;
  const shareTitle =
    page.title.includes(SITE_NAME) ? page.title : `${page.title} | ${SITE_NAME}`;

  return {
    title,
    description: page.description,
    keywords: [...DEFAULT_KEYWORDS, ...(page.keywords ?? [])],
    alternates: {
      canonical,
    },
    openGraph: {
      type: page.type ?? "website",
      url: canonical,
      title: shareTitle,
      description: page.description,
      siteName: SITE_NAME,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} preview image`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: page.description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function sanitizeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function getOrganizationJsonLd() {
  const appUrl = getAppUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: appUrl,
      logo: `${appUrl}/brand/roost-icon.png`,
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: appUrl,
      description: SITE_DESCRIPTION,
    },
  ];
}

export function getHomepageJsonLd() {
  const appUrl = getAppUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      url: appUrl,
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      audience: [
        {
          "@type": "Audience",
          audienceType: "Families",
        },
        {
          "@type": "Audience",
          audienceType: "Roommates",
        },
      ],
    },
  ];
}

export function getPageJsonLd(page: SeoPage) {
  const canonical = getCanonicalUrl(page.path);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  if (page.type === "solution") {
    return [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        url: canonical,
        description: page.description,
        featureList: page.intent,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      faqSchema,
    ];
  }

  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.heroTitle,
      description: page.description,
      url: canonical,
      datePublished: page.publishedAt ?? page.updatedAt,
      dateModified: page.updatedAt ?? page.publishedAt,
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: getAppUrl(),
      },
      author: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
    faqSchema,
  ];
}
