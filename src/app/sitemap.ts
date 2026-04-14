import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

const PUBLIC_ROUTES = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${appUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
