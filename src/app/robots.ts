import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: [
        "/admin/",
        "/api/",
        "/activity",
        "/calendar",
        "/child-login",
        "/chores",
        "/dashboard",
        "/expenses",
        "/grocery",
        "/homepage-preview",
        "/invite/",
        "/login",
        "/meals",
        "/notes",
        "/onboarding",
        "/reminders",
        "/settings",
        "/signup",
        "/stats",
        "/tasks",
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
