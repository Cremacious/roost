import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";
import { allSeoPages } from "@/lib/seo-content";

const PUBLIC_ROUTES = [
  { path: "", changeFrequency: "weekly", priority: 1, lastModified: "2026-04-15" },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4, lastModified: undefined },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4, lastModified: undefined },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();

  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${appUrl}${route.path}`,
    lastModified: route.lastModified ? new Date(route.lastModified) : new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const editorialRoutes: MetadataRoute.Sitemap = allSeoPages.map((page) => ({
    url: `${appUrl}${page.path}`,
    lastModified: new Date(page.updatedAt ?? "2026-04-15"),
    changeFrequency:
      page.type === "solution" ? ("weekly" as const) : ("monthly" as const),
    priority: page.type === "solution" ? 0.85 : 0.72,
  }));

  return [...staticRoutes, ...editorialRoutes];
}
